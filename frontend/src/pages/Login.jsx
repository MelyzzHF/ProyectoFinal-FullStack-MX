import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [vista, setVista] = useState('bienvenida'); 
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [mensajeExito, setMensajeExito] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await api.post('/auth/login', {
        email: formData.email,
        password: formData.password
      });

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.usuario));
      navigate('/tienda');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');
    setMensajeExito('');
    try {
      await api.post('/auth/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password
      });

      setMensajeExito('¡Cuenta creada exitosamente! Ahora puedes iniciar sesión.');
      setFormData({ fullName: '', email: '', password: '' }); 
      setTimeout(() => setVista('login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrarse');
    }
  };

  return (
    <div className="login-page">

      <div className="container">
        {vista === 'bienvenida' && (
          <div className="vista-bienvenida">
            <div class="logo-container">
            <img src="/logo.png" alt="M&X Studio" className="login-logo" />
             </div>

            <p className="brand-subtitle">Melissa & Ximena</p>
            <p style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px', color: '#888', marginBottom: '30px' }}>
              ¡Bienvenido!
            </p>
            <button className="btn-primary" onClick={() => { setVista('login'); setError(''); }}>Iniciar Sesión</button>
            <button className="btn-success" onClick={() => { setVista('registro'); setError(''); }}>Registrarse</button>
          </div>
        )}

        {vista === 'login' && (
          <form onSubmit={handleLogin}>
            <h2 style={{ fontFamily: 'Times New Roman', marginBottom: '20px' }}>Iniciar Sesión</h2>
            {error && <p style={{ color: '#d48f8f', fontSize: '0.9rem', marginBottom: '15px' }}>{error}</p>}
            {mensajeExito && <p style={{ color: '#8c9773', fontSize: '0.9rem', marginBottom: '15px' }}>{mensajeExito}</p>}

            <input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required />
            <input type="password" name="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required />

            <button type="submit" className="btn-primary">Entrar</button>
            <button type="button" className="btn-secondary" onClick={() => { setVista('bienvenida'); setError(''); }}>Volver</button>
          </form>
        )}

        {vista === 'registro' && (
          <form onSubmit={handleRegistro}>
            <h2 style={{ fontFamily: 'Times New Roman', marginBottom: '20px' }}>Registro</h2>
            {error && <p style={{ color: '#d48f8f', fontSize: '0.9rem', marginBottom: '15px' }}>{error}</p>}

            <input type="text" name="fullName" placeholder="Nombre Completo" value={formData.fullName} onChange={handleChange} required minLength="3" />
            <input type="email" name="email" placeholder="Correo Electrónico" value={formData.email} onChange={handleChange} required />
            <input type="password" name="password" placeholder="Contraseña" value={formData.password} onChange={handleChange} required minLength="6" />

            <button type="submit" className="btn-success">Crear Cuenta</button>
            <button type="button" className="btn-secondary" onClick={() => { setVista('bienvenida'); setError(''); }}>Volver</button>
          </form>
        )}
      </div>
    </div>
  );
}