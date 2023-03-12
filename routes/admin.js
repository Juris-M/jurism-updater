var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@admin');
var fs = require('fs');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var bug_kit = require(pth.fp.bug_kit);
var repo_kit = require(pth.fp.repo_kit);
var utils = require(pth.fp.utils);
var sql_kit = require(pth.fp.sql_kit);

var basicAuth = require('express-basic-auth');
var config = JSON.parse(fs.readFileSync(pth.fp.config));
var useBasicAuth = basicAuth({
    users: {
        admin: config.admin_password
    },
    challenge: true,
    realm: "access"
})

/* GET admin page. */
router.get('/', useBasicAuth, async function(req, res, next) {
    // POLL server for incomplete generate, show progres. Otherwise show
    // menu.
    await sql_kit.assureAllTables(pth);
    res.render('admin', { title: 'Juris-M Translator Database Administration', subFolder: "" });
});

/* GET report repo date and time op. */
router.get('/inspect', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': async function(){
            try {
                var repoDate = await repo_kit.reportRepoTime();
                return res.send(JSON.stringify(repoDate));
            } catch (e) {
                return utils.handleError(res, e);
            }
        }
    });
});

/* GET report repo date and time op. */
router.get('/bugs', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': async function(){
            var ret;
            try {
                if (req.query.id) {
                    ret = await bug_kit.getBug(req.query.id);
                    return res.send(ret);
                } else {
                    ret = await bug_kit.bugList();
                    return res.send(ret);
                }
            } catch (e) {
                return utils.handleError(res, e);
            }
        }
    });
});

module.exports = router;
