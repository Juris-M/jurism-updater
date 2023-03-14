var spawn = require('child-process-promise').spawn;
var debug = require('debug')('jurism-updater:server@git-kit');

var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));

function gitter(repoName, optlist) {
    return new Promise((resolve, reject) => {
        var proc = spawn("/usr/bin/git", optlist, {
            cwd: pth.dir[repoName](),
            capture: [
                'stdout',
                'stderr'
            ],
            encoding: "utf8"
        }).then((result) => {
            return resolve(result.stdout.toString().trim());
        }).catch((e) => {
            return reject(e);
        });
    });
};

module.exports = gitter;
