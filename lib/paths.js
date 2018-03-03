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
    translators: setDir(['translators']),
    lib: setDir(['lib'])
}
var fp = {
    commit: setFile(['REPO_HASH.txt']),
    config: setFile(['config.json']),
    utils: setFile(['lib', 'utils.js']),
    connection: setFile(['lib', 'connection.js']),
    bug_kit: setFile(['lib', 'bug-kit.js']),
    trans_kit: setFile(['lib', 'translator-kit.js'])
}

module.exports = {
    dir: dir,
    fp: fp
};
