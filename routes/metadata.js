var express = require('express');
var router = express.Router();

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var debug = require('debug')('jurism-updater:server@metadata');

var utils = require(pth.fp.utils);
var query = require(pth.fp.connection);
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
    this.res = res;
    var me = this;
    res.format({
        'application/json': function(){
            var last = req.query.last ? req.query.last : 0;
            last = parseInt(last, 10);
            var sql = "SELECT  " + keys + " FROM translators where lastUpdated > ?";
            query(sql, [last])
                .then((results) => {
                    var ret = [];
                    for (var result of results[0]) {
                        ret.push(utils.composeMetadataBlock(result));
                    }
                    me.res.send(ret);
                })
                .catch(
                    utils.handleError.bind(me)
                );
        }
    })
});
module.exports = router;
