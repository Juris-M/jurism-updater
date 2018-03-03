var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@admin');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var bug_kit = require(pth.fp.bug_kit)
var trans_kit = require(pth.fp.trans_kit)
var utils = require(pth.fp.utils);
var conn = require(pth.fp.connection);

/* GET admin page. */
router.get('/', function(req, res, next) {
  res.render('admin', { title: 'Juris-M Translator Database Administration' });
});

/* GET regenerate database op. */
router.get('/generate', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function() {
            trans_kit.removeRepoHash();
            return trans_kit.recreateTable(res)
                .then(() => trans_kit.reportRepoTime(res))
                .then((repoDate) => res.send(JSON.stringify(repoDate)))
                .catch(
                    utils.handleError.bind(me)
                )
        }
    });
});

/* GET report repo date and time op. */
router.get('/inspect', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function(){
            return trans_kit.reportRepoTime(res)
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
                return bug_kit.getBug(res, req.query.id)
                    .catch(
                        utils.handleError.bind(me)
                    )
            } else {
                return bug_kit.bugList(res)
                    .catch(
                        utils.handleError.bind(me)
                    );
            }
        }
    })
});

module.exports = router;
