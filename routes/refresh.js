var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@refresh');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var gitops = require(pth.fp.gitops);

function refreshTranslators(res) {
    // Get date of latest commit
    return gitops.getHeadDate()
        .then((repoDate) => {
            // Identify items that have changed since last repo build or refresh, as marked by REPO_HASH.txt
            var hash = utils.readRepoHash().toString().trim();
            utils.removeRepoHash();
            return gitops.getChanges(hash)
        })
        .then(function(data){
            // For each item, add it, update it, or remove it.
            var result = data.split('\n');
            var promises = [];
            for (var line of result) {
                if (line.slice(-3) !== '.js') continue
                var info = line.split('\t');
                if (info[0] === 'M') {
                    debug("M")
                    promises.push(utils.updateFile(info[1], repoDate));
                } else if (info[0] === 'A') {
                    debug("A")
                    promises.push(utils.addFile(info[1], repoDate));
                } else if (info[0] === 'D') {
                    debug("D")
                    promises.push(utils.removeFile(info[1]));
                }
            }
            if (promises.length == 0) {
                return Promise.resolve(true);
            } else {
                return Promise.all(promises);
            }
        })
}

router.get('/', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function() {
            // Proceed only if REPO_HASH.txt exists
            if (utils.hasRepoHash()) {
                console.log("ok1");
                return refreshTranslators(res)
                    .then(() => gitops.reportRepoTime(res))
                    .then((repoDate) => res.send(JSON.stringify(repoDate)))
                    .catch(
                        utils.handleError.bind(me)
                    )
            } else {
                console.log("ok2");
                res.send({
                    error: "REPO_HASH does not exist. Regenerate DB."
                })
            }
        }
    });
});

module.exports = router;

