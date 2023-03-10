var mysql = require('mysql2-async').default;

//console.log(JSON.stringify(Object.keys(mysql, null, 2), 2));
//process.exit();

var fs = require('fs');
var debug = require('debug')('jurism-updater:server@connection');


var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));

var config = JSON.parse(fs.readFileSync(pth.fp.config));

console.log(`config is: ${JSON.stringify(config, null, 2)}`);

process.env.PORT = config.port || "3500";

var pool = new mysql({
    host: config.host,
    user: config.database_user,
    password: config.database_password,
    database: config.database,
    charset: 'utf8mb4'
});

async function query (sql, params) {
    return await pool.query(sql, params);
}

module.exports = {
    query: query
}
