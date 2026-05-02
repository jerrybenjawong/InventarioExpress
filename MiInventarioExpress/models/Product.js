// =======================================================
// MODELO DE PRODUCTO - Mongoose Schema
// Aqui definimos la estructura de cada producto en MongoDB
// Campos: nombre, precio, descripcion, imagen
// =======================================================
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Nombre del producto: campo obligatorio, entre 3 y 100 caracteres
  nombre: {
    type: String,
    required: [true, 'El nombre del producto es obligatorio'],
    trim: true, // Elimina espacios al inicio y final
    minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
    maxlength: [100, 'El nombre no puede exceder 100 caracteres']
  },

  // Precio del producto: numero, obligatorio, no puede ser negativo
  precio: {
    type: Number,
    required: [true, 'El precio es obligatorio'],
    min: [0, 'El precio no puede ser negativo']
  },

  // Descripcion del producto: texto, obligatorio, entre 10 y 1000 caracteres
  descripcion: {
    type: String,
    required: [true, 'La descripcion es obligatoria'],
    trim: true,
    minlength: [10, 'La descripcion debe tener al menos 10 caracteres'],
    maxlength: [1000, 'La descripcion no puede exceder 1000 caracteres']
  },

  // Imagen del producto: string con la ruta, opcional (null si no se sube imagen)
  imagen: {
    type: String,
    default: null
  },

  // Fecha de creacion: se asigna automaticamente al insertar
  creadoEn: {
    type: Date,
    default: Date.now
  },

  // Fecha de ultima actualizacion: se actualiza cada vez que se modifica
  actualizadoEn: {
    type: Date,
    default: Date.now
  }
});

// Hook que se ejecuta ANTES de cada actualizacion (findOneAndUpdate)
// Actualiza el campo actualizadoEn con la fecha actual
productSchema.pre('findOneAndUpdate', function (next) {
  this.set({ actualizadoEn: new Date() });
  next();
});

// Exportamos el modelo para usarlo en las rutas
module.exports = mongoose.model('Product', productSchema);