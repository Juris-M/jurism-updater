var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var debug = require('debug')('jurism-updater:server');

var utils = require('../tools/utils.js');

router.post('/', bodyParser.text({type: '*/*'}), function(req, res, next) {
    res.format({
        'application/xml': function() {
            console.log("so far, so good?");
            var date = Math.round(new Date().getTime()/1000);
            var rnd = utils.getRand();
            var id = '' + date + '-' + rnd;

            var sql = "INSERT INTO bugs VALUES(?, ?, ?)";
            var params = [id, date, req.body];
            utils.connection.query(sql, params, function(error, results, fields){
                utils.sqlFail(error);
                var myxml = '<?xml version="1.0" encoding="utf-8"?>\n';
                myxml += '<reported reportID="' + id + '"/>\n';
                res.send(myxml);
            });
        }
    });
});

module.exports = router;
