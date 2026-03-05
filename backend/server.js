require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); 
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

// RUTAS CRUD PRINCIPAL
app.get('/api/items', async (req, res, next) => {
    try {
        const { search, category, page = 1, limit = 100 } = req.query;
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

// Vista detalle
app.get('/api/items/:id', async (req, res, next) => {
    try {
        const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (product.length === 0) return res.status(404).json({ error: 'Prenda no encontrada' });

        const [images] = await pool.query('SELECT id, image_path, is_primary FROM product_images WHERE product_id = ?', [req.params.id]);
        const [variants] = await pool.query('SELECT size, color, stock_quantity FROM product_variants WHERE product_id = ?', [req.params.id]);

        res.json({ ...product[0], images, variants });
    } catch (error) { next(error); }
});


app.post('/api/items', verificarToken, soloAdmin, upload.single('image'), async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { sku, name, brand, basePrice, description, categoryId } = req.body;

        const [result] = await connection.query(
            'INSERT INTO products (sku, name, brand, base_price, description, category_id) VALUES (?, ?, ?, ?, ?, ?)',
            [sku, name, brand, basePrice, description, categoryId || null]
        );
        const productId = result.insertId;

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


app.delete('/api/items/:id', verificarToken, soloAdmin, async (req, res, next) => {
    try {
        const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Prenda no encontrada' });
        res.json({ mensaje: 'Prenda eliminada exitosamente' });
    } catch (error) { next(error); }
});


app.put('/api/items/:id', verificarToken, soloAdmin, async (req, res, next) => {
    try {
        const { name, brand, basePrice, description, categoryId } = req.body;
        const [result] = await pool.query(
            'UPDATE products SET name = ?, brand = ?, base_price = ?, description = ?, category_id = ? WHERE id = ?',
            [name, brand, basePrice, description, categoryId, req.params.id]
        );
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Prenda no encontrada' });
        res.json({ mensaje: 'Prenda actualizada exitosamente' });
    } catch (error) { next(error); }
});



//RUTAS DEL CARRITO 

// Obtener carrito del usuario
app.get('/api/cart', verificarToken, async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [rows] = await pool.query(`
            SELECT 
                ci.id          AS cart_item_id,
                ci.quantity,
                ci.size,
                ci.color,
                p.id           AS product_id,
                p.name,
                p.brand,
                p.base_price,
                pi.image_path
            FROM cart_items ci
            JOIN products p       ON ci.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
            WHERE ci.user_id = ?
            ORDER BY ci.created_at DESC
        `, [userId]);

        res.json(rows);
    } catch (error) { next(error); }
});

// Agregar producto al carrito
app.post('/api/cart', verificarToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { productId, size, color, quantity = 1 } = req.body;

        if (!productId) return res.status(400).json({ error: 'productId es requerido' });

        const [product] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
        if (product.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

        if (size || color) {
            const [variant] = await pool.query(
                'SELECT stock_quantity FROM product_variants WHERE product_id = ? AND size = ? AND color = ?',
                [productId, size || null, color || null]
            );
            if (variant.length > 0 && variant[0].stock_quantity < quantity) {
                return res.status(400).json({ error: 'Stock insuficiente para esta variante' });
            }
        }

        const [existing] = await pool.query(
            `SELECT id, quantity FROM cart_items 
             WHERE user_id = ? AND product_id = ? AND size <=> ? AND color <=> ?`,
            [userId, productId, size || null, color || null]
        );

        if (existing.length > 0) {
            const newQty = existing[0].quantity + quantity;
            await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [newQty, existing[0].id]);
            res.json({ mensaje: 'Cantidad actualizada en el carrito', cart_item_id: existing[0].id, quantity: newQty });
        } else {
            const [result] = await pool.query(
                'INSERT INTO cart_items (user_id, product_id, size, color, quantity) VALUES (?, ?, ?, ?, ?)',
                [userId, productId, size || null, color || null, quantity]
            );
            res.status(201).json({ mensaje: 'Producto agregado al carrito', cart_item_id: result.insertId });
        }
    } catch (error) { next(error); }
});

