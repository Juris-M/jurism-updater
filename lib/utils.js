'use strict'

var fs = require('fs');
var path = require('path');
var xmlToJS = require('libxml-to-js');
var xml = require('xml');
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

function composeRepoDate(data) {
    var dateStr = data.split('\n')[0];
    var repoDate = getUtcDateTime(dateStr);
    return repoDate;
}

function getRand() {
    var num = "" + rand();
    while (num.length < 5) {
        num = "0" + num;
    }
    return num;
}

module.exports = {
    getUtcDateTime: getUtcDateTime,
    composeRepoDate: composeRepoDate,
    getRand: getRand,
    handleError: handleError
}
