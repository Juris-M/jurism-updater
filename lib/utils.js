'use strict'

var fs = require('fs');
var path = require('path');
var debug = require('debug')('jurism-updater:server@utils');
var rand = require('unique-random')(1, 65000);

var flat_keys = [
    "translatorID",
    "translatorType",
    "label",
    "creator",
    "target",
    "priority",
    "lastUpdated",
    "minVersion",
    "targetAll",
    "maxVersion",
    "inRepository",
    "browserSupport",
];

var json_keys = [
    "displayOptions",
    "configOptions"
];

function handleError(err) {
    if (err.stderr) {
        err = err.stderr.toString();
    } else {
        err = err.toString();
    }
    debug("ERROR: " + err);
    this.res.send({error:err.toString()})
}

function composeMetadataBlock(result, prettify) {
    var ret = {};
    // Reserve the last ordinary key for the end.
    // The JSON keys will confuse the simple parser
    // in the client if they come at the end.
    for (var key of flat_keys.slice(0, -1)) {
        ret[key] = result[key] ? result[key] : "";
    }
    if (ret.lastUpdated || ret.lastUpdated === 0) {
        ret.lastUpdated = getUtcDateTime(ret.lastUpdated * 1000).human;
    }
    for (var key of json_keys) {
        if (result[key]) {
            ret[key] = JSON.parse(result[key]);
        }
    }
    for (var key in ret) {
        if (ret[key] === null) {
            delete result[key];
        }
    }
    for (var key of flat_keys.slice(-1)) {
        ret[key] = result[key] ? result[key] : "";
    }
    if (prettify) {
        return JSON.stringify(ret, null, 2);
    } else {
        return ret;
    }
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

function getRand() {
    var num = "" + rand();
    while (num.length < 5) {
        num = "0" + num;
    }
    return num;
}


module.exports = {
    composeMetadataBlock: composeMetadataBlock,
    getUtcDateTime: getUtcDateTime,
    getRand: getRand,
    handleError: handleError
}
