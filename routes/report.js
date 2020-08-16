var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var debug = require('debug')('jurism-updater:server@report');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var query = require(pth.fp.connection).query;

router.post('/', bodyParser.text({type: '*/*'}), function(req, res, next) {
    res.format({
        'application/xml': async function() {
            var date = Math.round(new Date().getTime()/1000);
            var rnd = utils.getRand();
            var id = '' + date + '-' + rnd;

            var sql = "INSERT INTO bugs VALUES(?, ?, ?)";
            var params = [id, date, req.body];
            try {
                await query(sql, params);
                var myxml = '<?xml version="1.0" encoding="utf-8"?>\n';
                myxml += '<reported reportID="' + id + '"/>\n';
                return res.send(myxml);
            } catch (e) {
                return utils.handleError(e);
            }
        }
    });
});

module.exports = router;
