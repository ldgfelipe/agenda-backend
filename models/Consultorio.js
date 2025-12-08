const mongoose = require('mongoose');

const ConsultorioSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true},
    codigo: { type: String, required: true, unique: true, uppercase: true},
    ubicacion: { type: String, trim: true },
    estado: { type: String, enum: ['activo', 'inactivo'], default: 'activo' }, 
},{ tiemstamps:true})


module.exports = mongoose.model('Consultorio', ConsultorioSchema)