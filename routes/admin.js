var express = require('express');
var router = express.Router();

var debug = require('debug')('jurism-updater:server');
var utils = require('../tools/utils.js');
var gitops = require('../tools/gitops.js');

/* GET admin page. */
router.get('/', function(req, res, next) {
  res.render('admin', { title: 'Juris-M Translator Database Administration' });
});

function dropTable (res) {
    debug("dropTable()");
    var sql = "DROP TABLE translators;"
    utils.connection.query(sql, function(error, results, fields){
        utils.sqlFail(error);
        createTable(res);
    })
}

function createTable(res) {
    debug("createTable()");
    var sql = utils.sqlTranslatorCreateStatement();
    utils.connection.query(sql, function(error, results, fields){
        utils.sqlFail(error);
        populateTable(res);
    })
}

function recreateTable(res) {
    debug("recreateTable()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name = 'translators' LIMIT 1;"
    utils.connection.query(sql, function (error, results, fields){
        utils.sqlFail(error);
        if (results[0]) {
            dropTable(res);
        } else {
            createTable(res);
        }
    })
}

function populateTable(res) {
    debug("populateTable()");
    gitops.iterateTranslators(res, null, utils.addFile, gitops.reportRepoTime);
}

/* GET regenerate database op. */
router.get('/generate', function(req, res, next) {
    res.format({
        'text/plain': function() {
            utils.removeRepoHash();
            recreateTable(res);
        }
    });
});

/* GET report repo date and time op. */
router.get('/inspect', function(req, res, next) {
    res.format({
        'text/plain': function(){
            gitops.reportRepoTime(res);
        }
    })
});

/* GET report repo date and time op. */
router.get('/bugs', function(req, res, next) {
    res.format({
        'text/plain': function(){
            if (req.query.id) {
                console.log("do getBug with "+req.query.id);
                utils.getBug(res, req.query.id);
            } else {
                utils.bugList(res);
            }
        }
    })
});

module.exports = router;
