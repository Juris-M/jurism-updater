var express = require('express');
var router = express.Router();
var debug = require('debug')('jurism-updater:server@admin');
var fs = require('fs');

var path = require('path');
var pth = require(path.join(__dirname, '..', 'lib', 'paths.js'));

var bug_kit = require(pth.fp.bug_kit);
var repo_kit = require(pth.fp.repo_kit);
var utils = require(pth.fp.utils);
var sql_kit = require(pth.fp.sql_kit);

/*
 * In simple terms, we need:
 * 
 * 1. A route /updater/rebuild that:
 *    a. sets the spinner in motion, and
 *    b. calls this iterative function that for each table:
 *       i. drops it in the database
 *       ii. recreates the table
 *       iii. iterates over the rows, inserting each, then
 * 2. Removes the spinner and either:
 *    a. on error returns an error message for display, or
 *    b. on success updates the repo date and time
 */
router.get('/', async function(req, res) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': async function() {
            try {
                var targets = req.query.targets.split(",");
                for (var target of targets) {
                    await repo_kit.deleteRows(target);
                    await repo_kit.pullChanges(target);
                    var filenames = await repo_kit.getFileList(target);
                    for (var fn of filenames) {
                        var fieldVals = await repo_kit.scrapeFile(target, fn);
                        await repo_kit.addRow(target, fieldVals);
                    }
                }
                var complete = await repo_kit.reportRepoTime(true);
                res.send(JSON.stringify(complete));
            } catch (e) {
                utils.handleError(res, e);
            }
        }
    });
});

module.exports = router;