const jwt = require('jsonwebtoken');

const isProd = process.env.NODE_ENV === 'production'
const JWT_SECRET = isProd ? process.env.JWT_SECRET_PROD : process.env.JWT_SECRET_LOCAL


console.log('Auth '+JWT_SECRET)
module.exports = (req, res, next) => {
    const authHeader = req.headers['authorization']
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    if(!token) return res.status(401).json({ error:'Token requerido'})
        try{
    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = decoded // { id, rol }
    next()
        }catch (err){
            res.status(401).json({ error: 'Token invalido'})
        }
}