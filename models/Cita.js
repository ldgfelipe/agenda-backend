const mongoose = require('mongoose');

const CitaSchema = new mongoose.Schema({
    // Referencia al consultorio reservado
    consultorio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Consultorio', // Asumiendo que tu modelo se llama 'Consultorio'
        required: true
    },
    
    // 🔑 NUEVO CAMPO: Información del médico
    medico: {
        nombre: {
            type: String,
            required: true
        },
        especialidad: {
            type: String,
            required: true
        }
    },
    
    // Fecha y hora de inicio de la cita
    fechaHoraInicio: {
        type: Date,
        required: true
    },
    // Fecha y hora de fin de la cita (asumiendo citas de 1 hora)
    fechaHoraFin: {
        type: Date,
        required: true
    },
    // Datos del paciente/cita (puedes expandir esto después)
    paciente: {
        nombre: String,
        telefono: String
    },
    estado: {
        type: String,
        enum: ['reservada', 'cancelada', 'completada'],
        default: 'reservada'
    },
}, { timestamps: true });

// Índice para asegurar que no haya dos citas en el mismo consultorio a la misma hora
// Si tienes múltiples médicos, quizás quieras asegurar que no haya el mismo médico
// atendiendo en el mismo consultorio a la misma hora, pero por ahora nos centramos en el consultorio.
CitaSchema.index({ consultorio: 1, fechaHoraInicio: 1 }, { unique: true });

module.exports = mongoose.model('Cita', CitaSchema);