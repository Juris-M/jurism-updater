var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var Promise = require('bluebird');
var GitProcess = require('dugite').GitProcess

var repoPath = path.join(__dirname, '..', 'translators')

var options = {};

var git = Promise.coroutine(function* (optlist) {
    var res = yield GitProcess.exec(optlist, repoPath, options)
    if (res.exitCode == 0) {
        return Promise.resolve(res);
    } else {
        return Promise.reject(res);
    }
})

var gitFail = undefined;

var gitFailInTheEnd = function(err){
    console.log(err.stderr);
    return Promise.resolve(true);
}


function getRepoDate(fn, cb) {
    return git([ 'rev-list', '-1', 'HEAD', fn ])
        .then(function(ret){
                  var hash = ret.stdout.trim();
            return git([ 'show', '--pretty=format:%aI', '--abbrev-commit', hash]);
        },gitFail)
        .then(function(ret){
                  var dateStr = ret.stdout.split('\n')[0];
                  var repoDate = utils.getUtcDateTime(dateStr);
                  return cb(fn, repoDate);
        },gitFail)
}
    
function iterateTranslators(res, cb, done) {
    return git(['pull', 'origin', 'master'])
        .then(function(ret){
                  return true;
        },gitFail)
        .then(function(ret) {
            var filenames = [];
            for (var fn of fs.readdirSync(repoPath)) {
                if (fn.slice(-3) !== '.js') continue;
                filenames.push(fn);
            }
            return Promise.each(filenames, function(fn) {
                return getRepoDate(fn, cb);
            })
                },gitFail)
        .then(function(){
                  return done(res);
        },gitFail)
        .catch(gitFailInTheEnd);
}

/*
function demoFun(fn, repoDate) {
    console.log(repoDate.human + "/" + repoDate.machine + " " + fn);
}

iterateTranslators(demoFun);
*/

module.exports = {
    iterateTranslators: iterateTranslators
}
