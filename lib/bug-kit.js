var debug = require('debug')('jurism-updater:server@bug-kit');
var qs = require("querystring");
var path = require('path');

var pth = require(path.join(__dirname, 'paths.js'));

var query = require(pth.fp.connection).query;
var utils = require(pth.fp.utils);

async function getBug(id){
    debug("getBug()");
    var sql = "SELECT * from bugs WHERE id=?";
    var results = await query(sql, [id]);
    var jsdate = (parseInt(results[0].date, 10)*1000);
    var repoDate = utils.getUtcDateTime(jsdate);
    var txt = results[0].txt.toString();
    if (txt.indexOf("\n") === -1) {
        txt = JSON.stringify(qs.parse(txt), null, 2);
    }
    return ret = {
        id: results[0].id,
        date: repoDate.human,
        txt: txt
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
    for (var obj of results) {
        var jsdate = ((parseInt(obj.date, 10) + 32400)*1000);
        var repoDate = utils.getUtcDateTime(jsdate);
        retlst.push([repoDate.human, obj.id]);
    }
    return retlst;
}

async function bugList() {
    debug("bugList()");
    return await returnBugList();
}

module.exports = {
    bugList: bugList,
    getBug: getBug
}
