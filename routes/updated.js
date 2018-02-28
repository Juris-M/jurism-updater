var express = require('express');
var router = express.Router();

var debug = require('debug')('jurism-updater:server');
var mysql = require('mysql')
var utils = require('../tools/utils.js');

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
/* GET fetch translators after a given date */
router.get('/', function(req, res, next) {
    res.format({
        'text/xml': function() {
            console.log("GO1")
            if (undefined !== req.query.last) {
                console.log("GO2")
                var dateSecs = parseInt(req.query.last, 10);
                var sql = utils.sqlTranslatorsAfterDate();
                connection.query(sql, [dateSecs], function(error, results, fields){
                    console.log("GO3")
                    if (error) {
                        throw error;
                    }
                    res.send(utils.makeXml(results));
                })
                
            }
        }
    });
});

module.exports = router;