var fs = require('fs');
var lnfix = require('crlf-normalize');
var debug = require('debug')('jurism-updater:server@repo-kit');

var path = require('path');
var pth = require(path.join(__dirname, 'paths.js'));

var utils = require(pth.fp.utils);
var gitter = require(pth.fp.git_kit);
var query = require(pth.fp.connection).query;
var sql_kit = require(pth.fp.sql_kit);

/*
 * Maps and mapping utilities
 */

const TARGET = {
    "translators": {
        table: "translators",
        ext: ".js",
        prefix: ""
    },
    "jm-styles": {
        table: "styles",
        ext: ".csl",
        prefix: "jm-",
    },
    "csl-styles": {
        table: "styles",
        ext: ".csl",
        prefix: ""
    }
}

const TABLE = {
    "translators": ["translators"],
    "styles": ["csl-styles", "jm-styles"]
}

var tableFromTarget = (target) => {
    return TARGET[target].table;
};

/*
 * SQL operations
 */
var createTable = async (table) => {
    var fields = sql_kit[table].map((o) => {
        return `${o.name} ${o.spec}`;
    }).join(", ");
    var sql =`CREATE TABLE ${table} (${fields})`; 
    await query(sql);
}

var assureAllTables = async () => {
    var sql = "SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_schema LIKE ? AND table_type LIKE ? AND table_name=?";
    for (var table in sql_kit) {
        var result = await query(sql, ["jurismDB", "BASE_TABLE", table]);
        if (!result.length) {
            await createTable(table);
        }
    }
}

var deleteRows = async (target) => {
    var table = tableFromTarget(target);
    switch (target) {
    case "translators":
        var sql = `DELETE FROM ${table}`;
        await query(sql, []);
        break;
    case "csl-styles":
    case "jm-styles":
        var sql = `DELETE FROM ${table} WHERE styleType=?`;
        await query(sql, [target]);
        break;
    default:
    }
}

var removeFile = async (target, fn) => {
    var table = tableFromTarget(target);
    var sql = `DELETE from ${table} WHERE filename=?`;
    var params = [fn];
    return await query(sql, params);
}

var addRow = async (target, fieldVals) => {
    var table = tableFromTarget(target);
    for (var fieldName in fieldVals) {
        var field = fieldVals[fieldName];
        if (field && typeof field === "object") {
            fieldVals[fieldName] = JSON.stringify(field);
        }
    }
    var placeholders = sql_kit[table].map(() => {
        return "?";
    }).join(", ");
    var sql = `REPLACE INTO ${table} VALUES (${placeholders})`;
    var params = sql_kit[table].map((o) => {
        if (o.force) {
            return o.force;
        } else {
            return fieldVals[o.name] ? fieldVals[o.name] : null;
	}
    });
    await query(sql, params);
}

/*
 * GitHub clone operations
 */
var pullChanges = async (target) => {
    await gitter(target, ['pull', 'origin', 'master']);
}

var getFileList = (target) => {
    var spec = TARGET[target];
    var filenames = fs.readdirSync(pth.dir[target]());
    return filenames.filter((fn) => {
        var f = path.parse(fn);
        if (f.ext !== spec.ext) return false;
        if (spec.prefix && f.name.slice(0, spec.prefix.length) !== spec.prefix) return false;
	return fn;
    });
}

var scrapeFile = async (res, target, fn) => {
    var table = tableFromTarget(target);
    var txt = fs.readFileSync(pth.dir[target](fn)).toString().trim();
    txt = lnfix.crlf(txt, lnfix.LF);
    txt = txt.split('\n');
    var fun = {
        translators: async (target, fn) => {
            var ret = {
                // lastUpdated: await getFileDate(target, fn),
                filename: fn
            };
            for (var i=0, ilen=txt.length; i<ilen; i++) {
                let line = txt[i];
                if (line.trim() === "" || line.slice(0, 1) === "/") {
                    try {
                        ret = Object.assign(ret, JSON.parse(txt.slice(0, i).join('\n')));
                    } catch (e) {
                        console.log(`Error parsing file: ${fn}`);
                        utils.handleError(res, e);
                    }
                    ret.code = txt.slice(i).join('\n');
                    break;
                }
            }
	    ret.lastUpdated = utils.getUtcDateTime(ret.lastUpdated).machine;
            return ret;
        },
        styles: async (target, fn) => {
            var ret = {
                lastUpdated: await getFileDate(target, fn),
                filename: fn
            };
	    var updatedDone = false;
	    var styleID = false;
            for (var i=0,ilen=txt.length; i<ilen; i++) {
                let line = txt[i];
                var m = line.match(/\s*<id>(.*)<\/id>/);
                if (m) {
                    ret.styleID = m[1];
                    if (ret.styleID.indexOf("zotero.org/styles") > -1) {
                        ret.styleType = "csl-styles";
                    } else if (ret.styleID.indexOf("juris-m.github.io/jm-styles") > -1) {
                        ret.styleType = "jm-styles";
                    } else if (ret.styleID.indexOf("juris-m.github.io/styles") > -1) {
                        ret.styleType = "jm-styles";
                    } else if (ret.styleID.indexOf("juris-m.github.io/modules") > -1) {
                        ret.styleType = "jm-modules";
                    }
                    break;
                }
            }
            return ret;
        }
    };
    return fun[table](target, fn);
}

var getFileDate = async (target, fn) => {
    return  await gitter(target, ['log', '-1', '--pretty=format:%ct', '--', fn]);
}

/*
 * GitHub clone operations specific to refresh
 */


var getTopHash = async (target) => {
    var data = await gitter(target, [ 'log', '-1', '--pretty=format:%H']);
    return data.split('\n')[0].trim();
}

var deleteCommitHash = async (target) => {
    var sql = "DELETE FROM commit_hash WHERE repo_name=?";
    return await query(sql, [target]);
}

var writeCommitHash = async (target, hash) => {
    var sql = "INSERT INTO commit_hash VALUES(?, ?)";
    await query(sql, [target, hash]);
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
    pullChanges: pullChanges,
    scrapeFile: scrapeFile,
    getFileList: getFileList,
    addRow: addRow,
    deleteRows: deleteRows,
    assureAllTables,
    reportRepoTime: reportRepoTime,
    TARGET: TARGET,
    writeCommitHash: writeCommitHash,
    deleteCommitHash: deleteCommitHash,
    getTopHash: getTopHash
}
