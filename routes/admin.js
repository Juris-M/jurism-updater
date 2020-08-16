var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@admin');
var fs = require('fs');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var bug_kit = require(pth.fp.bug_kit);
var repo_kit = require(pth.fp.repo_kit);
var utils = require(pth.fp.utils);

var basicAuth = require('express-basic-auth');
var config = JSON.parse(fs.readFileSync(pth.fp.config));
var useBasicAuth = basicAuth({
    users: {
        admin: config.admin_password
    },
    challenge: true,
    realm: "Iejah3co"
})

/* GET admin page. */
router.get('/', useBasicAuth, function(req, res, next) {
    // POLL server for incomplete generate, show progres. Otherwise show
    // menu.
    res.render('admin', { title: 'Juris-M Translator Database Administration', subFolder: "" });
});

/* GET regenerate database op. */
// Latency is a big problem with this. Rebuilding the database can
// take two to five minutes.
// Connection timeouts are buried deep in the tools, and apparently in
// multiple layers. Ninety seconds to two minutes is about the best we
// can get.
// So we need to kick off the process, and then poll the server
// re progress until it's complete.
router.get('/generate', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': async function() {
            generateInProgress = true;
            // Kick off the build process
            // Starts the rebuild promise chain on the server,
            // and reports back the number of translators to be
            // added to the database
            try {
                var targets = req.query.targets.split(",");
                var goalObj = await repo_kit.recreateTables(targets);
                return res.send(JSON.stringify(goalObj));
            } catch (e) {
                return utils.handleError.call(me, e);
            }
        }
    });
});

router.get('/pollserver', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': async function() {
            // This is used only for a complete database regenerate.
            // It needs some fixing, though, here or elsewhere, because there
            // are now THREE database tables to rebuild, not one. So what
            // is "goal" value?
            try {
                var goal = req.query.goal;
                var obj = {
                    goal: req.query.goal,
                    targets: req.query.targets.split(","),
                    count: parseInt(req.query.count)
                };
                var doneAndDate = await repo_kit.checkTables(obj);
                console.log(`checkTables: had ${JSON.stringify(obj)}, received ${JSON.stringify(doneAndDate)}`);
                return res.send(JSON.stringify(doneAndDate));
            } catch (e) {
                return utils.handleError.call(me, e);
            }
        }
    });
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
                return utils.handleError.call(me, e);
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
                return utils.handleError.call(me, e);
            }
        }
    });
});

module.exports = router;
