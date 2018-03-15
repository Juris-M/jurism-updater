var fs = require('fs');
var xml = require('xml');
var debug = require('debug')('jurism-updater:server@translator-kit');
var path = require('path');

var pth = require(path.join(__dirname, 'paths.js'));

var utils = require(pth.fp.utils);
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

module.exports = {
    makeXml: makeXml
}
