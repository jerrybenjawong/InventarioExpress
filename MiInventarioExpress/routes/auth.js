// =======================================================
// RUTAS DE AUTENTICACION - Login, Registro, Logout
// Aqui manejamos todo el flujo de sesiones de usuario
// Usamos express-session para guardar la sesion en MongoDB
// Usamos bcrypt para comparar contrasenas (nunca en texto plano)
// Usamos express-validator para validar los formularios
// =======================================================
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

// =======================================================
// MIDDLEWARE: Verifica si el usuario YA esta autenticado
// Lo usamos en rutas que requieren sesion activa
// =======================================================
const isAuth = (req, res, next) => {
  // req.session.user existe solo si el usuario inicio sesion
  // (express-session lo guarda en MongoDB automaticamente)
  if (req.session.user) {
    return next(); // Tiene sesion, continua a la ruta
  }
  // Flash: mensaje que se muestra una sola vez y luego desaparece
  req.flash('error_msg', 'Debes iniciar sesion para acceder');
  res.redirect('/auth/login');
};

// =======================================================
// MIDDLEWARE: Verifica si el usuario NO esta autenticado
// Lo usamos en login/registro para evitar que un usuario
// con sesion activa vuelva a loguearse
// =======================================================
const isNotAuth = (req, res, next) => {
  if (!req.session.user) {
    return next(); // No tiene sesion, puede ir a login/registro
  }
  // Ya tiene sesion, lo mandamos a productos directamente
  res.redirect('/products');
};

// =======================================================
// GET /auth/login - Muestra el formulario de inicio de sesion
// Solo accesible si NO estas autenticado (isNotAuth)
// =======================================================
router.get('/login', isNotAuth, (req, res) => {
  res.render('login', {
    title: 'Iniciar Sesion - MiInventarioExpress'
  });
});

// =======================================================
// POST /auth/login - Procesa el inicio de sesion
// Validamos username y password con express-validator
// Comparamos la contrasena con bcrypt (contra el hash en DB)
// Si todo esta bien, guardamos el usuario en la sesion
// =======================================================
router.post('/login', isNotAuth, [
  // Validamos que el username no este vacio
  body('username', 'El usuario es obligatorio').trim().notEmpty(),
  // Validamos que la contrasena no este vacia
  body('password', 'La contrasena es obligatoria').notEmpty()
], async (req, res) => {
  // Revisamos si hay errores de validacion
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Hay errores: volvemos al formulario con los mensajes
    return res.render('login', {
      title: 'Iniciar Sesion - MiInventarioExpress',
      errors: errors.array(),
      username: req.body.username
    });
  }

  try {
    const { username, password } = req.body;

    // Buscamos el usuario en MongoDB por username
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      // Usuario no encontrado (no decimos si fallo usuario o contrasena por seguridad)
      req.flash('error_msg', 'Usuario o contrasena incorrectos');
      return res.redirect('/auth/login');
    }

    // Comparamos la contrasena ingresada con el hash guardado
    // Usamos el metodo comparePassword que definimos en el modelo User
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Contrasena incorrecta
      req.flash('error_msg', 'Usuario o contrasena incorrectos');
      return res.redirect('/auth/login');
    }

    // CREDENCIALES CORRECTAS: Guardamos datos del usuario en la sesion
    // Esto es lo que luego revisa el middleware isAuth
    req.session.user = {
      id: user._id,
      username: user.username,
      role: user.role
    };

    // Mensaje de exito (flash: aparece una vez y se borra)
    req.flash('success_msg', 'Has iniciado sesion correctamente');
    res.redirect('/products');
  } catch (err) {
    console.error('Error en login:', err);
    req.flash('error_msg', 'Error al iniciar sesion');
    res.redirect('/auth/login');
  }
});

// =======================================================
// GET /auth/register - Muestra el formulario de registro
// Solo accesible si NO estas autenticado
// =======================================================
router.get('/register', isNotAuth, (req, res) => {
  res.render('register', {
    title: 'Registrarse - MiInventarioExpress'
  });
});

// =======================================================
// POST /auth/register - Procesa el registro de nuevo usuario
// Validamos: username 3+ caracteres, password 6+ caracteres,
// y que las dos contrasenas coincidan
// =======================================================
router.post('/register', isNotAuth, [
  // El username debe tener al menos 3 caracteres
  body('username', 'El usuario debe tener al menos 3 caracteres')
    .trim().isLength({ min: 3 }),
  // La contrasena debe tener al menos 6 caracteres
  body('password', 'La contrasena debe tener al menos 6 caracteres')
    .isLength({ min: 6 }),
  // Las dos contrasenas deben coincidir
  body('password2', 'Las contrasenas no coinciden')
    .custom((value, { req }) => value === req.body.password)
], async (req, res) => {
  // Revisamos errores de validacion
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('register', {
      title: 'Registrarse - MiInventarioExpress',
      errors: errors.array(),
      username: req.body.username
    });
  }

  try {
    const { username, password } = req.body;

    // Verificamos si el usuario ya existe en la base de datos
    const existingUser = await User.findOne({ username: username.toLowerCase() });
    if (existingUser) {
      req.flash('error_msg', 'El usuario ya existe');
      return res.redirect('/auth/register');
    }

    // Creamos el nuevo usuario (la contrasena se hashea automaticamente
    // gracias al middleware 'pre save' definido en el modelo User)
    const user = new User({
      username: username.toLowerCase(),
      password: password, // No la hasheamos aqui, el modelo lo hace
      role: 'user' // Por defecto todos son 'user', no 'admin'
    });

    await user.save();

    req.flash('success_msg', 'Registro exitoso. Ahora puedes iniciar sesion');
    res.redirect('/auth/login');
  } catch (err) {
    console.error('Error en registro:', err);
    req.flash('error_msg', 'Error al registrarse');
    res.redirect('/auth/register');
  }
});

// =======================================================
// GET /auth/logout - Cierra la sesion del usuario
// Destruye la sesion en MongoDB y borra la cookie
// Luego redirige al home
// =======================================================
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesion:', err);
      return res.redirect('/');
    }
    res.clearCookie('connect.sid');
    // Eliminamos el flash porque ya no hay sesión
    res.redirect('/auth/login'); // O a '/' según prefieras
  });
});

module.exports = router;