require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); // Usamos promesas para mejor manejo asíncrono
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Exponer la carpeta uploads para que el frontend pueda ver las imágenes
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuración de Multer para guardar imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'));
    }
});
const upload = multer({ storage });

// Conexión a Base de Datos (Pool de conexiones)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const SECRET_KEY = process.env.JWT_SECRET;

// ==========================================
// MIDDLEWARES OBLIGATORIOS
// ==========================================
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
        return res.status(403).json({ error: 'Acceso denegado. Permisos de administrador requeridos.' });
    }
    next();
};

const validarRegistro = (req, res, next) => {
    const { fullName, email, password } = req.body;
    if (!fullName || fullName.length < 3) return res.status(400).json({ error: 'Nombre inválido' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Correo inválido' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Contraseña mínima de 6 caracteres' });
    next();
};

// ==========================================
// RUTAS DE AUTENTICACIÓN
// ==========================================
app.post('/api/auth/register', validarRegistro, async (req, res, next) => {
    try {
        const { fullName, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [existing] = await pool.query('SELECT * FROM accounts WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'El correo ya está registrado' });
        
        const [result] = await pool.query(
            'INSERT INTO accounts (full_name, email, password_hash, role) VALUES (?, ?, ?, "user")',
            [fullName, email, hashedPassword]
        );
        res.status(201).json({ mensaje: 'Cuenta creada exitosamente', id: result.insertId });
    } catch (error) { next(error); }
});

app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const [results] = await pool.query('SELECT * FROM accounts WHERE email = ?', [email]);
        
        if (results.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });
        
        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Credenciales incorrectas' });
        
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            SECRET_KEY,
            { expiresIn: '4h' }
        );
        
        res.json({
            token,
            usuario: { id: user.id, fullName: user.full_name, role: user.role, usedDiscount: user.has_used_welcome_discount }
        });
    } catch (error) { next(error); }
});

// ==========================================
// RUTAS CRUD PRINCIPAL (ROPA)
// ==========================================

// 1. GET: Listado con paginación y filtros
app.get('/api/items', async (req, res, next) => {
    try {
        const { search, category, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT p.*, c.label as category_name, i.image_path FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN product_images i ON p.id = i.product_id AND i.is_primary = TRUE WHERE 1=1';
        const params = [];

        if (search) {
            query += ' AND p.name LIKE ?';
            params.push(`%${search}%`);
        }
        if (category) {
            query += ' AND c.label = ?';
            params.push(category);
        }

        query += ' LIMIT ? OFFSET ?';
        // Convertimos a números para el paginado
        params.push(Number(limit), Number(offset));

        const [items] = await pool.query(query, params);
        res.json(items);
    } catch (error) { next(error); }
});

// 2. GET: Vista detalle
app.get('/api/items/:id', async (req, res, next) => {
    try {
        const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (product.length === 0) return res.status(404).json({ error: 'Prenda no encontrada' });
        
        const [images] = await pool.query('SELECT image_path, is_primary FROM product_images WHERE product_id = ?', [req.params.id]);
        const [variants] = await pool.query('SELECT size, color, stock_quantity FROM product_variants WHERE product_id = ?', [req.params.id]);
        
        res.json({ ...product[0], images, variants });
    } catch (error) { next(error); }
});

// 3. POST: Crear registro con imagen (Solo Admin)
app.post('/api/items', verificarToken, soloAdmin, upload.single('image'), async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { sku, name, brand, basePrice, description, categoryId } = req.body;
        
        // Insertar producto
        const [result] = await connection.query(
            'INSERT INTO products (sku, name, brand, base_price, description, category_id) VALUES (?, ?, ?, ?, ?, ?)',
            [sku, name, brand, basePrice, description, categoryId || null]
        );
        const productId = result.insertId;

        // Insertar imagen si se subió una
        if (req.file) {
            const imagePath = `/uploads/${req.file.filename}`;
            await connection.query(
                'INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, TRUE)',
                [productId, imagePath]
            );
        }

        await connection.commit();
        res.status(201).json({ mensaje: 'Prenda creada con éxito', id: productId });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});

// Middleware Global de Manejo de Errores
app.use((err, req, res, next) => {
    console.error('Error del servidor:', err);
    res.status(500).json({ 
        error: 'Ocurrió un error interno en el servidor.',
        details: process.env.NODE_ENV === 'development' ? err.message : null 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor M&X Studio activo en puerto ${PORT}`));