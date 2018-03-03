var path = require('path');
var top = path.join(__dirname, '..');

function setDir(p) {
    p = p.join(path.sep) + path.sep;
    return path.join(top, p);
}

function setFile(p) {
    p = p.join(path.sep);
    return path.join(top, p);
}

var dir = {
    top: setDir([]),
    translators: setDir(["translators"]),
    "jm-styles": setDir(["jm-styles"]),
    "csl-styles": setDir(["csl-styles"]),
    lib: setDir(['lib'])
}
var fp = {
    
    last_translator_commit: setFile(['COMMIT_TRANSLATORS.txt']),
    last_jm_style_commit: setFile(['COMMIT_JM_STYLES.txt']),
    last_zotero_style_commit: setFile(['COMMIT_ZOTERO_STYLES.txt']),
    config: setFile(['config.json']),
    utils: setFile(['lib', 'utils.js']),
    connection: setFile(['lib', 'connection.js']),
    repo_kit: setFile(['lib', 'repo-kit.js']),
    bug_kit: setFile(['lib', 'bug-kit.js']),
    trans_kit: setFile(['lib', 'translator-kit.js']),
    style_kit: setFile(['lib', 'style-kit.js']),
    git_kit: setFile(['lib', 'git-kit.js']),
    sql_kit: setFile(['lib', 'sql-kit.js'])
}

module.exports = {
    dir: dir,
    fp: fp
};
