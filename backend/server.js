require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) console.error('Error BD:', err);
    else console.log('Conectado a MySQL');
});

const SECRET_KEY = process.env.JWT_SECRET;

const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; 
    if (!token) return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token inválido o expirado.' });
        req.user = user; 
        next();
    });
};

const soloAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    next();
};

const validarRegistroBody = (req, res, next) => {
    const { username, email, password } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!username || username.trim().length < 3) return res.status(400).json({ error: 'Nombre inválido' });
    if (!email || !emailRegex.test(email)) return res.status(400).json({ error: 'Correo electrónico no válido' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    next();
};

app.post('/registro', validarRegistroBody, async (req, res) => {
    const { username, email, password } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error en el servidor' });
        if (results.length > 0) return res.status(400).json({ error: 'Este correo ya está registrado' });
        
        const insertQuery = 'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, "user")';
        db.query(insertQuery, [username, email, hashedPassword], (err, result) => {
            if (err) return res.status(500).json({ error: 'Error al registrar usuario' });
            res.json({ mensaje: 'Usuario registrado exitosamente', id: result.insertId });
        });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = 'SELECT * FROM users WHERE email = ?';
    
    db.query(query, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Error en el servidor' });
        if (results.length === 0) return res.status(401).json({ error: 'Usuario no registrado' });
        
        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);
        
        if (!validPassword) return res.status(401).json({ error: 'Contraseña incorrecta' });
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role }, 
            SECRET_KEY, 
            { expiresIn: '2h' }
        );
        
        res.json({ 
            token: token,
            usuario: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    });
});

app.get('/inventario', verificarToken, (req, res) => {
    db.query('SELECT * FROM tasks', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/inventario', verificarToken, soloAdmin, (req, res) => {
    const { nombre, detalles } = req.body; 
    if (!nombre || !detalles) return res.status(400).json({ error: 'Nombre y detalles son obligatorios' });

    const sql = 'INSERT INTO tasks (title, description, completed, user_id, created_at) VALUES (?, ?, 0, ?, NOW())';
    db.query(sql, [nombre.trim(), detalles.trim(), req.user.id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Prenda agregada al inventario', id: result.insertId });
    });
});

app.put('/inventario/:id', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;
    const { nombre, detalles } = req.body;
    if (!nombre || !detalles) return res.status(400).json({ error: 'Los campos no pueden estar vacíos' });

    const query = 'UPDATE tasks SET title = ?, description = ? WHERE id = ?';
    db.query(query, [nombre.trim(), detalles.trim(), id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al actualizar' });
        res.json({ mensaje: 'Prenda actualizada exitosamente' });
    });
});

app.delete('/inventario/:id', verificarToken, soloAdmin, (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM tasks WHERE id = ?', [id], (err, result) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar' });
        res.json({ mensaje: 'Prenda eliminada exitosamente' });
    });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Error en el servidor' });
});

app.listen(3000, () => console.log(`Servidor en http://localhost:3000`));