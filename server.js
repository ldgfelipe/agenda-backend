const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const os = require('node:os');

// 🔑 NUEVO: Importación de módulos para Socket.IO
const http = require('http'); 
const { Server } = require("socket.io");

require('dotenv').config()

/*-------middleware---------*/
const auth = require('./middleware/auth');
const allowRole = require('./middleware/role');
const Consultorio = require('./models/Consultorio');
const hostname=os.hostname();

const isProd = hostname==='srv1180506' ? 'prod' : 'dev'

const PORT = process.env.PORT || 4000
const MONGO_URI = isProd === 'prod' ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_LOCAL
const JWT_SECRET =  isProd === 'prod' ? process.env.JWT_SECRET_PROD : process.env.JWT_SECRET_LOCAL
const SERVER_URL =  isProd === 'prod' ? process.env.SERVER_URL_PROD : process.env.SERVER_URL_LOCAL

const app = express();

const router = express.Router()
app.use(express.json());
app.use(cors());

// ----------------------------------------------------
// 🔑 1. CONFIGURACIÓN DE SOCKET.IO Y SERVIDOR HTTP
// ----------------------------------------------------

// Creamos un servidor HTTP a partir de la aplicación Express
const server = http.createServer(app); 

// Inicializamos Socket.IO adjunto al servidor HTTP
const io = new Server(server, {
    cors: {
        // 🔑 IMPORTANTE: Reemplaza con el ORIGEN de tu aplicación Vue (ej. http://localhost:8080)
        origin: "http://localhost:8080", 
        methods: ["GET", "POST"]
    }
});

// Manejo de conexiones Socket.IO (Opcional, pero bueno para el debugging)
io.on('connection', (socket) => {
    // console.log('Usuario conectado a Socket.IO');
});

// ----------------------------------------------------

//Conexion a MongoDB
mongoose.connect(MONGO_URI+'/agenda_consultorio')
.then(()=>console.log('MongoDB Conectado'))
.catch(err => console.error(err));


