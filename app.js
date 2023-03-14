var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var debug = require('debug')('jurism-updater:server');

var index = require('./routes/index');
var admin = require('./routes/admin');
var refresh = require('./routes/refresh');
var rebuild = require('./routes/rebuild');
var report = require('./routes/report');
var updated = require('./routes/updated');
var keyreturn = require('./routes/keyreturn');
var code = require('./routes/code');
var metadata = require('./routes/metadata');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
//app.use(bodyParser.text({type: '*/*'}));
//app.use(bodyParser.json());
//app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/updater/styles', express.static(path.join(__dirname, 'jm-styles'), {
    setHeaders: function(res, path, stat) {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Vary", "Accept-Encoding");
        if (res.req.query.install) {
            res.set("Content-Type", "application/vnd.citationstyles.style+xml");
        } else {
            res.set("Content-Type", "application/octet-stream");
        }
    }
}));

app.use('/updater', express.static(path.join(__dirname, 'public')));


app.use('/updater/admin', admin);
app.use('/updater/report', report);
app.use('/updater/rebuild', rebuild);
app.use('/updater/refresh', refresh);
app.use('/updater/updated', updated);
app.use('/updater/keyreturn', keyreturn);
app.use('/updater/code', code);
app.use('/updater/metadata', metadata);
app.use('/updater', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
