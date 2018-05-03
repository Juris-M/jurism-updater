var express = require('express');
var router = express.Router();

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

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

/* GET a translator. */
router.get('/*', function(req, res, next) {
    var me = this;
    var myres = res;
    res.format({
        'text/plain': function(){
            var translatorID = req.url
                .replace(/^\//, "")
                .replace(/\?.*/, "");
            var sql = "SELECT * FROM translators where translatorID=?;"
            query(sql, [translatorID])
                .then((results) => {
                    var obj = {};
                    var result = results[0][0];
                    for (var key of flat_keys) {
                        if (result[key]) {
                            obj[key] = result[key];
                        }
                    }
                    for (var key of json_keys) {
                        if (result[key]) {
                            obj[key] = JSON.parse(result[key]);
                        }
                    }
                    var code = results[0][0].code.toString().trim();
                    var ret = JSON.stringify(obj, null, 2) + "\n\n" + code;
                    myres.send(ret);
                })
                .catch(
                    utils.handleError.bind(me)
                );
        }
    })
});
module.exports = router;
