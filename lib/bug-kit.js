var debug = require('debug')('jurism-updater:server@bug-kit');
var path = require('path');

var pth = require(path.join(__dirname, 'paths.js'));

var query = require(pth.fp.connection).query;
var utils = require(pth.fp.utils);

async function getBug(id){
    debug("getBug()");
    var sql = "SELECT * from bugs WHERE id=?";
    var results = await query(sql, [id]);
    var jsdate = (parseInt(results[0][0].date, 10)*1000);
    var repoDate = utils.getUtcDateTime(jsdate);
    return ret = {
        id: results[0][0].id,
        date: repoDate.human,
        txt: results[0][0].txt.toString()
    };
}

async function returnBugList() {
    var twoWeeksAgo = Math.round(new Date().getTime()/1000);
    twoWeeksAgo = twoWeeksAgo - 1209600;
    var sql = "DELETE FROM bugs WHERE date<?";
    await query(sql, [twoWeeksAgo]);
    var sql = "SELECT id,date FROM bugs;";
    var results = await query(sql);
    var retlst = [];
    for (var obj of results[0]) {
        var jsdate = ((parseInt(obj.date, 10) + 32400)*1000);
        var repoDate = utils.getUtcDateTime(jsdate);
        retlst.push([repoDate.human, obj.id]);
    }
    return retlst;
}

async function createBugTable () {
    debug("createBugTable()");
    var sql = "CREATE TABLE bugs (id CHAR(64) PRIMARY KEY, date INT, txt MEDIUMBLOB)";
    return await query(sql);
}

async function bugList() {
    debug("bugList()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name = 'bugs' LIMIT 1;";
    var results = await query(sql);
    if (results[0].length) {
        return await returnBugList();
    } else {
        await createBugTable();
        return await returnBugList(res);
    }
}

module.exports = {
    bugList: bugList,
    getBug: getBug
}
