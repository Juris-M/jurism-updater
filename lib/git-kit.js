var Promise = require('bluebird')
var spawn = require('child-process-promise').spawn;
var debug = require('debug')('jurism-updater:server@git-kit');

var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));


var REPOS = ["translators", "jm-styles", "csl-styles"];

var git = {};

function setSpawnPromiser(repoName) {
    return function (optlist) {
        return spawn("/usr/bin/git", optlist, {
            cwd: pth.dir[repoName],
            capture: [
                'stdout',
                'stderr'
            ]
        })
            .then((result) => {
                return result.stdout.toString().trim()
            })
    }
}
for (var repoName of REPOS) {
    git[repoName] = setSpawnPromiser(repoName);
}

module.exports = git;
