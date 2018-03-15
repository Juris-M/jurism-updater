var fs = require('fs');
var Promise = require('bluebird');
var lnfix = require('crlf-normalize');
var debug = require('debug')('jurism-updater:server@repo-kit');

debug = function(){}

var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));

var utils = require(pth.fp.utils);
var git = require(pth.fp.git_kit);
var query = require(pth.fp.connection);
var sql_kit = require(pth.fp.sql_kit);

function refreshRepo(repoName) {
    // Get date of latest commit
    debug("refreshRepo(\"" + repoName + "\")")
    var repoInfo = {
        name: repoName
    }
    // Delete record
    // Set record
    return getTopHash(repoInfo)
        .then(() => pullChanges(repoInfo))
        .then(() => makeChanges(repoInfo))
        .then(() => assureCommitHashTable())
        .then(() => deleteCommitHash(repoInfo))
        .then(() => getTopHash(repoInfo))
        .then(() => writeCommitHash(repoInfo))
}

function pullChanges(repoInfo) {
    return git[repoInfo.name](['pull', 'origin', 'master'])
}

function getTopHash(repoInfo) {
    debug("getTopHash()");
    return git[repoInfo.name]([ 'show', '--pretty=format:%H', '--abbrev-commit', 'HEAD'])
        .then((data) => {
            repoInfo.hash = data.split('\n')[0].trim();
            return repoInfo;
        })
}

function assureCommitHashTable() {
    debug("assureCommitHashTable()")
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema=? AND table_name=? LIMIT 1";
    return query(sql, ["jurism", "commit_hash"])
        .then((results) => {
            if (results[0].length === 0) {
                var sql = "CREATE TABLE commit_hash (repo_name CHAR(64) PRIMARY KEY, commit CHAR(64))";
                return query(sql)
            } else {
                return true;
            }
        })
}

function deleteCommitHash(repoInfo) {
    debug("deleteCommitHash()")
    var sql = "DELETE FROM commit_hash WHERE repo_name=?";
    return query(sql, [repoInfo.name])
}

function writeCommitHash(repoInfo) {
    debug("writeCommitHash()")
    var sql = "INSERT INTO commit_hash VALUES(?, ?)";
    return query(sql, [repoInfo.name, repoInfo.hash])
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

function makeChanges(repoInfo) {
    debug("makeChanges() " + repoInfo.name);
    return git[repoInfo.name]([ 'diff', '--name-status', repoInfo.hash, 'HEAD', '--'])
        .then((data) => {
            // For each item, add it, update it, or remove it.
            debug(data)
            var result = data.split('\n');
            var promises = [];
            debug("repoInfo.name? "+repoInfo.name)
            if (repoInfo.name === "translators") {
                debug("CHANGES");
                // Just translators for now.
                for (var line of result) {
                    if (line.slice(-3) !== '.js') continue
                    var info = line.split('\t');
                    if (info[0] === 'M') {
                        debug("M")
                        promises.push(replaceFile(repoInfo.name, info[1]));
                    } else if (info[0] === 'A') {
                        debug("A")
                        promises.push(replaceFile(repoInfo.name, info[1]));
                    } else if (info[0] === 'D') {
                        debug("D")
                        promises.push(removeFile(repoInfo.name, info[1]));
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

function replaceFile(repoName, fn) {
    debug("replaceFile()");
    var repoName = repoName.replace("-", "_");
    var data = getInfoAndTranslator(fn);
    var info = data.info;
    info.code = data.translator;
    return removeFile(repoName, fn)
        .then(() => getFileDate(repoName, fn))
        .then((d) => {
            info.lastUpdated = d;
            var params = sql_kit.sqlTranslatorInsertParams(info);
            var sql = sql_kit.sqlTranslatorInsertStatement;
            return query(sql, params)
        })
}

function removeFile(repoName, fn) {
    debug("removeFile()");
    repoName = repoName.replace("-", "_");
    var sql = "DELETE from " + repoName + " WHERE translatorFilename=?";
    var params = [fn];
    return query(sql, params)
}

function getFileDate(repoName, fn) {
    return git[repoName](['log', '--', fn])
        .then((data) => {
            var hash = data.split('\n')[0].replace(/^commit\s+/, '').trim()
            return hash;
        })
        .then((hash) => {
            return git[repoName](['show', '--pretty=format:%at', '--abbrev-commit', hash])
        })
        .then((data) => {
            return data.split('\n')[0].trim();
        })
}

function recreateTable(repoName) {
    debug("recreateTable()");
    var repoInfo = {
        name: repoName
    }
    var sql = "SELECT * FROM information_schema.tables WHERE table_schema = 'jurism' AND table_name=? LIMIT 1;"
    var params = [repoName];
    return query(sql, params)
        .then((results) => {
            if (results[0].length) {
                debug("DROP!");
                return dropTable(repoInfo)
                    .then(() => createTable(repoInfo))
                    .then(() => populateTable(repoInfo))
            } else {
                debug("CREATE!");
                return createTable(repoInfo)
                    .then(() => populateTable(repoInfo))
            }
        });
}

function dropTable (repoInfo) {
    debug("dropTable()");
    var sql = "DROP TABLE " + repoInfo.name;
    return query(sql)
}

function createTable(repoInfo) {
    debug("createTable()");
    // Needes to be fixed when we extend to cover translators
    var sql = sql_kit.sqlTranslatorCreateStatement;
    return query(sql)
}

function populateTable(repoInfo) {
    debug("populateTable()");
    return pullChanges(repoInfo)
        .then(() => {
            var filenames = [];
            for (var fn of fs.readdirSync(pth.dir.translators)) {
                if (fn.slice(-3) !== '.js') continue;
                filenames.push(replaceFile(repoInfo.name, fn));
            }
            return Promise.each(filenames, function(value, index, length) {
                return value;
            });
        })
}

function reportRepoTime() {
    debug("reportRepoTime()");
    var sql = "SELECT MAX(lastUpdated) AS repotime FROM translators";
    return query(sql)
        .then((results) => {
            var repotime = (parseInt(results[0][0].repotime, 10) * 1000);
            var repoDate = utils.getUtcDateTime(repotime);
            return repoDate
        })
}

module.exports = {
    recreateTable: recreateTable,
    refreshRepo: refreshRepo,
    replaceFile: replaceFile,
    assureCommitHashTable: assureCommitHashTable,
    reportRepoTime: reportRepoTime,
    deleteCommitHash: deleteCommitHash,
    writeCommitHash: writeCommitHash
}
