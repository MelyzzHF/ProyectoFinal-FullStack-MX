const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../server'); 
const mysql = require('mysql2/promise');

// 1. MOCK DE LA BASE DE DATOS
jest.mock('mysql2/promise', () => {
  const mPool = { query: jest.fn(), getConnection: jest.fn() };
  return { createPool: jest.fn(() => mPool) };
});

const pool = mysql.createPool();

process.env.JWT_SECRET = 'secreto_de_prueba';

describe('Pruebas de Autenticación M&X Studio', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('POST /register - Debería crear una cuenta exitosamente', async () => {
    // Simulamos la primera consulta (SELECT email) devolviendo un array vacío (el correo NO existe)
    pool.query.mockResolvedValueOnce([[]]); 
    // Simulamos la segunda consulta (INSERT) devolviendo un insertId
    pool.query.mockResolvedValueOnce([{ insertId: 1 }]); 

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Juan Perez',
        email: 'juan@mxstudio.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.mensaje).toBe('Cuenta creada exitosamente');
    expect(res.body.id).toBe(1);
  });

  test('POST /register - Debería fallar si el correo ya está registrado', async () => {
    // Simulamos que el SELECT encuentra un usuario en la base de datos
    pool.query.mockResolvedValueOnce([[{ id: 1, email: 'juan@mxstudio.com' }]]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Juan Perez',
        email: 'juan@mxstudio.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('El correo ya está registrado');
  });

  test('POST /register - Debería ser bloqueado por el middleware si la contraseña es corta', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Juan Perez',
        email: 'juan@mxstudio.com',
        password: '123' 
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Contraseña mínima de 6 caracteres');
    expect(pool.query).not.toHaveBeenCalled(); 
  });

  test('POST /register - Debería fallar si el formato del correo es inválido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        fullName: 'Juan Perez',
        email: 'correo-sin-arroba.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Correo inválido');
  });

  test('POST /login - Debería iniciar sesión correctamente y devolver un token', async () => {
    //Generamos un hash real para que bcrypt.compare() pase la prueba exitosamente
    const hashedPassword = await bcrypt.hash('password123', 10);

    //Simulamos que la base de datos encuentra al usuario con ese hash
    pool.query.mockResolvedValueOnce([[{ 
      id: 5, 
      full_name: 'Ana López', 
      email: 'ana@mxstudio.com', 
      password_hash: hashedPassword, 
      role: 'admin',
      has_used_welcome_discount: 0
    }]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ana@mxstudio.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario.fullName).toBe('Ana López');
    expect(res.body.usuario.role).toBe('admin');
  });

  test('POST /login - Debería fallar si el correo no existe', async () => {
    // Simulamos que la BD no encuentra el correo
    pool.query.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'fantasma@mxstudio.com',
        password: 'password123'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Credenciales incorrectas');
  });

  test('POST /login - Debería fallar si la contraseña es incorrecta', async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Encontramos al usuario
    pool.query.mockResolvedValueOnce([[{ 
      id: 5, 
      email: 'ana@mxstudio.com', 
      password_hash: hashedPassword 
    }]]);

    // pero mandamos una contraseña equivocada
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ana@mxstudio.com',
        password: 'MiPasswordEquivocado'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Credenciales incorrectas');
  });

});