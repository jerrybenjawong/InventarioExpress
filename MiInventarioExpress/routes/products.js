// =======================================================
// RUTAS DE PRODUCTOS - CRUD completo (Create, Read, Update, Delete)
// Aqui manejamos todas las operaciones de productos
// Usamos Multer para la carga de imagenes
// Usamos express-validator para validar formularios
// =======================================================
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Product = require('../models/Product');

// =======================================================
// MIDDLEWARE: Verifica si el usuario esta autenticado
// Todas las rutas de productos requieren sesion activa
// =======================================================
const isAuth = (req, res, next) => {
  if (req.session.user) {
    return next();
  }
  req.flash('error_msg', 'Debes iniciar sesion para acceder');
  res.redirect('/auth/login');
};

// =======================================================
// CONFIGURACION DE MULTER - Para subida de imagenes
// Definimos donde se guardan y como se nombran los archivos
// Validamos tipo de archivo (solo imagenes) y tamano (max 5MB)
// =======================================================

// Configuramos el almacenamiento en disco
const storage = multer.diskStorage({
  // destination: carpeta donde se guardan las imagenes subidas
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  // filename: generamos un nombre unico para cada imagen
  // Usamos timestamp + numero random para evitar colisiones
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'product-' + uniqueSuffix + ext);
  }
});

// Filtro de archivos: solo permitimos imagenes
const fileFilter = (req, file, cb) => {
  // Tipos de archivo permitidos
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  // Verificamos la extension del archivo
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  // Verificamos el mimetype (tipo de contenido real del archivo)
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true); // Archivo valido
  } else {
    // Archivo no valido: mandamos error
    cb(new Error('Solo se permiten imagenes (jpeg, jpg, png, gif, webp)'), false);
  }
};

// Creamos la instancia de multer con toda la configuracion
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5 megabytes por archivo
  },
  fileFilter: fileFilter
});

// =======================================================
// GET /products - Lista todos los productos
// Carga los productos de MongoDB ordenados del mas reciente al mas antiguo
// Usamos .lean() para que Handlebars pueda leer los datos sin problemas
// =======================================================
router.get('/', isAuth, async (req, res) => {
  try {
    // Buscamos todos los productos y los ordenamos por fecha descendente
    // .lean() convierte los documentos de Mongoose a objetos planos de JS
    // Esto evita que Handlebars tenga problemas con getters/setters de Mongoose
    const products = await Product.find().sort({ creadoEn: -1 }).lean();
    res.render('products/list', {
      title: 'Productos - MiInventarioExpress',
      products
    });
  } catch (err) {
    console.error('Error al listar productos:', err);
    req.flash('error_msg', 'Error al cargar los productos');
    res.redirect('/');
  }
});

// =======================================================
// GET /products/create - Muestra el formulario para crear producto
// Solo cargamos la vista con el formulario vacio
// =======================================================
router.get('/create', isAuth, (req, res) => {
  res.render('products/create', { title: 'Nuevo Producto' });
});

// =======================================================
// POST /products/create - Procesa la creacion de un producto
// upload.single('imagen') procesa un solo archivo del campo 'imagen'
// Validamos: nombre (3-100 chars), precio (numero >=0), descripcion (10-1000 chars)
// =======================================================
router.post('/create', isAuth, upload.single('imagen'), [
  // Validacion del nombre
  body('nombre', 'El nombre debe tener entre 3 y 100 caracteres')
    .trim().isLength({ min: 3, max: 100 }),
  // Validacion del precio: debe ser un numero positivo o cero
  body('precio', 'El precio debe ser un numero valido no negativo')
    .isFloat({ min: 0 }),
  // Validacion de la descripcion
  body('descripcion', 'La descripcion debe tener entre 10 y 1000 caracteres')
    .trim().isLength({ min: 10, max: 1000 })
], async (req, res) => {
  // Revisamos si express-validator encontro errores
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Si hay errores, volvemos al formulario con los mensajes
    return res.render('products/create', {
      title: 'Nuevo Producto',
      errors: errors.array(),
      producto: req.body // Mantenemos lo que el usuario escribio
    });
  }

  try {
    const { nombre, precio, descripcion } = req.body;
    // Creamos el nuevo producto con los datos del formulario
    const product = new Product({
      nombre,
      precio: parseFloat(precio), // Convertimos a numero
      descripcion,
      // Si se subio imagen, guardamos la ruta relativa
      // Si no, queda null (valor por defecto en el modelo)
      imagen: req.file ? '/uploads/' + req.file.filename : null
    });

    // Guardamos en MongoDB
    await product.save();
    req.flash('success_msg', 'Producto creado exitosamente');
    res.redirect('/products');
  } catch (err) {
    console.error('Error al crear producto:', err);
    req.flash('error_msg', 'Error al crear el producto');
    res.redirect('/products/create');
  }
});

