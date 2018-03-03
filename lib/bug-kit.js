var debug = require('debug')('jurism-updater:server@bug-kit');
var path = require('path');

var pth = require(path.join(__dirname, 'paths.js'));

var conn = require(pth.fp.connection);
var utils = require(pth.fp.utils);

function getBug(res, id){
    debug("getBug()")
    var sql = "SELECT * from bugs WHERE id=?";
    return conn.then((conn) => conn.query(sql, [id]))
        .then((results) => {
            var jsdate = (parseInt(results[0][0].date, 10)*1000);
            var repoDate = utils.getUtcDateTime(jsdate);
            var ret = {
                id: results[0][0].id,
                date: repoDate.human,
                txt: results[0][0].txt.toString()
            }
            res.send(ret);
        })
}

function returnBugList(res) {
    var twoWeeksAgo = Math.round(new Date().getTime()/1000);
    twoWeeksAgo = twoWeeksAgo - 1209600;
    var sql = "DELETE FROM bugs WHERE date<?"
    return conn.then((conn) => conn.query(sql, [twoWeeksAgo]))
        .then((results) => {
            return conn.then((conn) => {
                var sql = "SELECT id,date FROM bugs;";
                return conn.query(sql)
            })
        })
        .then((results) => {
            var retlst = [];
            for (var obj of results[0]) {
                var jsdate = ((parseInt(obj.date, 10) + 32400)*1000);
                var repoDate = utils.getUtcDateTime(jsdate);
                retlst.push([repoDate.human, obj.id])
            }
            res.send(retlst);
        });
}

function createBugTable (res) {
    debug("createBugTable()");
    var sql = "CREATE TABLE bugs (id CHAR(64) PRIMARY KEY, date INT, txt MEDIUMBLOB)";
    return conn.then((conn) => conn.query(sql))
}

function bugList(res) {
    debug("bugList()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name = 'bugs' LIMIT 1;"
    return conn.then((conn) => conn.query(sql))
        .then((results) => {
            if (results[0].length) {
                returnBugList(res);
            } else {
                createBugTable(res)
                    .then(() => returnBugList(res))
            }
        });
}

module.exports = {
    bugList: bugList,
    getBug: getBug
}
