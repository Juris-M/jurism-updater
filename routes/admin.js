var express = require('express');
var router = express.Router();

var debug = require('debug')('jurism-updater:server');
var mysql = require('mysql')
var utils = require('../tools/utils.js');
var gitops = require('../tools/gitops.js');

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'bennett',
    password: 'Lnosiatl',
    database: 'translators',
    charset: 'utf8mb4'
})

connection.connect(function(err) {
  if (err) throw err
  debug('You are now connected...')
})

/* GET admin page. */
router.get('/', function(req, res, next) {
  res.render('admin', { title: 'Juris-M Translator Database Administration' });
});

function sqlFail(error) {
    if (error) {
        console.log("OOPS: "+error);
    }
}


function dropTable (res) {
    debug("dropTable()");
    var sql = "DROP TABLE translators;"
    connection.query(sql, function(error, results, fields){
        sqlFail(error);
        createTable(res);
    })
}

function createTable(res) {
    debug("createTable()");
    var sql = utils.sqlTranslatorCreateStatement();
    connection.query(sql, function(error, results, fields){
        sqlFail(error);
        populateTable(res);
    })
}

function recreateTable(res) {
    debug("recreateTable()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'translators' AND table_name = 'translators' LIMIT 1;"
    connection.query(sql, function (error, results, fields){
        sqlFail(error);
        if (results[0]) {
            dropTable(res);
        } else {
            createTable(res);
        }
    })
}

function processFile(fn, repoDate) {
    debug("processFile()");
    var info = utils.getInfoAndTranslator(fn).info;
    var sql = utils.sqlTranslatorInsertStatement();
    info.lastUpdated = repoDate.machine;
    var params = utils.sqlTranslatorInsertParams(info);
    connection.query(sql, params, function (error, results, fields){
        sqlFail(error);
    })
}

function populateTable(res) {
    debug("populateTable()");
    gitops.iterateTranslators(res, processFile, reportRepoTime);
}

function reportRepoTime(res) {
    debug("reportRepoTime()");
    var sql = utils.sqlLastUpdatedMaxStatement();
    connection.query(sql, function(error, results, fields) {
        sqlFail(error);
        var repotime = (parseInt(results[0].repotime, 10) * 1000);
        var repoDate = utils.getUtcDateTime(repotime);
        res.send(JSON.stringify(repoDate));
    });
}

/* GET regenerate database op. */
router.get('/generate', function(req, res, next) {
    res.format({
        'text/plain': function() {
            recreateTable(res);
        }
    });
});

/* GET report repo date and time op. */
router.get('/inspect', function(req, res, next) {
    res.format({
        'text/plain': function(){
            reportRepoTime(res);
        }
    })
});

module.exports = router;
