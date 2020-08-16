var fs = require('fs');
var lnfix = require('crlf-normalize');
var debug = require('debug')('jurism-updater:server@repo-kit');


// Okay, coming along. Notes.
// * Need to distingush repoInfo.name (csl-styles, jm-styles) from the database name (styles).


//debug = function(){};

var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));

var utils = require(pth.fp.utils);
var git = require(pth.fp.git_kit);
var query = require(pth.fp.connection).query;
var sql_kit = require(pth.fp.sql_kit);

const getRepoInfo = (repoName) => {
    var ret = {};
    if (repoName === "translators") {
        ret.dir = repoName;
        ret.name = repoName;
        ret.category = "translators";
        ret.ext = ".js";
        ret.prefix = "";
    } else if (repoName === "jm-styles") {
        ret.dir = repoName;
        ret.name = repoName.replace("-", "_");
        ret.category = "styles";
        ret.ext = ".csl";
        ret.prefix = "jm-";
    } else if (repoName === "csl-styles") {
        ret.dir = repoName;
        ret.name = repoName.replace("-", "_");
        ret.category = "styles";
        ret.ext = ".csl";
        ret.prefix = "";
    }
    return ret;
}

async function refreshRepo(repoName) {
    // Get date of latest commit
    debug("refreshRepo(\"" + repoName + "\")");
    var repoInfo = getRepoInfo(repoName);
    // Delete record
    // Set record
    repoInfo = await getTopHash(repoInfo);
    await pullChanges(repoInfo);
    await makeChanges(repoInfo);
    await assureCommitHashTable();
    await deleteCommitHash(repoInfo);
    repoInfo = await getTopHash(repoInfo);
    var ret = writeCommitHash(repoInfo);
    return ret;
}

async function pullChanges(repoInfo) {
    return await git[repoInfo.dir](['pull', 'origin', 'master']);
}

async function getTopHash(repoInfo) {
    debug("getTopHash()");
    var data = await git[repoInfo.dir]([ 'show', '--pretty=format:%H', '--abbrev-commit', 'HEAD']);
    repoInfo.hash = data.split('\n')[0].trim();
    return repoInfo;
}

async function assureCommitHashTable() {
    debug("assureCommitHashTable()");
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema=? AND table_name=? LIMIT 1";
    var results = await query(sql, ["jurism", "commit_hash"]);
    if (results[0].length === 0) {
        var sql = "CREATE TABLE commit_hash (repo_name CHAR(64) PRIMARY KEY, commit CHAR(64))";
        return await query(sql);
    } else {
        return true;
    }
}

async function deleteCommitHash(repoInfo) {
    debug("deleteCommitHash()");
    var sql = "DELETE FROM commit_hash WHERE repo_name=?";
    return await query(sql, [repoInfo.name]);
}

async function writeCommitHash(repoInfo) {
    debug("writeCommitHash()");
    var sql = "INSERT INTO commit_hash VALUES(?, ?)";
    return await query(sql, [repoInfo.name, repoInfo.hash]);
}

function getInfoAndContent(repoInfo, fn) {
    var ret = {
        info:{}
    };
    var txt = fs.readFileSync(pth.dir[repoInfo.dir](fn)).toString().trim();
    txt = lnfix.crlf(txt, lnfix.LF);
    txt = txt.split('\n');
    var line;
    if (repoInfo.category === "translators") {
        for (var i=0, ilen=txt.length; i<ilen; i++) {
            line = txt[i];
            if (line.trim() === "" || line.slice(0, 1) === "/") {
                ret.info = JSON.parse(txt.slice(0, i).join('\n'));
                ret.info.code = txt.slice(i).join('\n');
                break;
            }
        }
    } else if (repoInfo.category === "styles") {
        // styleID
        // styleType
        // lastUpdated
        for (var i=0,ilen=txt.length; i<ilen; i++) {
            line = txt[i];
            var m = line.match(/\s*<id>(.*)<\/id>/);
            if (m) {
                ret.info.styleID = m[1];
                // CSL, CSL-M, Module
                if (ret.info.styleID.indexOf("zotero.org/styles") > -1) {
                    ret.info.styleType = "csl-styles";
                } else if (ret.info.styleID.indexOf("juris-m.github.io/jm-styles") > -1) {
                    ret.info.styleType = "jm-styles";
                } else if (ret.info.styleID.indexOf("juris-m.github.io/styles") > -1) {
                    ret.info.styleType = "jm-styles";
                } else if (ret.info.styleID.indexOf("juris-m.github.io/modules") > -1) {
                    ret.info.styleType = "jm-modules";
                }
                break;
            }
        }
    }
    ret.info.filename = fn;
    return ret;
}

