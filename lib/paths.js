var path = require('path');
var top = path.join(__dirname, '..');

// These should be set as functions for readability

const setFunc = (p) => {
    return (fn) => {
        var pth = path.join(...p);
        if (fn) {
            return path.join(top, pth, fn);
        } else {
            return path.join(top, pth);
        }
    };
}

var dir = {
    top: setFunc([]),
    translators: setFunc(["translators"]),
    "jm-styles": setFunc(["jm-styles"]),
    "csl-styles": setFunc(["csl-styles"]),
    lib: setFunc(['lib'])
}
var fp = {
    last_translator_commit: dir.top('COMMIT_TRANSLATORS.txt'),
    last_jm_style_commit: dir.top('COMMIT_JM_STYLES.txt'),
    last_zotero_style_commit: dir.top('COMMIT_ZOTERO_STYLES.txt'),
    config: dir.top('config.json'),
    utils: dir.lib('utils.js'),
    connection: dir.lib('connection.js'),
    repo_kit: dir.lib('repo-kit.js'),
    bug_kit: dir.lib('bug-kit.js'),
    trans_kit: dir.lib('translator-kit.js'),
    style_kit: dir.lib('style-kit.js'),
    git_kit: dir.lib('git-kit.js'),
    sql_kit: dir.lib('sql-kit.js')
}

module.exports = {
    dir: dir,
    fp: fp
};
