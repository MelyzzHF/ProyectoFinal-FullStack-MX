import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Favoritos.css';

export default function Favoritos() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [favoritos, setFavoritos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => { cargarFavoritos(); }, []);

  const cargarFavoritos = async () => {
    setCargando(true);
    try {
      const res = await api.get('/wishlist/details');
      setFavoritos(res.data);
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
    } finally {
      setCargando(false);
    }
  };

  const eliminarFavorito = async (productId) => {
    try {
      await api.delete(`/wishlist/${productId}`);
      setFavoritos(prev => prev.filter(f => f.product_id !== productId));
    } catch (error) {
      console.error('Error al eliminar favorito:', error);
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  if (cargando) {
    return <div className="favoritos" style={{ textAlign: 'center', padding: '80px' }}><p>Cargando favoritos...</p></div>;
  }

  return (
    <div className="favoritos">
      <header className="favoritos-header">
        <h1 className="brand-title favoritos-header__logo" onClick={() => navigate('/tienda')}>M&X STUDIO</h1>
        <div className="favoritos-header__actions">
          <span className="favoritos-header__greeting">Hola, {user.fullName}</span>
          <button className="favoritos-header__btn" onClick={() => navigate('/tienda')}>TIENDA</button>
          <button className="favoritos-header__btn" onClick={() => navigate('/carrito')}>&#128722; CARRITO</button>
          <button onClick={handleLogout} className="favoritos-header__btn favoritos-header__btn--logout">SALIR</button>
        </div>
      </header>

      <div className="favoritos-main">
        <div className="favoritos-breadcrumb">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tienda'); }}>Inicio</a>
          {' / '}
          <span>Favoritos</span>
        </div>

        <h1 className="favoritos-title">Mis Favoritos</h1>
        <p className="favoritos-subtitle">{favoritos.length} {favoritos.length === 1 ? 'prenda guardada' : 'prendas guardadas'}</p>

        {favoritos.length === 0 ? (
          <div className="favoritos-empty">
            <div className="favoritos-empty__icon">{'\u2661'}</div>
            <div className="favoritos-empty__title">No tienes favoritos</div>
            <div className="favoritos-empty__text">Explora el catalogo y guarda las prendas que te gusten</div>
            <button className="favoritos-empty__btn" onClick={() => navigate('/tienda')}>IR A LA TIENDA</button>
          </div>
        ) : (
          <div className="favoritos-grid">
            {favoritos.map((item, index) => (
              <div key={item.product_id} className="favoritos-card" style={{ animationDelay: `${index * 0.06}s` }}>
                <div className="favoritos-card__img-container" onClick={() => navigate(`/producto/${item.product_id}`)}>
                  {item.image_path ? (
                    <img src={`http://localhost:3000${item.image_path}`} alt={item.name} className="favoritos-card__img" />
                  ) : (
                    <span className="favoritos-card__placeholder">Sin imagen</span>
                  )}
                </div>
                <div className="favoritos-card__body">
                  <span className="favoritos-card__brand">{item.brand}</span>
                  <h4 className="favoritos-card__name">{item.name}</h4>
                  <p className="favoritos-card__price">${Number(item.base_price).toFixed(2)}</p>
                </div>
                <div className="favoritos-card__actions">
                  <button className="favoritos-card__ver-btn" onClick={() => navigate(`/producto/${item.product_id}`)}>
                    Ver Producto
                  </button>
                  <button className="favoritos-card__remove-btn" onClick={() => eliminarFavorito(item.product_id)}>
                    {'\u2715'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="favoritos-footer">2026 M&X Studio. Todos los derechos reservados.</footer>
    </div>
  );
}