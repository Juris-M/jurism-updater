var Promise = require('bluebird')
//var GitProcess = require('dugite').GitProcess
var child_process = require('child_process');
var debug = require('debug')('jurism-updater:server@git-kit');

var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));


var REPOS = ["translators", "jm-styles", "csl-styles"];

var git = {};

function setCoroutine(repoName) {
    return Promise.coroutine(function* (optlist) {
        try {
            var res = child_process.execFileSync("/usr/bin/git", optlist, {
                cwd: pth.dir[repoName]
            })
            res = res.toString().trim();
        } catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve(res);
    })
}
                  
for (var repoName of REPOS) {
    git[repoName] = setCoroutine(repoName);
}

module.exports = git;
