var mysql = require('mysql2/promise');
var fs = require('fs');
var debug = require('debug')('jurism-updater:server@connection');


var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));

var config = JSON.parse(fs.readFileSync(pth.fp.config));

process.env.PORT = config.port || "3500";

var connection = mysql.createConnection({
    host: config.host,
    user: config.database_user,
    password: config.database_password,
    database: config.database,
    charset: 'utf8mb4'
})

module.exports = connection;