// Actualizar cantidad de un item del carrito
app.put('/api/cart/:cartItemId', verificarToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { cartItemId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) return res.status(400).json({ error: 'Cantidad debe ser al menos 1' });

        const [item] = await pool.query(
            'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
            [cartItemId, userId]
        );
        if (item.length === 0) return res.status(404).json({ error: 'Item no encontrado en tu carrito' });

        await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ?', [quantity, cartItemId]);
        res.json({ mensaje: 'Cantidad actualizada', quantity });
    } catch (error) { next(error); }
});

// Eliminar un item del carrito
app.delete('/api/cart/:cartItemId', verificarToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { cartItemId } = req.params;

        const [item] = await pool.query(
            'SELECT id FROM cart_items WHERE id = ? AND user_id = ?',
            [cartItemId, userId]
        );
        if (item.length === 0) return res.status(404).json({ error: 'Item no encontrado en tu carrito' });

        await pool.query('DELETE FROM cart_items WHERE id = ?', [cartItemId]);
        res.json({ mensaje: 'Producto eliminado del carrito' });
    } catch (error) { next(error); }
});

// Vaciar todo el carrito del usuario
app.delete('/api/cart', verificarToken, async (req, res, next) => {
    try {
        const userId = req.user.id;
        await pool.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
        res.json({ mensaje: 'Carrito vaciado' });
    } catch (error) { next(error); }
});



// RUTA PARA SUBIR IMAGENES SECUNDARIAS

// Subir imagenes secundarias a un producto existente 
app.post('/api/items/:id/images', verificarToken, soloAdmin, upload.array('images', 5), async (req, res, next) => {
    try {
        const productId = req.params.id;

        const [product] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
        if (product.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se enviaron imagenes' });
        }

        const valores = req.files.map(file => [productId, `/uploads/${file.filename}`, false]);

        for (const val of valores) {
            await pool.query(
                'INSERT INTO product_images (product_id, image_path, is_primary) VALUES (?, ?, ?)',
                val
            );
        }

        res.status(201).json({
            mensaje: `${req.files.length} imagen(es) agregada(s)`,
            imagenes: req.files.map(f => `/uploads/${f.filename}`)
        });
    } catch (error) { next(error); }
});

// Eliminar una imagen secundaria
app.delete('/api/images/:imageId', verificarToken, soloAdmin, async (req, res, next) => {
    try {
        const { imageId } = req.params;

        const [image] = await pool.query('SELECT * FROM product_images WHERE id = ? AND is_primary = FALSE', [imageId]);
        if (image.length === 0) return res.status(404).json({ error: 'Imagen no encontrada o es la principal' });

        const fs = require('fs');
        const filePath = '.' + image[0].image_path;
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        await pool.query('DELETE FROM product_images WHERE id = ?', [imageId]);
        res.json({ mensaje: 'Imagen eliminada' });
    } catch (error) { next(error); }
});


