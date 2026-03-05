const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server'); 
const mysql = require('mysql2/promise');

// 1. MOCK (Simulación) DE LA BASE DE DATOS
// Esto evita que modifiquemos la base de datos real al correr pruebas
jest.mock('mysql2/promise', () => {
  const mPool = { query: jest.fn(), getConnection: jest.fn() };
  return { createPool: jest.fn(() => mPool) };
});

const pool = mysql.createPool();

process.env.JWT_SECRET = 'secreto_de_prueba';

describe('Pruebas de Rutas M&X Studio API', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/items - Debería retornar 200 y una lista de productos', async () => {
    // Simulamos que la base de datos nos devuelve 2 prendas
    pool.query.mockResolvedValue([
      [{ id: 1, name: 'Camisa Blanca', base_price: 250 }, { id: 2, name: 'Pantalón', base_price: 400 }]
    ]);

    const res = await request(app).get('/api/items');

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body.length).toBe(2);
    expect(res.body[0].name).toBe('Camisa Blanca');
  });

  // --- PRUEBA 2: SEGURIDAD (Sin Token) ---
  test('PATCH /api/items/:id/price - Debería retornar 401 si no hay token', async () => {
    const res = await request(app)
      .patch('/api/items/1/price')
      .send({ basePrice: 299.99 });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Acceso denegado. Token requerido.');
  });

  // --- PRUEBA 3: SEGURIDAD Y EDICIÓN (Con Token de Admin) ---
  test('PATCH /api/items/:id/price - Debería actualizar el precio si el usuario es Admin', async () => {
    const tokenAdmin = jwt.sign(
      { id: 1, email: 'admin@mxstudio.com', role: 'admin' },
      process.env.JWT_SECRET
    );
    pool.query.mockResolvedValue([{ affectedRows: 1 }]);

    const res = await request(app)
      .patch('/api/items/1/price')
      .set('Authorization', `Bearer ${tokenAdmin}`) 
      .send({ basePrice: 299.99 });

    expect(res.statusCode).toBe(200);
    expect(res.body.mensaje).toBe('Precio actualizado exitosamente');
    expect(res.body.nuevoPrecio).toBe(299.99);
  });

  // --- PRUEBA 4: VALIDACIÓN DE DATOS ---
  test('PATCH /api/items/:id/price - Debería fallar si el precio es negativo', async () => {
    const tokenAdmin = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET);

    const res = await request(app)
      .patch('/api/items/1/price')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ basePrice: -50 }); 

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Se requiere un precio base válido.');
  });

});