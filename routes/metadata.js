var express = require('express');
var router = express.Router();

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var debug = require('debug')('jurism-updater:server@metadata');

var utils = require(pth.fp.utils);
var query = require(pth.fp.connection).query;
var trans_kit = require(pth.fp.trans_kit);

var flat_keys = [
    "translatorID",
    "translatorType",
    "label",
    "creator",
    "target",
    "priority",
    "lastUpdated",
    "minVersion",
    "maxVersion",
    "inRepository",
    "browserSupport",
]

var json_keys = [
    "displayOptions",
    "configOptions"
]

var keys = flat_keys.join(",") + "," + json_keys.join(",");

/* GET the lastUpdate of the latest translator. */
router.get('/', function(req, res, next) {
    res.format({
        'application/json': async function(){
            var last = req.query.last ? req.query.last : 0;
            last = parseInt(last, 10);
            var sql = "SELECT  " + keys + " FROM translators where lastUpdated > ?";
            try {
                var results = await query(sql, [last]);
                var ret = [];
                for (var result of results) {
                    ret.push(utils.composeMetadataBlock(result));
                }
                return res.send(ret);
            } catch (e) {
                return utils.handleError(res, e);
            }
        }
    });
});
module.exports = router;
