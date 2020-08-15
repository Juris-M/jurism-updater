var express = require('express');
var router = express.Router();

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var query = require(pth.fp.connection).query;
var trans_kit = require(pth.fp.trans_kit);

/* GET a translator. */
router.get('/*', function(req, res, next) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': async function(){
            var translatorID = req.url
                .replace(/^\//, "")
                .replace(/\?.*/, "");
            var sql = "SELECT * FROM translators where translatorID=?;";
            try {
                var results = await query(sql, [translatorID]);
                var obj = {};
                var result = results[0][0];
                var metadata = utils.composeMetadataBlock(result, true);
                var code = results[0][0].code.toString().trim();
                var ret = metadata + "\n\n" + code;
                me.res.send(ret);
            } catch(e) {
                utils.handleError.call(me, e);
            };
        }
    });
});
module.exports = router;
