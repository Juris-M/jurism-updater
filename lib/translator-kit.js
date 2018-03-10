var fs = require('fs');
var Promise = require('bluebird');
var xml = require('xml');
var debug = require('debug')('jurism-updater:server@translator-kit');
var path = require('path');

var pth = require(path.join(__dirname, 'paths.js'));

var utils = require(pth.fp.utils);
var query = require(pth.fp.connection);
var git = require(pth.fp.git_kit).translators;
var repo_kit = require(pth.fp.repo_kit);
var sql_kit = require(pth.fp.sql_kit);


/*
 * From Zotero source
 */
/*
var TRANSLATOR_REQUIRED_PROPERTIES = ["translatorID", "translatorType", "label", "creator",
                                      "target", "priority", "lastUpdated"];
// Properties that are preserved if present
var TRANSLATOR_OPTIONAL_PROPERTIES = ["targetAll", "browserSupport", "minVersion", "maxVersion",
                                      "inRepository", "configOptions", "displayOptions",
                                      "hiddenPrefs", "itemType"];
// Properties that are passed from background to inject page in connector
var TRANSLATOR_PASSING_PROPERTIES = TRANSLATOR_REQUIRED_PROPERTIES.
                                    concat(["targetAll", "browserSupport", "code", "runMode", "itemType", "inRepository"]);
*/


function getRepoDate(fn) {
    //debug("getRepoDate()");
    return git([ 'rev-list', '-1', 'HEAD', fn ])
        .then((hash) => git([ 'show', '--pretty=format:%aI', '--abbrev-commit', hash, '--']))
        .then((data) => {
            var dateStr = data.trim().split('\n')[0];
            var repoDate = utils.getUtcDateTime(dateStr);
            return repoDate;
        })
}
    
function translatorXmlJS (obj) {
    var ret = {
        translator: []
    };
    var attr = {}
    for (var info of sql_kit.translatorFields) {
        if (info.jsonSkip) continue;
        if (!obj[info.name]) continue;
        if (info.name === 'lastUpdated') {
            var lastUpdated = Math.round(parseInt(obj[info.name], 10)*1000)
            obj[info.name] = utils.getUtcDateTime(lastUpdated).human;
        }
        //if (info.name === 'code') {
        //    obj[info.name] = 'code goes here';
        //}
        var addIn = {};
        if (info.xmlType === 'attribute') {
            attr[info.xmlName] = obj[info.name];
        } else if (info.xmlType === 'element') {
            addIn[info.xmlName] = obj[info.name]
            ret.translator.push(addIn)
        } else {
            addIn[info.xmlName] = obj[info.name];
            ret.translator.push(addIn)
        }
    }
    ret.translator = [{
        "_attr": attr
    }].concat(ret.translator);
    return ret;
}

function xmlXmlJS(result) {
    var currentTime = Math.round(new Date().getTime()/1000);
    var outerXmlObj = {
        xml: [
            {
                currentTime: currentTime
            },
            {
                pdftools: [
                    {
                        '_attr': {
                            version: "3.04"
                        }
                    }
                ]
            }
        ]
    }
    for (var res of result) {
        var info = {};
        for (var key in res) {
            if (undefined === res[key] || null === res[key]) continue;
            info[key] = res[key].toString()
        }
        outerXmlObj.xml.push(translatorXmlJS(info));
    }
    return outerXmlObj;
}

function makeXml(result) {
    return xml(xmlXmlJS(result));
}

function dropTable () {
    debug("dropTable()");
    var sql = "DROP TABLE translators;"
    return query(sql)
}

function createTable() {
    debug("createTable()");
    var sql = sql_kit.sqlTranslatorCreateStatement;
    return query(sql)
}

function recreateTable() {
    debug("recreateTable()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name = 'translators' LIMIT 1;"
    return query(sql)
        .then((results) => {
            if (results[0].length) {
                return dropTable()
                    .then(() => createTable())
                    .then(() => populateTable())
            } else {
                return createTable(res)
                    .then(() => populateTable())
            }
        });
}

function populateTable() {
    debug("populateTable()");
    return git(['pull', 'origin', 'master'])
        .then(() => {
            var filenames = [];
            for (var fn of fs.readdirSync(pth.dir.translators)) {
                if (fn.slice(-3) !== '.js') continue;
                filenames.push(fn);
            }
            return Promise.each(filenames, function(fn) {
                return getRepoDate(fn)
                    .then((repoDate) => repo_kit.addFile("translators", fn, repoDate))
            });
        })
}

function reportRepoTime() {
    debug("reportRepoTime()");
    var sql = "SELECT MAX(lastUpdated) AS repotime FROM translators";
    return query(sql)
        .then((results) => {
            var repotime = (parseInt(results[0][0].repotime, 10) * 1000);
            var repoDate = utils.getUtcDateTime(repotime);
            return repoDate
        })
        .then((repoDate) => doRepoHash(repoDate))
}

function doRepoHash(repoDate){
    debug("doRepoHash()");
    return git([ 'rev-list', '--max-count=1', 'HEAD' ])
        .then((hash) => repo_kit.assureCommitHashTable(hash))
        .then((hash) => repo_kit.writeCommitHash("translators", hash))
        .then(() => {
            return repoDate;
        })
}

module.exports = {
    populateTable: populateTable,
    dropTable: dropTable,
    createTable: createTable,
    recreateTable: recreateTable,
    makeXml: makeXml,
    reportRepoTime: reportRepoTime,
    doRepoHash: doRepoHash
}
