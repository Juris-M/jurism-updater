var Promise = require('bluebird')
var GitProcess = require('dugite').GitProcess
var debug = require('debug')('jurism-updater:server@git-kit');

var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));


var REPOS = ["translators", "jm-styles", "csl-styles"];

var git = {};

function setCoroutine(repoName) {
    return Promise.coroutine(function* (optlist) {
        var res = yield GitProcess.exec(optlist, pth.dir[repoName], {})
        if (res.exitCode == 0) {
            return Promise.resolve(res.stdout.trim());
        } else {
            return Promise.reject(res.stderr);
        }
    })
}
                  
for (var repoName of REPOS) {
    git[repoName] = setCoroutine(repoName);
}

module.exports = git;
