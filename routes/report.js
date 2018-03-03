var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var debug = require('debug')('jurism-updater:server@report');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var conn = require(pth.fp.connection);

router.post('/', bodyParser.text({type: '*/*'}), function(req, res, next) {
    res.format({
        'application/xml': function() {
            console.log("so far, so good?");
            var date = Math.round(new Date().getTime()/1000);
            var rnd = utils.getRand();
            var id = '' + date + '-' + rnd;

            var sql = "INSERT INTO bugs VALUES(?, ?, ?)";
            var params = [id, date, req.body];
            conn.then((conn) => conn.query(sql, params))
                .then(() => {
                    var myxml = '<?xml version="1.0" encoding="utf-8"?>\n';
                    myxml += '<reported reportID="' + id + '"/>\n';
                    res.send(myxml)
                })
                .catch(
                    utils.handleError
                );
        }
    });
});

module.exports = router;
