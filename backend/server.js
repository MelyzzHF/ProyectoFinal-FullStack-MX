require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: "FERxim44", 
    database: 'gestor_tareas'
});

db.connect(err => {
    if (err) console.error('Error BD:', err);
    else console.log('Conectado a MySQL');
});

const SECRET_KEY = 'secreto_super_seguro';

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0 || results[0].password !== password) {
            return res.status(401).json({ error: 'Credenciales incorrectas' });
        }

        const user = results[0];
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '2h' });
        
        res.json({ mensaje: 'Login exitoso', token });
    });
});

app.post('/inventario', (req, res) => {
    const { nombre, detalles } = req.body; 
    
    const sql = 'INSERT INTO tasks (title, description, completed, user_id, created_at) VALUES (?, ?, 0, 1, NOW())';
    
    db.query(sql, [nombre, detalles], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ mensaje: 'Prenda agregada al inventario', id: result.insertId });
    });
});

app.get('/inventario', (req, res) => {
    db.query('SELECT * FROM tasks', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.listen(3000, () => {
    console.log('Servidor listo en http://localhost:3000');
});
