var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@refresh');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var trans_kit = require(pth.fp.trans_kit);

router.get('/', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function() {
            // Proceed only if REPO_HASH.txt exists
            if (trans_kit.hasRepoHash()) {
                return trans_kit.refreshTranslators(res)
                    .then(() => trans_kit.reportRepoTime(res))
                    .then((repoDate) => res.send(JSON.stringify(repoDate)))
                    .catch(
                        utils.handleError.bind(me)
                    )
            } else {
                res.send({
                    error: "REPO_HASH does not exist. Regenerate DB."
                })
            }
        }
    });
});

module.exports = router;

