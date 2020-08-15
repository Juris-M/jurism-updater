var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@refresh');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var repo_kit = require(pth.fp.repo_kit);
var trans_kit = require(pth.fp.trans_kit);

router.get('/', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': async function() {
            try {
                await repo_kit.refreshRepo("jm-styles");
                await repo_kit.refreshRepo("csl-styles");
                await repo_kit.refreshRepo("translators");
                var repoDate = await repo_kit.reportRepoTime();
                res.send(JSON.stringify(repoDate));
            } catch (e) {
                utils.handleError.call(me, e);
            }
        }
    });
});

module.exports = router;

