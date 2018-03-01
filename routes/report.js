var express = require('express');
var router = express.Router();
var rand = require('unique-random')(1, 65000);
var bodyParser = require('body-parser');
var debug = require('debug')('jurism-updater:server');

var utils = require('../tools/utils.js');

express.use(bodyParser.text());

router.post('/', function(req, res, next) {
    res.format({
        'text/xml': function() {
            var date = "" + Math.round(new Date().getTime()/1000);
            var rnd = utils.getRand();
            var id = 'D' + date + '-' + rnd;

            var sql = "INSERT INTO bugs VALUES(?, ?, ?)";
            utils.connection(sql, [id, date, req.body], function(error, results, fields){
                utils.sqlFail(error);
                var myxml = '<?xml version="1.0" encoding="utf-8"?>\n';
                myxml += '<reported reportID="' + id + '"/>'
                res.send(myxml);
            });
        }
    });
});

module.exports = router;
