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
        tipo:{
            type:String,
            required:false
        },
        id: {
            type: String,
            required: false
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
        required: false
    },
    // Datos del paciente/cita (puedes expandir esto después)
    paciente: {
        nombre:{
            type: String,
            require:true
        },
        telefono:{
            type: String,
            require:false
        },
        correo:{
            type: String,
            require:false
        },
        notas:{
            type:String,
            require:false
        }
    },
    costo:{
        type:String,
        require:false
    },
    estado: {
        type: String,
        enum: ['pendiente','confirmada','reservada', 'cancelada', 'completada'],
        default: 'pendiente'
    },
}, { timestamps: true });

// Índice para asegurar que no haya dos citas en el mismo consultorio a la misma hora
// Si tienes múltiples médicos, quizás quieras asegurar que no haya el mismo médico
// atendiendo en el mismo consultorio a la misma hora, pero por ahora nos centramos en el consultorio.
CitaSchema.index({ consultorio: 1, fechaHoraInicio: 1 }, { unique: true });

module.exports = mongoose.model('Cita', CitaSchema);