var fs = require('fs');
var xml = require('xml');
var debug = require('debug')('jurism-updater:server@translator-kit');
var path = require('path');

var pth = require(path.join(__dirname, 'paths.js'));
var query = require(pth.fp.connection).query;

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
    var attr = {};
    for (var info of sql_kit.translators.fields) {
        if (info.jsonSkip) continue;
        if (!obj[info.name]) continue;
        if (info.name === 'lastUpdated') {
            var lastUpdated = Math.round(parseInt(obj[info.name], 10)*1000);
            obj[info.name] = utils.getUtcDateTime(lastUpdated).human;
        }
        //if (info.name === 'code') {
        //    obj[info.name] = 'code goes here';
        //}
        var addIn = {};
        if (info.xmlType === 'attribute') {
            attr[info.xmlName] = obj[info.name];
        } else if (info.xmlType === 'element') {
            addIn[info.xmlName] = obj[info.name];
            ret.translator.push(addIn);
        } else {
            addIn[info.xmlName] = obj[info.name];
            ret.translator.push(addIn);
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

async function makeXml(dateSecs, styles) {
    var sql = "SELECT * FROM translators WHERE lastUpdated>?;";
    var result = await query(sql, [dateSecs]);
    
    var xmlAsJSON = xmlXmlJS(result);
    // Styles get inserted HERE
    for (var style of styles) {
        var sql = `SELECT filename,styleType,lastUpdated FROM styles WHERE lastUpdated>? AND styleID=?`;
        var params = [style.updated, style.id];
        var result = await query(sql, params);
        if (result.length > 0) {
            var addIn = {
                style: [
                    {
                        '_attr': {
                            id: style.id
                        }
                    }
                ]
            };
            var styleType = result[0].styleType;
            var filename = result[0].filename;
            var lastUpdated = result[0].lastUpdated;
            //console.log(`*** ${result[0].filename} ${utils.getUtcDateTime(parseInt(style.updated)*1000).human} vs ${utils.getUtcDateTime(parseInt(lastUpdated)*1000).human} ***`);
            var txt = fs.readFileSync(pth.dir[styleType](filename)).toString();
            var myLastUpdated = utils.getUtcDateTime(parseInt(lastUpdated)*1000).human;
            txt = txt.replace(/<updated>.*<\/updated>/, `<updated>${myLastUpdated}</updated>`);
            addIn.style.push(txt);
            xmlAsJSON.xml.push(addIn);
        }
    }
    var ret = xml(xmlAsJSON);
    return ret;
}

module.exports = {
    makeXml: makeXml
}