// Realiza el proceso de pago
app.post('/api/checkout', verificarToken, async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const userId = req.user.id;
        const { discountCode, discountAmount, shippingCost, total } = req.body;

        const [cartItems] = await connection.query(`
            SELECT ci.*, p.base_price
            FROM cart_items ci
            JOIN products p ON ci.product_id = p.id
            WHERE ci.user_id = ?
        `, [userId]);

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'El carrito esta vacio' });
        }

        for (const item of cartItems) {
            const [variant] = await connection.query(
                'SELECT id, stock_quantity FROM product_variants WHERE product_id = ? AND size <=> ? AND color <=> ?',
                [item.product_id, item.size, item.color]
            );
            if (variant.length > 0) {
                if (variant[0].stock_quantity < item.quantity) {
                    await connection.rollback();
                    return res.status(400).json({ error: `Stock insuficiente para ${item.size} ${item.color}` });
                }
                await connection.query(
                    'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?',
                    [item.quantity, variant[0].id]
                );
            }
        }

        const [orderResult] = await connection.query(
            'INSERT INTO orders (user_id, total, discount_code, discount_amount, shipping_cost) VALUES (?, ?, ?, ?, ?)',
            [userId, total, discountCode || null, discountAmount || 0, shippingCost || 0]
        );

        for (const item of cartItems) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, size, color, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)',
                [orderResult.insertId, item.product_id, item.size, item.color, item.quantity, item.base_price]
            );
        }

        await connection.query('DELETE FROM cart_items WHERE user_id = ?', [userId]);

        // Sumar puntos al usuario
        let puntosGanados = 0;
        for (const item of cartItems) {
            const [prod] = await connection.query('SELECT loyalty_points FROM products WHERE id = ?', [item.product_id]);
            if (prod.length > 0) {
                puntosGanados += (prod[0].loyalty_points || 0) * item.quantity;
            }
        }

        if (puntosGanados > 0) {
            await connection.query('UPDATE accounts SET points = points + ? WHERE id = ?', [puntosGanados, userId]);
        }

         // Restar puntos canjeados
        const { pointsUsed } = req.body;
        if (pointsUsed && pointsUsed > 0) {
            await connection.query(
                'UPDATE accounts SET points = GREATEST(0, points - ?) WHERE id = ?',
                [pointsUsed, userId]
            );
        }


        await connection.commit();
        res.status(201).json({ mensaje: 'Pago realizado exitosamente', orderId: orderResult.insertId, total });
    } catch (error) {
        await connection.rollback();
        next(error);
    } finally {
        connection.release();
    }
});


// Obtener puntos del usuario
app.get('/api/user/points', verificarToken, async (req, res, next) => {
    try {
        const [user] = await pool.query('SELECT points FROM accounts WHERE id = ?', [req.user.id]);
        const [historial] = await pool.query(`
            SELECT o.id AS order_id, o.total, o.created_at,
                   SUM(oi.quantity * p.loyalty_points) AS puntos_ganados
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            JOIN products p ON oi.product_id = p.id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [req.user.id]);
        res.json({
            total_points: user[0]?.points || 0,
            historial
        });
    } catch (error) { next(error); }
});

// RUTAS DE FAVORITOS
// Obtener los favoritos del usuario 
app.get('/api/wishlist', verificarToken, async (req, res, next) => {
    try {
        const [rows] = await pool.query(
            'SELECT product_id FROM wishlists WHERE account_id = ?',
            [req.user.id]
        );
        res.json(rows);
    } catch (error) { next(error); }
});

// Agregar a favoritos
app.post('/api/wishlist', verificarToken, async (req, res, next) => {
    try {
        const { productId } = req.body;
        await pool.query(
            'INSERT IGNORE INTO wishlists (account_id, product_id) VALUES (?, ?)',
            [req.user.id, productId]
        );
        res.status(201).json({ mensaje: 'Agregado a favoritos' });
    } catch (error) { next(error); }
});

// Obtener favoritos con detalle de producto
app.get('/api/wishlist/details', verificarToken, async (req, res, next) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                w.product_id,
                p.name,
                p.brand,
                p.base_price,
                pi.image_path
            FROM wishlists w
            JOIN products p ON w.product_id = p.id
            LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = TRUE
            WHERE w.account_id = ?
            ORDER BY w.created_at DESC
        `, [req.user.id]);
        res.json(rows);
    } catch (error) { next(error); }
});

// Eliminar de favoritos
app.delete('/api/wishlist/:productId', verificarToken, async (req, res, next) => {
    try {
        await pool.query(
            'DELETE FROM wishlists WHERE account_id = ? AND product_id = ?',
            [req.user.id, req.params.productId]
        );
        res.json({ mensaje: 'Eliminado de favoritos' });
    } catch (error) { next(error); }
});


app.use((err, req, res, next) => {
    console.error('Error del servidor:', err);
    res.status(500).json({
        error: 'Ocurrió un error interno en el servidor.',
        details: process.env.NODE_ENV === 'development' ? err.message : null
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor M&X Studio activo en puerto ${PORT}`));