async function makeChanges(repoInfo) {
    debug("makeChanges() " + repoInfo.name);
    var data = await git[repoInfo.dir]([ 'diff', '--name-status', repoInfo.hash, 'HEAD', '--']);
    debug(data);
    var result = data.split('\n');
    debug("repoInfo.name? "+repoInfo.name);
    if (repoInfo.name === "translators") {
        debug("CHANGES");
        // Just translators for now.
        for (var line of result) {
            if (line.slice(-3) !== '.js') continue
            var info = line.split('\t');
            if (info[0] === 'M') {
                debug("M");
                await replaceFile(repoInfo, info[1]);
            } else if (info[0] === 'A') {
                debug("A");
                await addFile(repoInfo, info[1]);
            } else if (info[0] === 'D') {
                debug("D");
                await removeFile(repoInfo, info[1]);
            }
        }
    }
}

async function replaceFile(repoInfo, fn) {
    debug("replaceFile()");
    await removeFile(repoInfo, fn);
    await addFile(repoInfo, fn);
}

async function removeFile(repoInfo, fn) {
    debug("removeFile()");
    var sql = "DELETE from " + repoInfo.category + " WHERE filename=?";
    var params = [fn];
    return await query(sql, params);
}

async function addFile(repoInfo, fn) {
    debug("addFile()");
    var data = getInfoAndContent(repoInfo, fn);
    var info = data.info;
    // content is defined only for translators
    // Thought: don't we want to set timestamps on added/replaced style files though, then checkin and push? Wouldn't that be cool?
    var d = await getFileDate(repoInfo, fn);
    info.lastUpdated = d;
    var params = sql_kit[repoInfo.category].insertParams(info);
    var sql = sql_kit[repoInfo.category].insertStatement();
    return await query(sql, params);
}

async function getFileDate(repoInfo, fn) {
    var data = await git[repoInfo.dir](['log', '--', fn]);
    var hash = data.split('\n')[0].replace(/^commit\s+/, '').trim();
    data =  await git[repoInfo.dir](['show', '--pretty=format:%at', '--abbrev-commit', hash]);
    return data.split('\n')[0].trim();
}

async function checkTables(obj) {
    // Check the number of entries currently in the tables against goal,
    // and return object with key done=false if not equal, or done=true
    // with repoDate[human|machine] object otherwise.
    try {
        obj.count = 0;
        if (obj.targets.indexOf("csl-styles") > -1) {
            var sql = "SELECT COUNT(*) AS count FROM styles WHERE styleType=?";
            var params = ["csl-styles"];
            var result = await query(sql, params);
            obj.count += result[0].count;
        }
        if (obj.targets.indexOf("jm-styles") > -1) {
            var sql = "SELECT COUNT(*) AS count FROM styles WHERE styleType=?";
            var params = ["jm-styles"];
            var result = await query(sql, params);
            obj.count += result[0].count;
        }
        if (obj.targets.indexOf("jm-modules") > -1) {
            var sql = "SELECT COUNT(*) AS count FROM styles WHERE styleType=?";
            var params = ["jm-modules"];
            var result = await query(sql, params);
            obj.count += result[0].count;
        }
        if (obj.targets.indexOf("translators") > -1) {
            var sql = "SELECT COUNT(*) AS count FROM translators";
            var result = await query(sql);
            obj.count += result[0].count;
        }
        if (obj.count == obj.goal) {
            return await reportRepoTime(true);
        } else {
            return obj;
        }
    } catch (e) {
        return obj;
    }
}

