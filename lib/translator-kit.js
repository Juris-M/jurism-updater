var fs = require('fs');
var lnfix = require('crlf-normalize');
var Promise = require('bluebird');
var GitProcess = require('dugite').GitProcess
var debug = require('debug')('jurism-updater:server@translator-kit');
var path = require('path');

var pth = require(path.join(__dirname, 'paths.js'));

var utils = require(pth.dir.lib + 'utils.js');
var conn = require(pth.dir.lib + 'connection.js');

var translatorFields = [
    {
        name: "translatorID",
        spec: "CHAR(64) PRIMARY KEY",
        xmlName: "id",
        xmlType: 'attribute'
        
    },
    {
        name: "translatorType",
        spec: " TINYINT NOT NULL",
        xmlName: 'type',
        xmlType: 'attribute'
    },
    {
        name: "label",
        spec: "VARCHAR(1024) CHARACTER SET utf8mb4",
        xmlName: 'label',
        xmlType: 'element'
    },
    {
        name: "creator",
        spec: "VARCHAR(1024) CHARACTER SET utf8mb4",
        xmlName: "creator",
        xmlType: "element"
    },
    {
        name: "target",
        spec: " VARCHAR(4096)",
        xmlName: 'target',
        xmlType: 'element'
    },
    {
        name: "priority",
        spec:  "INT",
        xmlName: 'priority',
        xmlType: 'element'
    },
    {
        name: "lastUpdated",
        spec: "INT",
        xmlName: 'lastUpdated',
        xmlType: 'attribute'
    },
    {
        name: "minVersion",
        spec: "VARCHAR(64)",
        xmlName: 'minVersion',
        xmlType: 'attribute'
    },
    {
        name: "maxVersion",
        spec: "VARCHAR(64)",
        jsonSkip: true
    },
    {
        name: "inRepository",
        spec: "TINYINT",
        force: true,
        jsonSkip: true
    },
    {
        name: "browserSupport",
        spec: "VARCHAR(64)",
        xmlName: 'browserSupport',
        xmlType: 'attribute'
    },
    {
        name: "displayOptions",
        spec: "VARCHAR(1024)",
        xmlName: 'displayOptions',
        xmlType: 'elementObject'
    },
    {
        name: "configOptions",
        spec: "VARCHAR(1024)",
        xmlName: 'configOptions',
        xmlType: 'elementObject'
    },
    {
        name: "code",
        spec: "MEDIUMBLOB",
        xmlName: 'code',
        xmlType: 'element'
    },
    {
        name: "translatorFilename",
        spec: "VARCHAR(1024)",
        jsonSkip: true
    }
]

var sqlTranslatorCreateStatement = function() {
    var sql = "CREATE TABLE translators ("
    var lst = [];
    for (var info of translatorFields) {
        lst.push(info.name + " " + info.spec);
    }
    sql += lst.join(",") + ");";
    return sql;
}();

var sqlTranslatorInsertStatement = function() {
    var lst = [];
    var sql = "INSERT INTO translators VALUES ("
    for (var info of translatorFields) {
        lst.push('?');
    }
    sql += lst.join(',');
    sql += ');';
    return sql;
}();

function getInfoAndTranslator(fn) {
    var ret = {
        info: null,
        translator: null
    }
    var txt = fs.readFileSync(pth.dir.translators + fn).toString().trim();
    txt = lnfix.crlf(txt, lnfix.LF);
    txt = txt.split('\n');
    for (var i=0, ilen=txt.length; i<ilen; i++) {
        var line = txt[i];
        if (line.trim() === "" || line.slice(0, 1) === "/") {
            ret.info = JSON.parse(txt.slice(0, i).join('\n'));
            ret.translator = txt.slice(i).join('\n');
            break;
        }
    }
    ret.info.translatorFilename = fn;
    return ret;
}

function squashFields(info) {
    for (var key in info) {
        if (info[key]) {
            if (["displayOptions", "configOptions"].indexOf(key) > -1) {
                info[key] = JSON.stringify(info[key]);
            }
        }
    }
    return info;
}


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


var git = Promise.coroutine(function* (optlist) {
    var res = yield GitProcess.exec(optlist, pth.dir.translators, {})
    if (res.exitCode == 0) {
        return Promise.resolve(res.stdout.trim());
    } else {
        return Promise.reject(res.stderr);
    }
})

function getHeadDate() {
    return git([ 'show', '--pretty=format:%aI', '--abbrev-commit', 'HEAD'])
        .then((data) => utils.composeRepoDate(data))
}

function getRepoDate(fn, cb) {
    //debug("getRepoDate()");
    return git([ 'rev-list', '-1', 'HEAD', fn ])
        .then((data) => {
            var hash = data;
            return git([ 'show', '--pretty=format:%aI', '--abbrev-commit', hash]);
        })
        .then((data) => {
            var dateStr = data.split('\n')[0];
            var repoDate = utils.getUtcDateTime(dateStr);
            return cb(fn, repoDate);
        })
}
    
function iterateTranslators(res, begin_cb, each_cb) {
    debug("iterateTranslators()");
    return git(['pull', 'origin', 'master'])
        .then(() => {
            var filenames = [];
            for (var fn of fs.readdirSync(pth.dir.translators)) {
                if (fn.slice(-3) !== '.js') continue;
                filenames.push(fn);
            }
            if (begin_cb) begin_cb();
            return Promise.each(filenames, function(fn) {
                return getRepoDate(fn, each_cb);
            });
        })
}

