// routes/citasRoutes.js

const express = require('express');
const router = express.Router();
const citasController = require('../controllers/CitasController');

// 🔑 NUEVA RUTA
// Ejemplo: GET /api/citas/disponibilidad?year=2025&month=12
router.get('/citas/disponibilidad', citasController.obtenerDisponibilidadMensual);

module.exports = router;