// =======================================================
// GET /products/edit/:id - Muestra el formulario de edicion
// Carga los datos actuales del producto desde MongoDB
// =======================================================
router.get('/edit/:id', isAuth, async (req, res) => {
  try {
    // Buscamos el producto por su ID
    // .lean() para que Handlebars lo lea sin problemas
    const product = await Product.findById(req.params.id).lean();
    if (!product) {
      req.flash('error_msg', 'Producto no encontrado');
      return res.redirect('/products');
    }
    // Renderizamos el formulario con los datos actuales
    res.render('products/edit', {
      title: 'Editar Producto',
      producto: product
    });
  } catch (err) {
    console.error('Error al cargar producto:', err);
    req.flash('error_msg', 'Error al cargar el producto');
    res.redirect('/products');
  }
});

// =======================================================
// POST /products/edit/:id - Procesa la actualizacion de un producto
// Similar al create, pero actualiza en vez de insertar
// Si se sube una nueva imagen, reemplaza la anterior
// =======================================================
router.post('/edit/:id', isAuth, upload.single('imagen'), [
  body('nombre', 'El nombre debe tener entre 3 y 100 caracteres')
    .trim().isLength({ min: 3, max: 100 }),
  body('precio', 'El precio debe ser un numero valido no negativo')
    .isFloat({ min: 0 }),
  body('descripcion', 'La descripcion debe tener entre 10 y 1000 caracteres')
    .trim().isLength({ min: 10, max: 1000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Si hay errores, recargamos el producto para mantener la imagen actual
    const product = await Product.findById(req.params.id).lean();
    return res.render('products/edit', {
      title: 'Editar Producto',
      errors: errors.array(),
      producto: { ...req.body, _id: req.params.id, imagen: product ? product.imagen : null }
    });
  }

  try {
    const { nombre, precio, descripcion } = req.body;
    // Datos que vamos a actualizar
    const updateData = {
      nombre,
      precio: parseFloat(precio),
      descripcion,
      actualizadoEn: new Date() // Marcamos la fecha de actualizacion
    };

    // Si se subio una nueva imagen, la agregamos a los datos de actualizacion
    if (req.file) {
      updateData.imagen = '/uploads/' + req.file.filename;
    }
    // Si no se subio imagen, mantenemos la que ya tenia (no se modifica el campo)

    // findByIdAndUpdate: busca por ID y actualiza
    // { new: true } devuelve el documento actualizado (no el viejo)
    // { runValidators: true } ejecuta las validaciones del schema
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      req.flash('error_msg', 'Producto no encontrado');
      return res.redirect('/products');
    }

    req.flash('success_msg', 'Producto actualizado exitosamente');
    res.redirect('/products');
  } catch (err) {
    console.error('Error al actualizar producto:', err);
    req.flash('error_msg', 'Error al actualizar el producto');
    res.redirect('/products');
  }
});

// =======================================================
// POST /products/delete/:id - Elimina un producto
// Usamos POST en vez de GET por seguridad (los GET no deberian modificar datos)
// El formulario en la vista usa method-override con POST
// =======================================================
router.post('/delete/:id', isAuth, async (req, res) => {
  try {
    // findByIdAndDelete: busca y elimina en una sola operacion
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      req.flash('error_msg', 'Producto no encontrado');
      return res.redirect('/products');
    }
    req.flash('success_msg', 'Producto eliminado exitosamente');
    res.redirect('/products');
  } catch (err) {
    console.error('Error al eliminar producto:', err);
    req.flash('error_msg', 'Error al eliminar el producto');
    res.redirect('/products');
  }
});

// =======================================================
// MANEJO DE ERRORES DE MULTER
// Si multer falla (archivo muy grande, tipo no permitido, etc.)
// capturamos el error aqui y mostramos mensaje al usuario
// =======================================================
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Error especifico de Multer
    if (err.code === 'LIMIT_FILE_SIZE') {
      req.flash('error_msg', 'El archivo es demasiado grande (maximo 5MB)');
    } else {
      req.flash('error_msg', 'Error al subir el archivo: ' + err.message);
    }
    return res.redirect(req.originalUrl);
  }
  // Error del fileFilter (tipo no permitido)
  if (err.message) {
    req.flash('error_msg', err.message);
    return res.redirect(req.originalUrl);
  }
  next(err);
});

module.exports = router;