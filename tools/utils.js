var fs = require('fs');
var path = require('path');
var xmlToJS = require('libxml-to-js');
var xml = require('xml');
var lnfix = require('crlf-normalize');
var xml = require('xml');

var jmDir = path.join(__dirname, '..', 'jurism');
var transDir = path.join(__dirname, '..', 'translators');
var transFile = function(fn) {
    return path.join(transDir, fn);
}

function getInfoAndTranslator(fn) {
    var ret = {
        info: null,
        translator: null
    }
    var txt = fs.readFileSync(transFile(fn)).toString().trim();
    txt = lnfix.crlf(txt, lnfix.LF);
    txt = txt.split('\n');
    for (var i=0, ilen=txt.length; i<ilen; i++) {
        line = txt[i];
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
            /*
            if (key === "lastUpdated") {
                console.log("before: "+info[key]);
                var dateStr = getUtcDateTime(info[key]).machine;
                console.log("after: "+dateStr);
                info[key] = Date.parse(dateStr);
            }
            */
        }
    }
    return info;
}

var translatorFields = [
    {
        name: "translatorID",
        spec: "CHAR(64) PRIMARY KEY",
        xmlName: "translatorID",
        xmlType: 'attribute'
        
    },
    {
        name: "translatorFilename",
        spec: " VARCHAR(1024) CHARACTER SET utf8mb4",
        jsonSkip: true
    },
    {
        name: "creator",
        spec: "VARCHAR(1024) CHARACTER SET utf8mb4",
        xmlName: "creator",
        xmlType: "element"
    },
    {
        name: "label",
        spec: "VARCHAR(1024) CHARACTER SET utf8mb4",
        xmlName: 'label',
        xmlType: 'element'
    },
    {
        name: "target",
        spec: " VARCHAR(4096)",
        xmlName: 'target',
        xmlType: 'element'
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
        name: "priority",
        spec:  "INT",
        xmlName: 'priority',
        xmlType: 'element'
    },
    {
        name: "inRepository",
        spec: "TINYINT",
        force: true,
        jsonSkip: true
    },
    {
        name: "translatorType",
        spec: " TINYINT NOT NULL",
        xmlName: 'type',
        xmlType: 'attribute'
    },
    {
        name: "browserSupport",
        spec: "VARCHAR(64)",
        xmlName: 'browserSupport',
        xmlType: 'attribute'
    },
    {
        name: "lastUpdated",
        spec: "INT",
        xmlName: 'lastUpdated',
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
    }
]

function sqlTranslatorCreateStatement() {
    var sql = "CREATE TABLE translators ("
    var lst = [];
    for (var info of translatorFields) {
        lst.push(info.name + " " + info.spec);
    }
    sql += lst.join(",") + ");";
    return sql;
}

function sqlTranslatorInsertStatement() {
    var lst = [];
    var sql = "INSERT INTO translators VALUES ("
    for (var info of translatorFields) {
        lst.push('?');
    }
    sql += lst.join(',');
    sql += ');';
    return sql;
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

function sqlLastUpdatedMaxStatement() {
    return "SELECT MAX(lastUpdated) AS repotime FROM translators;"
}

function sqlTranslatorsAfterDate() {
    return "SELECT * FROM translators WHERE lastUpdated<?;"
}

function translatorXmlJS (obj) {
    var ret = {
        translator: []
    };
    var attr = {}
    for (var info of translatorFields) {
        if (info.type === 'skip') continue;
        if (!obj[info.name]) continue;
        var addIn = {};
        if (info.type === 'attribute') {
            attr[info.key] = obj[key];
        } else if (info.type === 'element') {
            addIn[info.key] = obj[key]
            ret.translator.push(addIn)
        } else {
            addIn[info.key] = JSON.stringify(obj[key]);
            ret.translator.push(addIn)
        }
    }
    ret.translator.push({
        _attr: attr
    })
    return ret;
}

function xmlXmlJS(result) {
    var outerXmlObj = {
        xml: [
            {
                currentTime: XXX
            },
            {
                pdftools: [
                    {
                        '_attr': {
                            version: "3.0.4"
                        }
                    }
                ]
            }
        ]
    }
    for (var info of result) {
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
    if (dval === typeof "string") {
        dval = dval.trim();
        if ( dval.match(/^[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9]:[0-9]:[0-9]$/)) {
            dval = dval.replace(" ", "T") + "Z";
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

module.exports = {
    getInfoAndTranslator: getInfoAndTranslator,
    squashFields: squashFields,
    sqlTranslatorInsertParams: sqlTranslatorInsertParams,
    sqlTranslatorCreateStatement: sqlTranslatorCreateStatement,
    sqlTranslatorInsertStatement: sqlTranslatorInsertStatement,
    sqlLastUpdatedMaxStatement: sqlLastUpdatedMaxStatement,
    sqlTranslatorsAfterDate: sqlTranslatorsAfterDate,
    makeXml: makeXml,
    getUtcDateTime: getUtcDateTime
}
