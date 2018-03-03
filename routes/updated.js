var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var debug = require('debug')('jurism-updater:server@updated');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var conn = require(pth.fp.connection);

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
router.post('/', bodyParser.urlencoded({ type: '*/*', extended: true }), function(req, res, next) {
    res.format({
        'application/xml': function() {
            if (undefined === req.query.last) {
                var sql = "SELECT * FROM translators;"
                conn.query(sql, [dateSecs])
                    .then(function(results){
                        res.send(utils.makeXml(results));
                    })
                    .catch(
                        handleError
                    );
            } else {
                var dateSecs = parseInt(req.query.last, 10);
                var sql = "SELECT * FROM translators WHERE lastUpdated>?;"
                conn.query(sql, [dateSecs])
                    .then(function(results){
                        utils.sqlFail(error);
                        res.send(utils.makeXml(results));
                    })
                    .catch(
                        handleError
                    );
            }
        }
    });
});

module.exports = router;
