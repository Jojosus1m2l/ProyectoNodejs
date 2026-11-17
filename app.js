var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var apiAuthRouter = require('./controllers/api/auth');
var apiCatalogosRouter = require('./controllers/api/catalogos');
var apiRegistrosRouter = require('./controllers/api/registros');
var apiUsuariosRouter = require('./controllers/api/usuarios');

var app = express();

app.use(session({
	secret: process.env.SESSION_SECRET || 'secret',
	resave: false,
	saveUninitialized: false,
	cookie: {
		httpOnly: true,
		sameSite: 'lax'
	}
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
var BOOT_VERSION = Date.now().toString();

app.get('/__version', function(req, res) {
  res.type('text/plain').send(BOOT_VERSION);
});

app.get('/', function(req, res) {
  res.redirect('/vacunacion');
});

app.get('/vacunacion', function(req, res) {
  res.redirect('/vacunacion/index.html');
});
app.use('/vacunacion', express.static(path.join(__dirname, 'public', 'vacunacion')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', apiAuthRouter);
app.use('/api/catalogos', apiCatalogosRouter);
app.use('/api/registros', apiRegistrosRouter);
app.use('/api/usuarios', apiUsuariosRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// La aplicacion solo expone JSON y archivos estaticos.
app.use(function(err, req, res, next) {
  res.status(err.status || 500).json({
    error: err.status === 404 ? 'Ruta no encontrada.' : (err.message || 'Error interno.'),
    codigo: err.status === 404 ? 'NO_ENCONTRADA' : 'ERROR'
  });
});

module.exports = app;