function getChanges(hash) {
    return git([ 'diff', '--name-status', hash, 'HEAD', '--']);
}


function reportRepoTime(res) {
    debug("reportRepoTime()");
    var sql = "SELECT MAX(lastUpdated) AS repotime FROM translators;"
    return conn.then((conn) => conn.query(sql))
        .then((results) => {
            var repotime = (parseInt(results[0][0].repotime, 10) * 1000);
            var repoDate = utils.getUtcDateTime(repotime);
            return repoDate
        })
        .then((repoDate) => doRepoHash(repoDate))
}

function doRepoHash(repoDate){
    return git([ 'rev-list', '--max-count=1', 'HEAD' ])
        .then((data) => {
            var hash = data;
            fs.writeFileSync(pth.fp.commit, hash);
            return repoDate
        })
}

function sqlTranslatorInsertParams(info) {
    info = squashFields(info);
    var ret = [];
    for (var fieldInfo of translatorFields) {
        if (fieldInfo.force) {
            ret.push(fieldInfo.force);
        } else {
            ret.push(info[fieldInfo.name] ? info[fieldInfo.name] : null);
        }
    }
    return ret;
}

function translatorXmlJS (obj) {
    var ret = {
        translator: []
    };
    var attr = {}
    for (var info of translatorFields) {
        if (info.jsonSkip) continue;
        if (!obj[info.name]) continue;
        if (info.name === 'lastUpdated') {
            var lastUpdated = Math.round(parseInt(obj[info.name], 10)*1000)
            obj[info.name] = getUtcDateTime(lastUpdated).human;
        }
        if (info.name === 'maxVersion') {
            console.log('maxVersion: ' + obj[info.name])
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
            addIn[info.xmlName] = JSON.stringify(obj[info.name]);
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

function addFile(fn, repoDate) {
    var data = getInfoAndTranslator(fn);
    var info = data.info;
    info.code = data.translator;
    info.lastUpdated = repoDate.machine;
    var params = sqlTranslatorInsertParams(info);
    var sql = sqlTranslatorInsertStatement;
    return conn.then((conn) => conn.query(sql, params))
}

function removeFile(fn) {
    var sql = "DELETE from translators WHERE translatorFilename=?";
    var params = [fn];
    return conn.then((conn) => conn.query(sql, params))
}

function updateFile(fn, repoDate) {
    var sql = "UPDATE translators SET lastUpdated=? WHERE translatorFilename=?";
    var params = [repoDate.machine, fn];
    return conn.then((conn) => conn.query(sql, params))
}

function dropTable (res) {
    debug("dropTable()");
    var sql = "DROP TABLE translators;"
    return conn.then((conn) => conn.query(sql))
}

function createTable(res) {
    debug("createTable()");
    var sql = sqlTranslatorCreateStatement;
    return conn.then((conn) => conn.query(sql))
}

function recreateTable(res) {
    debug("recreateTable()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name = 'translators' LIMIT 1;"
    return conn.then((conn) => conn.query(sql))
        .then((results) => {
            if (results[0].length) {
                return dropTable(res)
                    .then(() => createTable(res))
                    .then(() => populateTable(res))
            } else {
                return createTable(res)
                    .then(() => populateTable(res))
            }
        });
}

function populateTable(res) {
    debug("populateTable()");
    return iterateTranslators(res, null, addFile)
}

function readRepoHash() {
    return fs.readFileSync(pth.fp.commit).toString().trim();
}

function removeRepoHash() {
    if (fs.existsSync(pth.fp.commit)) {
        fs.unlinkSync(pth.fp.commit);
    }
}

function hasRepoHash() {
    if (fs.existsSync(pth.fp.commit)) {
        return true;
    } else {
        return false;
    }
}

function refreshTranslators(res) {
    // Get date of latest commit
    return getHeadDate()
        .then((repoDate) => {
            // Identify items that have changed since last repo build or refresh, as marked by REPO_HASH.txt
            var hash = readRepoHash();
            removeRepoHash();
            return getChanges(hash)
        })
        .then(function(data){
            // For each item, add it, update it, or remove it.
            var result = data.split('\n');
            var promises = [];
            for (var line of result) {
                if (line.slice(-3) !== '.js') continue
                var info = line.split('\t');
                if (info[0] === 'M') {
                    debug("M")
                    promises.push(updateFile(info[1], repoDate));
                } else if (info[0] === 'A') {
                    debug("A")
                    promises.push(addFile(info[1], repoDate));
                } else if (info[0] === 'D') {
                    debug("D")
                    promises.push(removeFile(info[1]));
                }
            }
            if (promises.length == 0) {
                return Promise.resolve(true);
            } else {
                return Promise.all(promises);
            }
        })
}

module.exports = {
    readRepoHash: readRepoHash,
    removeRepoHash: removeRepoHash,
    hasRepoHash: hasRepoHash,
    populateTable: populateTable,
    dropTable: dropTable,
    createTable: createTable,
    recreateTable: recreateTable,
    sqlTranslatorInsertParams: sqlTranslatorInsertParams,
    sqlTranslatorInsertStatement: sqlTranslatorInsertStatement,
    getInfoAndTranslator: getInfoAndTranslator,
    squashFields: squashFields,
    makeXml: makeXml,
    addFile: addFile,
    removeFile: removeFile,
    updateFile: updateFile,
    iterateTranslators: iterateTranslators,
    doRepoHash: doRepoHash,
    getHeadDate: getHeadDate,
    getChanges: getChanges,
    reportRepoTime: reportRepoTime,
    refreshTranslators: refreshTranslators
}
