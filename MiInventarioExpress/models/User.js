// =======================================================
// MODELO DE USUARIO - Mongoose Schema
// Aqui definimos la estructura de cada usuario en MongoDB
// Campos: username, password (hasheada con bcrypt)
// =======================================================
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  // Nombre de usuario: obligatorio, unico, entre 3 y 30 caracteres
  username: {
    type: String,
    required: [true, 'El nombre de usuario es obligatorio'],
    unique: true, // No puede haber dos usuarios con el mismo username
    trim: true,
    minlength: [3, 'El usuario debe tener al menos 3 caracteres'],
    maxlength: [30, 'El usuario no puede exceder 30 caracteres']
  },

  // Contrasena: se guarda encriptada con bcrypt (nunca en texto plano)
  password: {
    type: String,
    required: [true, 'La contrasena es obligatoria'],
    minlength: [6, 'La contrasena debe tener al menos 6 caracteres']
  },

  // Rol del usuario: 'admin' o 'user' (por defecto 'user')
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },

  // Fecha de creacion de la cuenta
  creadoEn: {
    type: Date,
    default: Date.now
  }
});

// =======================================================
// MIDDLEWARE DE MONGOOSE - Se ejecuta ANTES de guardar
// Aqui es donde hasheamos la contrasena con bcrypt
// Solo la hasheamos si fue modificada (ej: al registrarse)
// =======================================================
userSchema.pre('save', async function (next) {
  // Si la contrasena no fue modificada, no hacemos nada
  if (!this.isModified('password')) {
    return next();
  }

  try {
    // Generamos un salt de 10 rondas (mas rondas = mas seguro pero mas lento)
    const salt = await bcrypt.genSalt(10);
    // Hasheamos la contrasena con el salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// =======================================================
// METODO DEL MODELO - Compara una contrasena en texto plano
// con el hash guardado en la base de datos
// Se usa en el login para verificar credenciales
// =======================================================
userSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare toma el texto plano, lo hashea y lo compara con el hash guardado
  return await bcrypt.compare(candidatePassword, this.password);
};

// Exportamos el modelo
module.exports = mongoose.model('User', userSchema);