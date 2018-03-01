'use strict'

var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var GitProcess = require('dugite').GitProcess
var debug = require('debug')('jurism-updater:server');
var utils = require('../tools/utils.js');

var repoPath = path.join(__dirname, '..', 'translators')

var options = {};

var git = Promise.coroutine(function* (optlist) {
    var res = yield GitProcess.exec(optlist, repoPath, options)
    if (res.exitCode == 0) {
        return Promise.resolve(res.stdout.trim());
    } else {
        return Promise.reject(res.stderr);
    }
})

var gitFailInTheEnd = function(err){
    debug(err);
    return Promise.resolve(true);
}

function getHeadDate() {
    return git([ 'show', '--pretty=format:%aI', '--abbrev-commit', 'HEAD'])
        .then(function(data){
            return utils.composeRepoDate(data);
        })
}


function getRepoDate(fn, cb) {
    //debug("getRepoDate()");
    return git([ 'rev-list', '-1', 'HEAD', fn ])
        .then(function(data){
            var hash = data;
            return git([ 'show', '--pretty=format:%aI', '--abbrev-commit', hash]);
        })
        .then(function(data){
            var dateStr = data.split('\n')[0];
            var repoDate = utils.getUtcDateTime(dateStr);
            return cb(fn, repoDate);
        })
}
    
function iterateTranslators(res, begin_cb, each_cb, end_cb) {
    debug("iterateTranslators()");
    return git(['pull', 'origin', 'master'])
        .then(function() {
            var filenames = [];
            for (var fn of fs.readdirSync(repoPath)) {
                if (fn.slice(-3) !== '.js') continue;
                filenames.push(fn);
            }
            if (begin_cb) begin_cb();
            return Promise.each(filenames, function(fn) {
                return getRepoDate(fn, each_cb);
            })
                })
        .then(function(){
                  return end_cb(res);
        })
        .catch(gitFailInTheEnd);
}

function doRepoHash(){
    return git([ 'rev-list', '--max-count=1', 'HEAD' ])
        .then(function(data){
            var hash = data;
            fs.writeFileSync(utils.hashPath, hash);
            return Promise.resolve(true);
        }).catch(function(error){
            console.log(error);
        });
}

function getChanges(hash) {
    return git([ 'diff', '--name-status', hash, 'HEAD', '--']);
}


function reportRepoTime(res) {
    debug("reportRepoTime()");
    var sql = utils.sqlLastUpdatedMaxStatement();
    utils.connection.query(sql, function(error, results, fields) {
        utils.sqlFail(error);
        var repotime = (parseInt(results[0].repotime, 10) * 1000);
        var repoDate = utils.getUtcDateTime(repotime);
        res.send(JSON.stringify(repoDate));
        doRepoHash()
            .catch(function(err){
                debug(err);
            })
    });
}

module.exports = {
    iterateTranslators: iterateTranslators,
    doRepoHash: doRepoHash,
    getHeadDate: getHeadDate,
    getChanges: getChanges,
    reportRepoTime: reportRepoTime
}
