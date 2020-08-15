var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var debug = require('debug')('jurism-updater:server@updated');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var query = require(pth.fp.connection).query;
var trans_kit = require(pth.fp.trans_kit);

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

/* POST fetch files (translators AND styles) after a given date */
router.post('/', bodyParser.urlencoded({ type: '*/*', extended: true }), function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'application/xml': async function() {
            var results;
            if (undefined === req.query.last) {
                var sql = "SELECT * FROM translators;";
                try {
                    results = await query(sql, [dateSecs]);
                    res.send(trans_kit.makeXml(results[0]));
                } catch (e) {
                    utils.handleError.call(me, e);
                }
            } else {
                var dateSecs = parseInt(req.query.last, 10);
                try {
                    var styles = JSON.parse(req.body.styles);
                    var myxml = await trans_kit.makeXml(dateSecs, styles);
                    res.send(myxml);
                } catch (e) {
                    utils.handleError.call(me, e);
                }
            }
        }
    });
});

module.exports = router;
