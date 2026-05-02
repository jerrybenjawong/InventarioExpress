// =======================================================
// ARCHIVO PRINCIPAL DE LA APLICACION - MiInventarioExpress
// Aqui configuramos Express, MongoDB, sesiones, Handlebars,
// Socket.io y todas las piezas del servidor
// Las credenciales de MongoDB estan hardcodeadas para
// proposito de la tarea (en produccion se usaria .env)
// =======================================================

const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const exphbs = require('express-handlebars');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const mongoose = require('mongoose');

// Importamos las rutas separadas por modulo
// Asi mantenemos el codigo organizado (patron MVC)
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

// =======================================================
// INICIALIZACION DE EXPRESS Y SOCKET.IO
// socket.io necesita un servidor HTTP para funcionar
// por eso envolvemos express en http.createServer()
// =======================================================
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// =======================================================
// CONEXION A MONGODB
// URL de conexion: apunta a MongoDB local en el puerto 27017
// Base de datos: mi_inventario_express
// Normalmente se usaria process.env.MONGO_URI desde un .env
// pero para la tarea lo dejamos hardcodeado
// =======================================================
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/mi_inventario_express';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error('Error de conexion MongoDB:', err));

// =======================================================
// CONFIGURACION DE HANDLEBARS (Motor de vistas)
// Usamos express-handlebars para renderizar HTML dinamico
// Layout principal: views/layouts/main.hbs
// Parciales (componentes reutilizables): views/partials/
// =======================================================
const hbs = exphbs.create({
  defaultLayout: 'main',              // Layout que envuelve todas las paginas
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  extname: '.hbs',                     // Extension de los archivos de vistas
  helpers: {
    // Helper eq: compara dos valores, util para condiciones en Handlebars
    eq: function (a, b) { return a === b; },
    // Helper formatDate: formatea una fecha en formato legible en espanol
    formatDate: function (date) {
      return new Date(date).toLocaleDateString('es-EC', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
  }
});

// Registramos Handlebars como motor de vistas para archivos .hbs
app.engine('.hbs', hbs.engine);
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// =======================================================
// MIDDLEWARE BASICO DE EXPRESS
// Estos se ejecutan en CADA peticion antes de llegar a las rutas
// =======================================================

// Permite que Express entienda JSON en el body de las peticiones
app.use(express.json());

// Permite leer datos de formularios HTML (application/x-www-form-urlencoded)
// extended: true permite objetos anidados en los datos del form
app.use(express.urlencoded({ extended: true }));

// Sirve archivos estaticos de la carpeta public/ (CSS, JS, imagenes)
app.use(express.static(path.join(__dirname, 'public')));

// Sirve las imagenes subidas por los usuarios desde /uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =======================================================
// CONFIGURACION DE SESIONES (express-session + connect-mongo)
// Las sesiones permiten mantener al usuario autenticado
// entre diferentes peticiones HTTP
// connect-mongo guarda las sesiones en MongoDB (no en memoria)
// Asi aunque reiniciemos el servidor, las sesiones persisten
// =======================================================
app.use(session({
  // Clave secreta para firmar la cookie de sesion
  // En produccion esto iria en una variable de entorno
  secret: 'mi_inventario_secret_key_2024',
  resave: false,              // No guardar sesion si no hubo cambios
  saveUninitialized: false,   // No guardar sesiones vacias (sin datos)
  // Donde guardamos las sesiones: en MongoDB
  store: MongoStore.create({
    mongoUrl: MONGO_URI,              // Misma base de datos de la app
    collectionName: 'sessions'        // Coleccion separada para sesiones
  }),
  cookie: {
    // La cookie expira despues de 24 horas de inactividad
    maxAge: 1000 * 60 * 60 * 24      // 24 horas en milisegundos
  }
}));

// =======================================================
// MENSAJES FLASH (connect-flash)
// Permite enviar mensajes temporales entre peticiones
// Ej: "Producto creado exitosamente" aparece una vez y desaparece
// =======================================================
app.use(flash());

// =======================================================
// MIDDLEWARE DE VARIABLES GLOBALES PARA LAS VISTAS
// Inyecta datos en TODAS las vistas automaticamente
// Asi no tenemos que pasar user, success_msg, etc en cada render
// =======================================================
app.use((req, res, next) => {
  // El usuario de la sesion (si esta logueado) disponible en todas las vistas
  res.locals.user = req.session.user || null;
  // Mensajes flash: se pasan a las vistas y luego se borran
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next(); // Continuamos al siguiente middleware o ruta
});

// =======================================================
// DEFINICION DE RUTAS
// Separamos las rutas por funcionalidad:
// /auth/*  -> login, registro, logout
// /products/* -> CRUD de productos
// /chat -> modulo de chat en tiempo real
// / -> pagina de inicio
// =======================================================

app.use('/auth', authRoutes);
app.use('/products', productRoutes);

// Ruta principal: pagina de inicio publica
app.get('/', (req, res) => {
  res.render('home', { title: 'MiInventarioExpress - Inicio' });
});

// Ruta del chat: requiere autenticacion
// Se verifica manualmente aqui (no usa el middleware isAuth)
app.get('/chat', (req, res) => {
  if (!req.session.user) {
    req.flash('error_msg', 'Debes iniciar sesion para acceder al chat');
    return res.redirect('/auth/login');
  }
  res.render('chat', { title: 'Chat en Vivo - MiInventarioExpress' });
});

// =======================================================
// SOCKET.IO - Chat en tiempo real
// Implementa un chat grupal donde los usuarios pueden
// enviar mensajes y ver quien esta conectado
// =======================================================

// Objeto que mapea ID de socket -> nombre de usuario
const chatUsers = {};

// Evento 'connection': se dispara cada vez que un cliente se conecta
io.on('connection', (socket) => {
  console.log('Nuevo cliente conectado:', socket.id);

  // Evento 'userJoined': el cliente envia su nombre de usuario al conectarse
  // Lo guardamos en chatUsers y avisamos a los demas que alguien se unio
  socket.on('userJoined', (username) => {
    // Validamos que el username no este vacio
    if (!username || !username.trim()) return;
    chatUsers[socket.id] = username;

    // socket.broadcast: envia a TODOS MENOS al que se conecto
    // Mensaje del sistema avisando que alguien entro al chat
    socket.broadcast.emit('chatMessage', {
      from: 'Sistema',
      text: `${username} se ha unido al chat`,
      time: new Date()
    });

    // io.emit: envia a TODOS (incluido el que se conecto)
    // Actualizamos la lista de usuarios conectados
    io.emit('userList', Object.values(chatUsers));
  });

  // Evento 'chatMessage': un usuario envia un mensaje
  socket.on('chatMessage', (message) => {
    // Obtenemos el nombre de usuario (o 'Anonimo' si no se registro)
    const username = chatUsers[socket.id] || 'Anónimo';

    // Reenviamos el mensaje a TODOS los clientes conectados
    // El cliente que lo envio tambien lo recibe para confirmar envio
    io.emit('chatMessage', {
      from: username,
      text: message,
      time: new Date()
    });
  });

  // Evento 'disconnect': se dispara cuando un cliente cierra la pagina
  socket.on('disconnect', () => {
    const username = chatUsers[socket.id];
    if (username) {
      // Eliminamos al usuario de la lista
      delete chatUsers[socket.id];

      // Avisamos a todos que alguien salio
      io.emit('chatMessage', {
        from: 'Sistema',
        text: `${username} ha salido del chat`,
        time: new Date()
      });

      // Actualizamos la lista de usuarios
      io.emit('userList', Object.values(chatUsers));
    }
  });
});

// =======================================================
// MANEJO DE ERRORES HTTP
// =======================================================

// 404 - Ruta no encontrada
// Este middleware se ejecuta si ninguna ruta anterior respondio
app.use((req, res) => {
  res.status(404).render('404', { title: 'Pagina no encontrada' });
});

// 500 - Error interno del servidor
// Este middleware captura errores no manejados
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error',
    message: 'Ocurrio un error en el servidor'
  });
});

// =======================================================
// INICIAR EL SERVIDOR
// Usamos server.listen (no app.listen) porque socket.io
// necesita acceso al servidor HTTP directamente
// Puerto por defecto: 3000
// =======================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Exportamos para posible uso en pruebas o modulos externos
module.exports = { app, server, io };