const UsuarioSchema = new mongoose.Schema({
    nombre:String,
    email:{type:String, unique:true},
    password:String,
    rol:String
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);
const Cita = require('./models/Cita'); // <--- ¡AÑADIR ESTA LÍNEA!


//Registro
app.post('/register',async (req, res)=>{
    const {nombre, email, password, rol}=req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const nuevoUsuario = new Usuario({nombre, email, password:hashedPassword, rol});
    await nuevoUsuario.save();
    res.json({message: 'Usuario registrado'});
});

//login

app.post('/login', async (req, res) => {
  
    const {email, password }=req.body;
    const usuario = await Usuario.findOne({ email });
    if(!usuario) return res.status(400).json({ error: 'Usuario no encontrado'});


    const valido = await bcrypt.compare(password, usuario.password);


    if(!valido) return res.status(400).json({ error: 'Contraseña incorrecta'});

    const token = jwt.sign({ id: usuario._id, rol: usuario.rol}, JWT_SECRET,{ expiresIn: '1h'});
    const rol = usuario.rol
    const nombre = usuario.nombre
      const id = usuario._id

    res.json({token,rol,nombre,id});
});


///Crea consultorio (Solo Admin)
app.post('/consultorios', auth, allowRole('admin'), async (req, res)=>{
    const {nombre, codigo, ubicacion, estado } = req.body
    if(!nombre || !codigo) return res.status(400).json({ error: 'Nombre y Código son requeridos'});

    try{
        const nuevo = await Consultorio.create({ nombre, codigo, ubicacion, estado })
        res.status(201).json(nuevo)

    }catch(err){        
        if(err.code === 11000) return res.status(409).json({
            error: 'Código duplicado'
        })
        res.status(500).json({ error: 'Error al crear consultorio'})
    }
})

app.get('/consultorios', auth, async(req, res)=>{
    const items = await Consultorio.find().sort({ nombre:1 })
    res.json(items)
})

// --- CITAS MÉDICAS ---

// 🔑 NUEVA RUTA: GET /api/citas/disponibilidad?year=2025&month=12
// Obtiene la disponibilidad agregada (Ocupados/Disponibles) para un mes.
app.get('/citas/disponibilidad', auth, async (req, res) => {
    try {
        const { year, month } = req.query; // Recibimos el año y mes desde Vue

        if (!year || !month) {
            return res.status(400).json({ error: 'Faltan parámetros de año y mes.' });
        }
        
        // Convertir mes y año a fechas de inicio y fin del mes
        const fechaInicio = new Date(year, month - 1, 1);
        const fechaFin = new Date(year, month, 1); // El primero del mes siguiente

        // Obtener el total de consultorios activos
        const totalConsultorios = await Consultorio.countDocuments({ estado: 'activo' });
        
        if (totalConsultorios === 0) {
            return res.json({ totalConsultorios: 0, disponibilidad: {} });
        }

        // AGREGACIÓN: Contar citas reservadas por día
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

        // Procesar resultados para el formato Ocupados/Disponibles
        // Asumiendo 14 slots/día (8:00 a 21:00) por cada consultorio
        const SLOTS_POR_CONSULTORIO_DIA = 14; 
        const MAX_SLOTS_DIARIOS = totalConsultorios * SLOTS_POR_CONSULTORIO_DIA;

        const resultados = citasPorDia.reduce((acc, item) => {
            const ocupados = item.totalCitas;
            acc[item._id] = {
                ocupados: ocupados,
                disponibles: Math.max(0, MAX_SLOTS_DIARIOS - ocupados) 
            };
            return acc;
        }, {});

        res.json({ totalConsultorios, disponibilidad: resultados });

    } catch (error) {
        console.error('Error al obtener disponibilidad mensual:', error);
        res.status(500).json({ error: 'Error al obtener disponibilidad: ' + error.message });
    }
});

// server.js

// ... (después de app.get('/consultorios', ...))

// 🔑 NUEVA RUTA: Actualizar un consultorio por su ID
// Método: PUT para actualizar el recurso
app.post('/editconsultorios/:id', auth, allowRole('admin'), async (req, res) => {
    console.log('carga c')
    try {
        const { id } = req.params;
        const { nombre, codigo, ubicacion, estado } = req.body;

        // Validar que al menos un campo esté presente para actualizar
        if (!nombre && !codigo && !ubicacion && !estado) {
            return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar.' });
        }

        const consultorioActualizado = await Consultorio.findByIdAndUpdate(
            id,
            { $set: { nombre, codigo, ubicacion, estado } }, // Usar $set para actualizar solo los campos proporcionados
            { new: true, runValidators: true } // new: true devuelve el documento actualizado
        );

        if (!consultorioActualizado) {
            return res.status(404).json({ error: 'Consultorio no encontrado.' });
        }

        res.json(consultorioActualizado);

    } catch (err) {
        // Manejar errores de validación de Mongoose o código duplicado (11000)
        if (err.code === 11000) {
            return res.status(409).json({ error: 'Código duplicado. Ya existe otro consultorio con ese código.' });
        }
        res.status(500).json({ error: 'Error al actualizar el consultorio: ' + err.message });
    }
});

// Método: DELETE
app.delete('/consultorios/:id', auth, allowRole('admin'), async (req, res) => {
    try {
        const { id } = req.params;

        // Utilizamos findByIdAndDelete de Mongoose para encontrar y eliminar
        const consultorioEliminado = await Consultorio.findByIdAndDelete(id);

        if (!consultorioEliminado) {
            // Si no se encuentra el consultorio con ese ID
            return res.status(404).json({ error: 'Consultorio no encontrado para eliminar.' });
        }

        // 200 OK con un mensaje de éxito o el objeto eliminado
        res.json({ message: 'Consultorio eliminado con éxito.', consultorio: consultorioEliminado });

    } catch (err) {
        // Manejar errores de servidor
        res.status(500).json({ error: 'Error al intentar eliminar el consultorio: ' + err.message });
    }
});


// 🔑 NUEVA RUTA: GET /api/citas/dia?fecha=YYYY-MM-DD
// Obtiene el detalle de las citas para un día específico (Necesario para el popup de horarios)
app.get('/citas/dia', auth, async (req, res) => {
    try {
        const fechaISO = req.query.fecha; // Recibimos 'YYYY-MM-DD'

        if (!fechaISO) {
            return res.status(400).json({ error: 'Falta el parámetro de fecha.' });
        }

     // 1. Iniciar en la medianoche (00:00:00) del día en UTC
        const fechaInicio = new Date(fechaISO); 
        // Si el ISO no tiene hora (ej: "2025-12-14"), se interpreta como 2025-12-14T00:00:00.000Z

        // 2. Finalizar al inicio del día siguiente en UTC
        const fechaFin = new Date(fechaInicio);
        fechaFin.setUTCDate(fechaFin.getUTCDate() + 1); // Avanza un día en UTC
     
        // Buscar todas las citas reservadas para ese día, trayendo el nombre del consultorio
        const citas = await Cita.find({
            fechaHoraInicio: { 
                $gte: fechaInicio, 
                $lte: fechaFin 
            },
            estado: 'pendiente'
        }).populate('consultorio', 'nombre'); // Importante para saber qué consultorio está ocupado
      
        res.json(citas);
    } catch (error) {
        console.error('Error al obtener detalle de citas por día:', error);
        res.status(500).json({ error: 'Error al obtener citas: ' + error.message });
    }
});

// 🔑 RUTA POST: Crear una nueva cita
app.post('/citas', auth, allowRole('admin', 'medico'), async (req, res) => {
    try {
        // Desestructurar los datos enviados por el frontend (citaPayload)
        const {
            consultorio,
            medico,
            pacienteNombre,
            pacienteNotas,
            pacienteCorreo,
            pacienteTelefono,
            costoConsulta,
            fechaHoraInicio, // Viene como ISO string
            estado
        } = req.body;

        // 1. Validación de Datos Esenciales
        if (!consultorio || !medico || !pacienteNombre || !fechaHoraInicio || costoConsulta === undefined) {
            return res.status(400).json({ 
                error: 'Faltan campos obligatorios: consultorio, médico, nombre del paciente, fecha/hora o costo.' 
            });
        }
        
        // 2. Validación de Superposición (Opcional pero muy recomendado)
        // Debes asegurarte de que no haya otra cita para ese consultorio/médico a esa hora.
        // Ejemplo simple: buscar citas que comiencen exactamente a la misma hora para ese consultorio.
        const superposicion = await Cita.findOne({
            consultorio,
            fechaHoraInicio: new Date(fechaHoraInicio), // Comparamos la fecha exacta
            estado: { $ne: 'cancelada' } // Ignorar citas canceladas
        });

        if (superposicion) {
            return res.status(409).json({
                error: 'Conflicto de horario. Ya existe una reserva para ese consultorio en la hora seleccionada.'
            });
        }

        // 3. Crear la nueva instancia de Cita
        const nuevaCita = new Cita({
            consultorio,
            medico,
            pacienteNombre,
            pacienteNotas,
            pacienteCorreo,
            pacienteTelefono,
            costoConsulta,
            fechaHoraInicio: new Date(fechaHoraInicio), // Convertir ISO string a Date
            estado: estado || 'pendiente',
            creadoPor: req.user.id // Asume que 'auth' añade req.user
        });

        // 4. Guardar la cita en la base de datos
        const citaGuardada = await nuevaCita.save();
// ----------------------------------------------------
        // 🔑 5. IMPLEMENTACIÓN DE SOCKET.IO: Emitir actualización
        // ----------------------------------------------------
        const fechaISO = citaGuardada.fechaHoraInicio.toISOString().substring(0, 10);
        
        // Emitir un evento a todos los clientes conectados.
        // El frontend escuchará 'cita:actualizada' y recargará.
        io.emit('cita:actualizada', { 
            message: 'Nueva cita reservada',
            fechaISO: fechaISO // Enviamos la fecha para recargar solo si es necesario
        });
        // ----------------------------------------------------


        // 6. Respuesta exitosa
        res.status(201).json({ 
            message: 'Cita creada con éxito', 
            cita: citaGuardada 
        });

    } catch (err) {
        console.error("Error al crear la cita:", err);
        // Manejar errores de Mongoose (ej. validación, IDs inválidos)
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        res.status(500).json({ error: 'Error interno del servidor al procesar la cita.' });
    }
});


server.listen(PORT, ()=>{
    const address = server.address();
    console.log('Direccion: '+address.address)
    // Usamos el log del SERVER_URL para mantener tu lógica existente
    console.log('Servidor HTTP y Socket.IO corriendo en '+SERVER_URL+':'+PORT)
});




