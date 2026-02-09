require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: "", 
    database: 'gestor_tareas'
});

db.connect(err => {
    if (err) console.error('Error BD:', err);
    else console.log('Conectado a MySQL');
});

// Registro de nuevos usuarios
app.post('/registro', (req, res) => {
    const { username, email, password } = req.body;
    
    // Validar que no falten campos
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    
    // Verificar si el email ya existe
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error en el servidor' });
        }
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Este correo ya está registrado' });
        }
        
        // Insertar nuevo usuario
        const insertQuery = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
        db.query(insertQuery, [username, email, password], (err, result) => {
            if (err) {
                return res.status(500).json({ error: 'Error al registrar usuario' });
            }
            
            res.json({ 
                mensaje: 'Usuario registrado exitosamente',
                id: result.insertId 
            });
        });
    });
});

const SECRET_KEY = 'secreto_super_seguro';

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ error: 'Error en el servidor' });
        }
        
        if (results.length === 0 || results[0].password !== password) {
            return res.status(401).json({ error: 'Usuario no registrado o contraseña incorrecta' });
        }
        
        const user = results[0];
        
        // Generar token JWT real
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email,
                username: user.username
            }, 
            SECRET_KEY, 
            { expiresIn: '2h' }
        );
        
        res.json({ 
            token: token,
            usuario: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
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

app.put('/inventario/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, detalles } = req.body;
    
    const query = 'UPDATE tasks SET title = ?, description = ? WHERE id = ?';
    db.query(query, [nombre, detalles, id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error al actualizar prenda' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Prenda no encontrada' });
        }
        
        res.json({ mensaje: 'Prenda actualizada exitosamente' });
    });
});

app.delete('/inventario/:id', (req, res) => {
    const { id } = req.params;
    
    const query = 'DELETE FROM tasks WHERE id = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error al eliminar prenda' });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Prenda no encontrada' });
        }
        
        res.json({ mensaje: 'Prenda eliminada exitosamente' });
    });
});


app.listen(3000, () => {
    console.log('Servidor listo en http://localhost:3000');
});