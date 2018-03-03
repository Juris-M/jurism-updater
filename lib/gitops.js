'use strict'

var fs = require('fs');
var Promise = require('bluebird');
var GitProcess = require('dugite').GitProcess
var debug = require('debug')('jurism-updater:server:gitops');
var path = require('path');

var pth = require(path.join(__dirname, 'paths.js'));

var utils = require(pth.dir.lib + 'utils.js');
var conn = require(pth.dir.lib + 'connection.js');

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

module.exports = {
    iterateTranslators: iterateTranslators,
    doRepoHash: doRepoHash,
    getHeadDate: getHeadDate,
    getChanges: getChanges,
    reportRepoTime: reportRepoTime
}
