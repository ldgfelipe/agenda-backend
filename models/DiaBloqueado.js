const mongoose = require('mongoose');
const diaBloqueadoSchema = new mongoose.Schema({
    fechaIso: { type: String, required: true, unique: true }, // Formato "YYYY-MM-DD"
    motivo: { type: String, default: 'No disponible' },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
});
module.exports = mongoose.model('DiaBloqueado', diaBloqueadoSchema);