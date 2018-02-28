var express = require('express');
var router = express.Router();

var debug = require('debug')('jurism-updater:server');
var mysql = require('mysql')
var utils = require('../tools/utils.js');

/* GET file a debug log report */
router.get('/', function(req, res, next) {
    res.format({
        'text/plain': function() {
            res.send("hello")
        }
    });
});

module.exports = router;
