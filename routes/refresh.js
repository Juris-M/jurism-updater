var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@refresh');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var utils = require(pth.fp.utils);
var repo_kit = require(pth.fp.repo_kit);
var trans_kit = require(pth.fp.trans_kit);
var gitter = require(pth.fp.git_kit);

var doRefresh = async (req) => {
    try {
        var targets = req.query.targets.split(",");
        var total = 1;
        var hashes = {};
        for (var target of targets) {
            hashes[target] = await repo_kit.getTopHash(target);
            await repo_kit.pullChanges(target);
            var spec = repo_kit.TARGET[target];
            var data = await gitter(target, [ 'diff', '--name-status', hashes[target], 'HEAD', '--']);
            var difflines = data.split('\n');
            for (var line of difflines) {
                if (["A", "M", "D"].indexOf(line.slice(0, 1)) === -1) continue;
                if (line.slice(-1 * spec.ext.length) !== spec.ext) continue;
                total += 1;
            }
        }
        var count = 1;
        for (var target of targets) {
            var spec = repo_kit.TARGET[target];
            var data = await gitter(target, [ 'diff', '--name-status', hashes[target], 'HEAD', '--']);
            var difflines = data.split('\n');
            for (var line of difflines) {
                if (["A", "M", "D"].indexOf(line.slice(0, 1)) === -1) continue;
                if (line.slice(-1 * spec.ext.length) !== spec.ext) continue;
                count += 1;
                var arr = line.split('\t');
                var mode = arr[0];
                var fn = arr[1];
                switch (mode) {
                case ("M"):
                case ("A"):
		    // console.log(`WTF? ${hashes[target]} ${mode} ${target} ${fn}`);
                    var fieldVals = repo_kit.scrapeFile(target, fn);
                    await repo_kit.addRow(target, fieldVals);
                    break;
                case ("D"):
                    await repo_kit.removeFile(target, fn);
                    break;
                default:
                }
                process.env.JURISM_UPDATER_STATUS = count.toString();
            }
            await repo_kit.deleteCommitHash(target);
            var hash = await repo_kit.getTopHash(target);
            await repo_kit.writeCommitHash(target, hash);
        }
        process.env.JURISM_UPDATER_STATUS = "done";
    } catch (e) {
        process.env.JURISM_UPDATER_STATUS = e.message;
    }
}

router.get('/', function(req, res) {
    res.format({
        'text/plain': async function() {
            var status = process.env.JURISM_UPDATER_STATUS;
            if (status && status === "done") {
                process.env.JURISM_UPDATER_STATUS = status = "1";
                doRefresh(req);
            }
            res.send(JSON.stringify({process: status }));
        }
    });
});

module.exports = router;
