const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

//Conexion a MongoDB
mongoose.connect('mongodb://localhost:27017/agenda_consultorio')
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

    const token = jwt.sign({ id: usuario._id, rol: usuario.rol}, 'secreto',{ expiresIn: '1h'});
    res.json({token});
});

app.listen(4000, ()=>console.log('Servidor corriendo en http://localhost:4000'));


