'use strict'

var fs = require('fs');
var path = require('path');
var xmlToJS = require('libxml-to-js');
var xml = require('xml');
var lnfix = require('crlf-normalize');
var debug = require('debug')('jurism-updater:server@utils');
var rand = require('unique-random')(1, 65000);

var pth = require(path.join(__dirname, 'paths.js'));

var conn = require(pth.fp.connection);

function handleError(err) {
    debug("ERROR: " + err);
    this.res.send({
        error: "" + err
    })
}

function getBug(res, id){
    debug("getBug()")
    var sql = "SELECT * from bugs WHERE id=?";
    return conn.then((conn) => conn.query(sql, [id]))
        .then((results) => {
            var jsdate = (parseInt(results[0][0].date, 10)*1000);
            var repoDate = getUtcDateTime(jsdate);
            var ret = {
                id: results[0][0].id,
                date: repoDate.human,
                txt: results[0][0].txt.toString()
            }
            res.send(ret);
        })
}

function returnBugList(res) {
    var twoWeeksAgo = Math.round(new Date().getTime()/1000);
    twoWeeksAgo = twoWeeksAgo - 1209600;
    var sql = "DELETE FROM bugs WHERE date<?"
    return conn.then((conn) => conn.query(sql, [twoWeeksAgo]))
        .then((results) => {
            return conn.then((conn) => {
                var sql = "SELECT id,date FROM bugs;";
                return conn.query(sql)
            })
        })
        .then((results) => {
            var retlst = [];
            for (var obj of results[0]) {
                var jsdate = ((parseInt(obj.date, 10) + 32400)*1000);
                var repoDate = getUtcDateTime(jsdate);
                retlst.push([repoDate.human, obj.id])
            }
            res.send(retlst);
        });
}

function createBugTable (res) {
    debug("createBugTable()");
    var sql = "CREATE TABLE bugs (id CHAR(64) PRIMARY KEY, date INT, txt MEDIUMBLOB)";
    return conn.then((conn) => conn.query(sql))
}

function bugList(res) {
    debug("bugList()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name = 'bugs' LIMIT 1;"
    return conn.then((conn) => conn.query(sql))
        .then((results) => {
            if (results[0].length) {
                returnBugList(res);
            } else {
                createBugTable(res)
                    .then(() => returnBugList(res))
            }
        });
}

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

function pad(d, fun, addMe) {
    var num = d[fun]();
    if (addMe) {
        num += addMe;
    }
    num = "" + num;
    while (num.length < 2) {
        num = "0" + num;
    }
    return num;
}

function getUtcDateTime(dval) {
    var ret = "";
    if (typeof dval === "string") {
        dval = dval.trim();
        if ( dval.match(/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9]:[0-9]:[0-9]$/)) {
            dval = dval.replace(" ", "T") + "Z";
        } else if (dval.match(/^[0-9]+$/)) {
            dval = parseInt(dval);
        }
    }
    var d = new Date(dval);
    var year = "" + d.getUTCFullYear();
    var month = pad(d, "getUTCMonth", 1);
    var day = pad(d, "getUTCDate");
    var hours = pad(d, "getUTCHours");
    var minutes = pad(d, "getUTCMinutes");
    var seconds = pad(d, "getUTCSeconds");
    var date = [year, month, day].join("-");
    var time = [hours, minutes, seconds].join(":");
    return {
        human: date + " " + time,
        machine: Math.round(d.getTime()/1000)
    }
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

function composeRepoDate(data) {
    var dateStr = data.split('\n')[0];
    var repoDate = getUtcDateTime(dateStr);
    return repoDate;
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

function readRepoHash() {
    return fs.readFileSync(pth.fp.commit);
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

function getRand() {
    var num = "" + rand();
    while (num.length < 5) {
        num = "0" + num;
    }
    return num;
}

module.exports = {
    getInfoAndTranslator: getInfoAndTranslator,
    squashFields: squashFields,
    sqlTranslatorInsertParams: sqlTranslatorInsertParams,
    sqlTranslatorInsertStatement: sqlTranslatorInsertStatement,
    sqlTranslatorCreateStatement: sqlTranslatorCreateStatement,
    makeXml: makeXml,
    getUtcDateTime: getUtcDateTime,
    addFile: addFile,
    removeFile: removeFile,
    updateFile: updateFile,
    removeRepoHash: removeRepoHash,
    hasRepoHash: hasRepoHash,
    readRepoHash: readRepoHash,
    composeRepoDate: composeRepoDate,
    bugList: bugList,
    getBug: getBug,
    getRand: getRand,
    handleError: handleError
}
