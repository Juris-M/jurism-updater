var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@admin');
var fs = require('fs');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var bug_kit = require(pth.fp.bug_kit)
var repo_kit = require(pth.fp.repo_kit)
var utils = require(pth.fp.utils);

var basicAuth = require('express-basic-auth')
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
        'text/plain': function() {
            // Kick off the build process
            // Starts the rebuild promise chain on the server,
            // and reports back the number of translators to be
            // added to the database
            return repo_kit.recreateTable("translators")
                .then((goalObj) => res.send(JSON.stringify(goalObj)))
        }
    });
});

router.get('/pollserver', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function() {
            var goal = req.query.goal;
            repo_kit.checkTable("translators", goal)
                .then((doneAndDate) => {
                    res.send(JSON.stringify(doneAndDate))
                })
        }
    });
});

/* GET report repo date and time op. */
router.get('/inspect', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function(){
            return repo_kit.reportRepoTime()
                .then((repoDate) => res.send(JSON.stringify(repoDate)))
                .catch(
                    utils.handleError.bind(me)
                )
        }
    })
});

/* GET report repo date and time op. */
router.get('/bugs', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function(){
            if (req.query.id) {
                return bug_kit.getBug(req.query.id)
                    .then((ret) => res.send(ret))
                    .catch(
                        utils.handleError.bind(me)
                    )
            } else {
                return bug_kit.bugList()
                    .then((ret) => res.send(ret))
                    .catch(
                        utils.handleError.bind(me)
                    );
            }
        }
    })
});

module.exports = router;
