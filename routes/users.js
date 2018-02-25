var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.format({
    'text/plain': function(){
      res.send(JSON.stringify(Object.keys(req), null, 2)+"\n"+JSON.stringify(req.query, null, 2));
    }
  })
});
module.exports = router;
