var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@admin');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var gitops = require(pth.fp.gitops);
var conn = require(pth.fp.connection);

/* GET admin page. */
router.get('/', function(req, res, next) {
  res.render('admin', { title: 'Juris-M Translator Database Administration' });
});

function dropTable (res) {
    debug("dropTable()");
    var sql = "DROP TABLE translators;"
    return conn.then((conn) => conn.query(sql))
}

function createTable(res) {
    debug("createTable()");
    var sql = utils.sqlTranslatorCreateStatement;
    return conn.then((conn) => conn.query(sql))
}

function recreateTable(res) {
    debug("recreateTable()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name = 'translators' LIMIT 1;"
    return conn.then((conn) => conn.query(sql))
        .then((results) => {
            if (results[0].length) {
                return dropTable(res)
                    .then(() => createTable(res))
                    .then(() => populateTable(res))
            } else {
                return createTable(res)
                    .then(() => populateTable(res))
            }
        });
}

function populateTable(res) {
    debug("populateTable()");
    return gitops.iterateTranslators(res, null, utils.addFile)
}

/* GET regenerate database op. */
router.get('/generate', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function() {
            utils.removeRepoHash();
            return recreateTable(res)
                .then(() => gitops.reportRepoTime(res))
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
            return gitops.reportRepoTime(res)
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
                console.log("do getBug with "+req.query.id);
                return utils.getBug(res, req.query.id)
                    .catch(
                        utils.handleError.bind(me)
                    )
            } else {
                return utils.bugList(res)
                    .catch(
                        utils.handleError.bind(me)
                    );
            }
        }
    })
});

module.exports = router;
