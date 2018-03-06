var fs = require('fs');
var lnfix = require('crlf-normalize');
var debug = require('debug')('jurism-updater:server@repo-kit');
var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));

var utils = require(pth.fp.utils);
var git = require(pth.fp.git_kit);
var query = require(pth.fp.connection);
var sql_kit = require(pth.fp.sql_kit);

function assureCommitHashTable(val) {
    debug("assureCommitHashTable()")
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema=? AND table_name=? LIMIT 1";
    return query(sql, ["jurism", "commit_hash"])
        .then((results) => {
            if (results[0].length === 0) {
                var sql = "CREATE TABLE commit_hash (repo_name CHAR(64) PRIMARY KEY, commit CHAR(64))";
                return query(sql)
            } else {
                return val;
            }
        })
}

function readCommitHash(repoName) {
    debug("readCommitHash()")
    var sql = "SELECT * FROM commit_hash WHERE repo_name=?";
    return query(sql, [repoName])
        .then((results) => {
            if (results[0].length > 0) {
                return results[0][0].commit;
            } else {
                return null;
            }
        })
}

function deleteCommitHash(repoName, repoHash) {
    debug("deleteCommitHash()")
    var sql = "DELETE FROM commit_hash WHERE repo_name=?";
    return query(sql, [repoName])
        .then(() => {
            return repoHash
        })
}

function writeCommitHash(repoName, commitHash) {
    return deleteCommitHash(repoName)
        .then(() => {
            debug("writeCommitHash()")
            var sql = "INSERT INTO commit_hash VALUES(?, ?)";
            return query(sql, [repoName, commitHash])
        })
}

function getHeadDate(repoName) {
    debug("getHeadDate()");
    return git[repoName]([ 'show', '--pretty=format:%aI', '--abbrev-commit', 'HEAD'])
        .then((data) => utils.composeRepoDate(data))
}

function getRepoHash(repoName) {
    if (repoName === "translators") {
        return assureCommitHashTable()
            .then(() => readCommitHash(repoName))
            .then((repoHash) => {
                if (repoHash) {
                    return repoHash;
                } else {
                    throw "No commit record for " + repoName +". Regenerate the DB."
                }
            })
            .then((repoHash) => deleteCommitHash(repoName, repoHash))
    } else {
        return "HEAD"
    }
}

function getInfoAndTranslator(fn) {
    var ret = {
        info: null,
        translator: null
    }
    var txt = fs.readFileSync(pth.dir.translators + fn).toString().trim();
    txt = lnfix.crlf(txt, lnfix.LF);
    txt = txt.split('\n');
    for (var i=0, ilen=txt.length; i<ilen; i++) {
        var line = txt[i];
        if (line.trim() === "" || line.slice(0, 1) === "/") {
            ret.info = JSON.parse(txt.slice(0, i).join('\n'));
            ret.translator = txt.slice(i).join('\n');
            break;
        }
    }
    ret.info.translatorFilename = fn;
    return ret;
}

function getChanges(repoName, hash) {
    return git[repoName]([ 'diff', '--name-status', hash, 'HEAD', '--']);
}

function addFile(repoName, fn, repoDate) {
    repoName = repoName.replace("-", "_");
    var data = getInfoAndTranslator(fn);
    var info = data.info;
    info.code = data.translator;
    info.lastUpdated = repoDate.machine;
    var params = sql_kit.sqlTranslatorInsertParams(info);
    var sql = sql_kit.sqlTranslatorInsertStatement;
    return query(sql, params)
}

function removeFile(repoName, fn) {
    repoName = repoName.replace("-", "_");
    var sql = "DELETE from " + repoName + " WHERE translatorFilename=?";
    var params = [fn];
    return query(sql, params)
}

function updateFile(repoName, fn, repoDate) {
    repoName = repoName.replace("-", "_");
    var sql = "UPDATE " + repoName + " SET lastUpdated=? WHERE translatorFilename=?";
    var params = [repoDate.machine, fn];
    return query(sql, params)
}

function refreshRepo(repoName) {
    // Get date of latest commit
    debug("refreshRepo(\"" + repoName + "\")")
    return git[repoName](['pull', 'origin', 'master'])
        .then(() => getHeadDate(repoName))
        .then((repoDate) => getRepoHash(repoName))
        .then((repoHash) => getChanges(repoName, repoHash))
        .then(function(data){
            // For each item, add it, update it, or remove it.
            var result = data.split('\n');
            var promises = [];
            if (repoName === "translators") {
                // Just translators for now.
                for (var line of result) {
                    if (line.slice(-3) !== '.js') continue
                    var info = line.split('\t');
                    if (info[0] === 'M') {
                        debug("M")
                        debug("  " + repoDate);
                        promises.push(updateFile(repoName, info[1], repoDate));
                    } else if (info[0] === 'A') {
                        debug("A")
                        promises.push(addFile(repoName, info[1], repoDate));
                    } else if (info[0] === 'D') {
                        debug("D")
                        promises.push(removeFile(repoName, info[1]));
                    }
                }
            }
            if (promises.length == 0) {
                return Promise.resolve(true);
            } else {
                return Promise.all(promises);
            }
        })
}

module.exports = {
    refreshRepo: refreshRepo,
    addFile: addFile,
    assureCommitHashTable: assureCommitHashTable,
    readCommitHash: readCommitHash,
    deleteCommitHash: deleteCommitHash,
    writeCommitHash: writeCommitHash
}
