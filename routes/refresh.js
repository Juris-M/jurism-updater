var express = require('express');
var router = express.Router();

var debug = require('debug')('jurism-updater:server');
var utils = require('../tools/utils.js');
var gitops = require('../tools/gitops.js');

function refreshTranslators(res) {
    // Proceed only if REPO_HASH.txt exists
    if (utils.hasRepoHash()) {
        // Get date of latest commit
        gitops.getHeadDate().then(function(repoDate) {
            // Identify items that have changed since last repo build or refresh, as marked by REPO_HASH.txt
            var hash = utils.readRepoHash().toString().trim();
            utils.removeRepoHash();
            gitops.getChanges(hash)
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
                .then(function() {
                    return gitops.reportRepoTime(res)
                })
        });
    } else {
        // If REPO_HASH.txt is not available, something went wrong and we can't refresh.
        // Show unknown values to signal the need to rebuild.
        res.send(JSON.stringify({machine: "??????????", human: "????-??-?? ??-??-??"}))
    }
}

router.get('/', function(req, res, next) {
    res.format({
        'text/plain': function() {
            refreshTranslators(res);
        }
    });
});

module.exports = router;

