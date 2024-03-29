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
/*
 * Okay, think clearly again. Upon receiving the rebuild
 * request, we kick off an async process to do the rebuild,
 * writing progress and completion to process.env.JURISM_UPDATER_STATUS.
 * That returns immediately, and we send in-progress response
 * to browser as JSON.
 *
 * Thought: Each of these should indicate where flow comes from
 * and where flow goes to.
 */

var doRebuild = async (req, res) => {
    try {
        var targets = req.query.targets.split(",");
        // Get total number of files
        var total = 0;
        for (var target of targets) {
            var filenames = repo_kit.getFileList(target);
            total += filenames.length;
        }
        var count = 1;
        for (var target of targets) {
            await repo_kit.deleteRows(target);
            await repo_kit.pullChanges(target);
            var filenames = repo_kit.getFileList(target);
            for (var fn of filenames) {
                var fieldVals = await repo_kit.scrapeFile(res, target, fn);
                await repo_kit.addRow(target, fieldVals);
                count += 1;
                process.env.JURISM_UPDATER_STATUS = count.toString();
            }
        }
        process.env.JURISM_UPDATER_STATUS = "done";
    } catch (e) {
        process.env.JURISM_UPDATER_STATUS = e.message;
    }
}

/*
 * FROM: public/javascript/admin-page.js
 * TO: public/javascript/admin-page.js
 */

/*
 * PUZZLE: How to assure that date is correctly reported back
 * to browser and displayed, when:
 * - the server is polled and reports completion; or
 * - the admin page is refreshed.
 * Simple thing will be to set up timeout with a
 * function it calls as a closure. The admin page can
 * then call that function after loading.
 */

router.get('/', function(req, res) {
    res.format({
        'text/plain': function() {
            var status = process.env.JURISM_UPDATER_STATUS;
            if (status && status === "done") {
                process.env.JURISM_UPDATER_STATUS = status = "1";
                doRebuild(req, res);
            }
            res.send(JSON.stringify({process: status }));
        }
    });
});

/*
router.get('/', function(req, res) {
    this.res = res;
    var me = this;
    res.format({
        'text/plain': function() {
		var status = process.env.JURISM_UPDATER_STATUS;
		if (status && typeof status === "string") {
			if (status.match(/^[0-9]+$/)) {
				// job in progress
			} else if () {
				// error
			}
		} else {
			// Show admin page in full
		}
	
	// The stuff below happens on server-side, and
	// should not appear here.
            try {
                var targets = req.query.targets.split(",");
                for (var target of targets) {
                    await repo_kit.deleteRows(target);
                    await repo_kit.pullChanges(target);
                    var filenames = repo_kit.getFileList(target);
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
*/

module.exports = router;
