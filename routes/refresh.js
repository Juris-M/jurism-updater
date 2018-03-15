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
        'text/plain': function() {
            return repo_kit.refreshRepo("jm-styles")
                .then(() => repo_kit.refreshRepo("csl-styles"))
                .then(() => repo_kit.refreshRepo("translators"))
                .then(() => repo_kit.reportRepoTime())
                .then((repoDate) => res.send(JSON.stringify(repoDate)))
                .catch(
                    utils.handleError.bind(me)
                );
        }
    });
});

module.exports = router;

