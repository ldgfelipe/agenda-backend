// controllers/CitasController.js

const Cita = require('../models/Cita');
const Consultorio = require('../models/Consultorio'); // Para obtener el total de consultorios
 
/**
 * Obtiene la disponibilidad agregada (Ocupados/Disponibles) para un mes.
 * @param {string} mes - Año y mes (ej: '2025-12')
 */
exports.obtenerDisponibilidadMensual = async (req, res) => {
    console.log('carga lista de consultorios')
    try {
        const { year, month } = req.query; // Recibimos el año y mes desde Vue

        if (!year || !month) {
            return res.status(400).json({ error: 'Faltan parámetros de año y mes.' });
        }
        
        const fechaInicio = new Date(year, month - 1, 1);
        const fechaFin = new Date(year, month, 1); // El primero del mes siguiente

        const totalConsultorios = await Consultorio.countDocuments({ estado: 'activo' });
        
        // 🔑 AGREGACIÓN PARA CONTAR CITAS POR DÍA
        const citasPorDia = await Cita.aggregate([
            {
                $match: {
                    fechaHoraInicio: { $gte: fechaInicio, $lt: fechaFin },
                    estado: 'reservada'
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$fechaHoraInicio" } },
                    totalCitas: { $sum: 1 }
                }
            }
        ]);

        // Procesar los resultados
        const resultados = citasPorDia.reduce((acc, item) => {
            acc[item._id] = {
                ocupados: item.totalCitas,
                disponibles: totalConsultorios * 14 - item.totalCitas // Asumiendo 14 slots/día (8 a 21)
            };
            return acc;
        }, {});

        res.json({ totalConsultorios, disponibilidad: resultados });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 🔑 NUEVA FUNCIÓN: Obtiene las citas para un día específico
exports.obtenerCitasPorDia = async (req, res) => {
    try {
        const fechaISO = req.query.fecha; // Recibimos 'YYYY-MM-DD'

        if (!fechaISO) {
            return res.status(400).json({ error: 'Falta el parámetro de fecha.' });
        }

        const fechaInicio = new Date(fechaISO);
        // Ajustamos la hora a 00:00:00.000 (inicio del día)
        fechaInicio.setHours(0, 0, 0, 0); 

        const fechaFin = new Date(fechaISO);
        // Ajustamos la hora a 23:59:59.999 (fin del día)
        fechaFin.setHours(23, 59, 59, 999);

        // Buscar todas las citas reservadas para ese día
        const citas = await Cita.find({
            fechaHoraInicio: { 
                $gte: fechaInicio, 
                $lte: fechaFin 
            },
            estado: 'reservada'
        }).populate('consultorio', 'nombre'); // Opcional: Trae el nombre del consultorio

        res.json(citas);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// ... (Resto de las funciones: obtenerDisponibilidadMensual, etc.)