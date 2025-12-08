const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const os = require('node:os');

require('dotenv').config()

/*-------middleware---------*/
const auth = require('./middleware/auth');
const allowRole = require('./middleware/role');
const Consultorio = require('./models/Consultorio');

const isProd = process.env.NODE_ENV === 'production'

const PORT = process.env.PORT || 4000
const MONGO_URI = isProd ? process.env.MONGO_URI_PROD : process.env.MONGO_URI_LOCAL
const JWT_SECRET = isProd ? process.env.JWT_SECRET_PROD : process.env.JWT_SECRET_LOCAL
const SERVER_URL = isProd ? process.env.SERVER_URL_PROD : process.env.SERVER_URL_LOCAL

const app = express();

const router = express.Router()
app.use(express.json());
app.use(cors());

console.log(os.hostname())

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

    res.json({token,rol});
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

const server = app.listen(PORT, ()=>{
    const address = server.address();
    console.log('Direccion: '+address.address)
    console.log('Servidor corriendo en '+SERVER_URL+':'+PORT)

});


