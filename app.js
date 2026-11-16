var createError = require('http-errors');
var express = require('express');
var session = require('express-session');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var productosRouter = require('./controllers/productos');
var clientesRouter = require('./controllers/clientes');
var proveedorRouter = require('./controllers/proveedor');
var loginRouter = require('./controllers/login');
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

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
var BOOT_VERSION = Date.now().toString();

app.get('/__version', function(req, res) {
  res.type('text/plain').send(BOOT_VERSION);
});

app.get('/vacunacion', function(req, res) {
  res.redirect('/vacunacion/index.html');
});
app.use('/vacunacion', express.static(path.join(__dirname, 'public', 'vacunacion')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/productos', productosRouter);
app.use('/clientes', clientesRouter);
app.use('/proveedor', proveedorRouter);
app.use('/api/auth', apiAuthRouter);
app.use('/api/catalogos', apiCatalogosRouter);
app.use('/api/registros', apiRegistrosRouter);
app.use('/api/usuarios', apiUsuariosRouter);
app.use('/', loginRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // Las rutas /api responden JSON; el resto conserva la vista de error.
  if (req.path === '/api' || req.path.indexOf('/api/') === 0) {
    return res.status(err.status || 500).json({
      error: err.status === 404 ? 'Ruta no encontrada.' : (err.message || 'Error interno.'),
      codigo: err.status === 404 ? 'NO_ENCONTRADA' : 'ERROR'
    });
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
