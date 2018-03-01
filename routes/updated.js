var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');

var debug = require('debug')('jurism-updater:server');
var mysql = require('mysql')
var utils = require('../tools/utils.js');

var connection = utils.connection;

/* From Zotero -- POST body structure to request style updates */
/*
for (let id in styles) {
    let styleUpdated = Zotero.Date.sqlToDate(styles[id].updated);
    styleUpdated = styleUpdated ? styleUpdated.getTime() / 1000 : 0;
    var selfLink = styles[id].url;
    var data = {
        id: id,
        updated: styleUpdated
    };
    if (selfLink) {
        data.url = selfLink;
    }
    styleTimestamps.push(data);
}
var body = 'styles=' + encodeURIComponent(JSON.stringify(styleTimestamps));
*/

/* POST fetch files after a given date */
router.post('/', bodyParser.urlencoded('*/*'), function(req, res, next) {
    res.format({
        'application/xml': function() {
            if (undefined === req.query.last) {
                var sql = "SELECT * FROM translators;"
                connection.query(sql, [dateSecs], function(error, results, fields){
                    utils.sqlFail(error);
                    res.send(utils.makeXml(results));
                })
            } else {
                var dateSecs = parseInt(req.query.last, 10);
                var sql = "SELECT * FROM translators WHERE lastUpdated>?;"
                connection.query(sql, [dateSecs], function(error, results, fields){
                    utils.sqlFail(error);
                    res.send(utils.makeXml(results));
                })
            } 
        }
    });
});

module.exports = router;
