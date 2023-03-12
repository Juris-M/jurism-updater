var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@refresh');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var repo_kit = require(pth.fp.repo_kit);
var trans_kit = require(pth.fp.trans_kit);

router.get('/', function(req, res) {
    res.format({
        'text/plain': async function() {
            try {
                var targets = req.query.targets.split(",");
                for (var target of targets) {
                    await repo_kit.pullChanges(target);
                    await repo_kit.refreshRepo(target);
                    var repoDate = await repo_kit.reportRepoTime();
                }
                res.send(JSON.stringify(repoDate));
            } catch (e) {
                utils.handleError(res, e);
            }
        }
    });
});

module.exports = router;