/*
 * See populateTable() for the return value to this function.
 */
async function recreateTables(targets) {
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name=? LIMIT 1;";
    var repoNames = ["translators", "csl-styles", "jm-styles"];
    var styleRepoNames = ["csl-styles", "jm-styles"];
    //var repoNames = ["translators", "csl-styles", "jm-styles", "jm-modules"];
    //var styleRepoNames = ["csl-styles", "jm-styles", "jm-modules"];
    var doingAllStyles = true;
    for (var styleRepoName of styleRepoNames) {
        if (targets.indexOf(styleRepoName) === -1) {
            doingAllStyles = false;
            break;
        }
    }
    var droppedStylesRepo = false;
    var count = 0;
    for (var repoName of repoNames) {
        if (targets.indexOf(repoName) === -1) {
            continue;
        }
        var repoInfo = getRepoInfo(repoName);
        var params = [repoInfo.category];
        var results = await query(sql, params);
        
        // Okay, a tricky bit here. If we are resetting ALL of the style repos,
        // we want to drop and recreate.

        // But if we're only resetting a SUBSET of the style repos, we want to
        // delete entries of this type, and then populate, without dropping or
        // creating.

        // Also, in any case the styles repo should be dropped/created only ONCE.
        
        if (results.length) {
            // Buncha conditions here ... styles repo, first of them, not got all of them ...
            // Complicated.
            if (!doingAllStyles && styleRepoNames.indexOf(repoInfo.dir) > -1) {
                var delsql = `DELETE FROM ${repoInfo.category} WHERE styleType=?;`;
                params = [repoInfo.dir];
                await query(delsql, params);
            } else {
                if (styleRepoNames.indexOf(repoInfo.dir) === -1 || !droppedStylesRepo) {
                    console.log(`Dropping table ${repoInfo.category}, then creating it`);
                    await dropTable(repoInfo);
                    await createTable(repoInfo);
                }
                if (styleRepoNames.indexOf(repoInfo.dir) > -1) {
                    droppedStylesRepo = true;
                }
            }
            var filenames = await getFileList(repoInfo);
            count += filenames.length;
            populateTable(repoInfo, filenames);
        } else {
            console.log(`No table ${repoInfo.category}, creating it`);
            await createTable(repoInfo);
            var filenames = await getFileList(repoInfo);
            count += filenames.length;
            populateTable(repoInfo);
        }
    }
    return {
        goal: count,
        targets: targets,
        count: 0
    };
}

async function dropTable (repoInfo) {
    debug("dropTable()");
    var sql = `DROP TABLE ${repoInfo.category}`;
    return await query(sql, null);
}

async function createTable(repoInfo) {
    debug("createTable()");
    var sql = sql_kit[repoInfo.category].createStatement(repoInfo);
    return await query(sql, null);
}

async function getFileList(repoInfo) {
    debug("getFileList()");
    await pullChanges(repoInfo);
    var filenames = [];
    for (var fn of fs.readdirSync(pth.dir[repoInfo.dir]())) {
        if (path.parse(fn).ext !== repoInfo.ext) continue;
        if (repoInfo.prefix && path.parse(fn).name.slice(0, repoInfo.prefix.length) !== repoInfo.prefix) continue;
        filenames.push(fn);
    }
    return filenames;
}

async function populateTable(repoInfo, filenames) {
    debug("populateTable()");
    for (var fn of filenames) {
        await addFile(repoInfo, fn);
    }
    return true;
}

async function reportRepoTime(done) {
    debug("reportRepoTime()");
    var sql = "SELECT MAX(lastUpdated) AS repotime FROM translators";
    var results = await query(sql);
    var repotime = (parseInt(results[0].repotime, 10) * 1000);
    var repoDate = utils.getUtcDateTime(repotime);
    repoDate.done = done;
    return repoDate;
}

module.exports = {
    recreateTables: recreateTables,
    refreshRepo: refreshRepo,
    assureCommitHashTable: assureCommitHashTable,
    reportRepoTime: reportRepoTime,
    deleteCommitHash: deleteCommitHash,
    writeCommitHash: writeCommitHash,
    checkTables: checkTables
}
