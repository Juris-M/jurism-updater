var fs = require('fs');
var path = require('path');
var xmlToJS = require('libxml-to-js');
var xml = require('xml');
var lnfix = require('crlf-normalize');

var jmDir = path.join(__dirname, '..', 'jurism');
var transDir = path.join(__dirname, '..', 'translators');
var transFile = function(fn) {
    return path.join(transDir, fn);
}

var keyMap = {
    translatorID: {
        key: 'id',
        type: 'attribute'
    },
    label: {
        key: 'label',
        type: 'element'
    },
    creator: {
        key: 'creator',
        type: 'element'
    },
    target: {
        key: 'target',
        type: 'element'
    },
    minVersion: {
        key: 'minVersion',
        type: 'attribute'
    },
    maxVersion: {
        key: 'maxVersion',
        type: 'skip'
    },
    priority: {
        key: 'priority',
        type: 'element'
    },
    inRepository: {
        key: 'inRepository',
        type: 'skip'
    },
    translatorType: {
        key: 'type',
        type: 'attribute'
    },
    browserSupport: {
        key: 'browserSupport',
        type: 'attribute'
    },
    lastUpdated: {
        key: 'lastUpdated',
        type: 'attribute'
    },
    configOptions: {
        key: 'configOptions',
        type: 'elementObject'
    },
    displayOptions: {
        key: 'displayOptions',
        type: 'elementObject'
    }
}

function makeXmlJS (obj) {
    var ret = {
        translator: []
    };
    var attr = {}
    for (var key in obj) {
        var info = keyMap[key];
        if (info.type === 'skip') continue;
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

var xmlFile = 'translator-download.xml';
var xmlStr = fs.readFileSync(xmlFile);

console.log("\nXML STRUCTURE");
var master = {};
xmlToJS(xmlStr, '//translator', function (error, result) {
  if (error) {
    console.error(error);
  } else {
      for (var key in result) {
          Object.assign(master, result[key]);
      }
  }
});
master.code = "[translator code]";
console.log(JSON.stringify(master, null, 2))

console.log("\nFILE JSON");
var master = {};
for (fn of fs.readdirSync(transDir)) {
    if (fn.slice(-3) !== '.js') continue
    //console.log(fn);
    var txt = fs.readFileSync(transFile(fn)).toString().trim();
    txt = lnfix.crlf(txt, lnfix.LF);
    txt = txt.split('\n');
    var buf = "";
    for (var line of txt) {
        if (line.trim() === "" || line.slice(0, 1) === "/") break;
        buf += line;
    }
    var obj = JSON.parse(buf);
    Object.assign(master, obj);
}
console.log(JSON.stringify(master, null, 2))

console.log("\nFILE JSON XML SOURCE JS")
console.log(JSON.stringify(makeXmlJS(master), null, 2))

console.log("\nGENERATED XML STRING");
console.log(xml(makeXmlJS(master)));

console.log("\nGENERATED XML STRING RECONVERTED");
var master = {};
xmlToJS(xmlStr, '//translator', function (error, result) {
  if (error) {
    console.error(error);
  } else {
      for (var key in result) {
          Object.assign(master, result[key]);
      }
  }
});
master.code = "[translator code]";
console.log(JSON.stringify(master, null, 2))
