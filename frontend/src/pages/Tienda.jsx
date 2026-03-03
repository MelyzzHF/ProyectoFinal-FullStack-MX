import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Tienda() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');

  // Función para cargar la ropa desde el backend
  const cargarProductos = async () => {
    try {
      // Usamos el endpoint GET con filtros y paginación que creamos en el backend
      const response = await api.get(`/items?search=${busqueda}&category=${categoria}`);
      setProductos(response.data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  };

  // Cargar los productos cada vez que cambie la búsqueda o categoría
  useEffect(() => {
    cargarProductos();
  }, [busqueda, categoria]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      
      {/* HEADER: Basado en tu boceto */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '1px solid var(--input-border)', paddingBottom: '20px' }}>
        <h1 className="brand-title" style={{ fontSize: '2.5rem', margin: 0 }}>M&X Studio</h1>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ maxWidth: '300px', marginBottom: 0 }} 
          />
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Hola, {user.fullName}</span>
          <button style={{ width: 'auto', padding: '10px 15px', margin: 0 }} className="btn-primary">🛒 Carrito</button>
          <button onClick={handleLogout} className="btn-secondary" style={{ width: 'auto', padding: '10px 15px', margin: 0 }}>Cerrar Sesión</button>
        </div>
      </header>

      {/* NAVEGACIÓN DE CATEGORÍAS */}
      <nav style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px' }}>
        {['', 'Hombre', 'Mujer', 'Niños'].map((cat) => (
          <button 
            key={cat}
            onClick={() => setCategoria(cat)}
            style={{
              width: 'auto', padding: '8px 20px', margin: 0,
              backgroundColor: categoria === cat ? 'var(--accent-taupe)' : 'transparent',
              border: '1px solid var(--accent-taupe)',
              color: categoria === cat ? '#fff' : 'var(--text-primary)'
            }}
          >
            {cat || 'Todos'}
          </button>
        ))}
      </nav>

      {/* PANEL ADMIN (Solo visible si el rol es admin) */}
      {user.role === 'admin' && (
        <div style={{ marginBottom: '30px', textAlign: 'right' }}>
          <button onClick={() => navigate('/agregar-prenda')} className="btn-success" style={{ width: 'auto', padding: '10px 20px' }}>+ Agregar Nueva Prenda</button>
        </div>
      )}

      {/* CUADRÍCULA DE PRODUCTOS */}
      <main>
        {productos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>Aún no hay prendas en el catálogo.</h3>
            {user.role === 'admin' && <p>Usa el botón de arriba para comenzar a agregar inventario.</p>}
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
            gap: '30px' 
          }}>
            {/* Aquí mapearemos los productos cuando haya datos */}
            {productos.map(producto => (
              <div key={producto.id} style={{ border: '1px solid var(--input-border)', padding: '15px', textAlign: 'center', backgroundColor: '#fff' }}>
                <div style={{ height: '300px', backgroundColor: '#eee', marginBottom: '15px' }}>
                  {producto.image_path && <img src={`http://localhost:3000${producto.image_path}`} alt={producto.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                </div>
                <h4 style={{ margin: '0 0 10px 0', fontFamily: 'var(--font-serif)', fontSize: '1.2rem' }}>{producto.name}</h4>
                <p style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)' }}>${producto.base_price}</p>
                <button className="btn-secondary" style={{ margin: 0 }}>Ver más</button>
              </div>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}