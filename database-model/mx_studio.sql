-- Creación la base de datos
CREATE DATABASE IF NOT EXISTS mx_studio_db;
USE mx_studio_db;

-- 1. Tabla de Cuentas
-- Contiene el control para el descuento único de bienvenida
CREATE TABLE accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    has_used_welcome_discount BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(50) NOT NULL UNIQUE
);

-- 3. Tabla Principal: Productos
-- Almacena toda la información descriptiva y puntos de la prenda
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    loyalty_points INT DEFAULT 0,
    description TEXT,
    materials_care TEXT,
    styling_tips TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 4. Tabla de Variantes
-- Permite que una sola prenda tenga múltiples tallas, colores y su propio stock
CREATE TABLE product_variants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    size VARCHAR(20) NOT NULL,
    color VARCHAR(50) NOT NULL,
    stock_quantity INT DEFAULT 0,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 5. Tabla de Imágenes de Productos
-- Aquí guardaremos la ruta local de la imagen subida desde la computadora del Admin
CREATE TABLE product_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 6. Tabla de Reseñas de Clientes
-- Permite calificación por estrellas y almacenar la ruta de la foto que suba el usuario
CREATE TABLE customer_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    product_id INT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    photo_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 7. Tabla de Favoritos
CREATE TABLE wishlists (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    product_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE(account_id, product_id) -- Evita que un usuario agregue la misma prenda dos veces a favoritos
);

-- Insertar las categorías solicitadas por defecto
INSERT INTO categories (label) VALUES ('Hombre'), ('Mujer'), ('Niños');

CREATE TABLE cart_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    product_id      INT NOT NULL,
    size            VARCHAR(20) DEFAULT NULL,
    color           VARCHAR(50) DEFAULT NULL,
    quantity        INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)    REFERENCES accounts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,

    UNIQUE KEY unique_cart_entry (user_id, product_id, size, color)
);



-- Tabla de ordenes
CREATE TABLE orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    total           DECIMAL(10,2) NOT NULL,
    discount_code   VARCHAR(50) DEFAULT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    shipping_cost   DECIMAL(10,2) DEFAULT 0,
    status          ENUM('completado', 'cancelado') DEFAULT 'completado',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Detalle de cada producto en la orden
CREATE TABLE order_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL,
    product_id      INT NOT NULL,
    size            VARCHAR(20) DEFAULT NULL,
    color           VARCHAR(50) DEFAULT NULL,
    quantity        INT NOT NULL,
    unit_price      DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

ALTER TABLE accounts ADD COLUMN points INT DEFAULT 0;

DELIMITER //

CREATE PROCEDURE sp_insert_product_variants(
    IN p_product_id INT,
    IN p_variants_json JSON
)
BEGIN
    -- Declaración de salida en caso de error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Insertamos los datos transformando el JSON a una estructura de tabla
    INSERT INTO mx_studio_db.product_variants (product_id, size, color, stock_quantity)
    SELECT 
        p_product_id,
        jt.size,
        jt.color,
        jt.stock_quantity
    FROM JSON_TABLE(
        p_variants_json,
        '$[*]' COLUMNS (
            size VARCHAR(50) PATH '$.size',
            color VARCHAR(50) PATH '$.color',
            stock_quantity INT PATH '$.stock_quantity'
        )
    ) AS jt;

    COMMIT;
END //

DELIMITER ;











