import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Puntos.css';

export default function Puntos() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [totalPuntos, setTotalPuntos] = useState(0);
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const res = await api.get('/user/points');
        setTotalPuntos(res.data.total_points);
        setHistorial(res.data.historial);
      } catch (error) {
        console.error('Error al cargar puntos:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  const formatFecha = (fecha) => {
    const d = new Date(fecha);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (cargando) {
    return <div className="puntos" style={{ textAlign: 'center', padding: '80px' }}><p>Cargando puntos...</p></div>;
  }

  return (
    <div className="puntos">
      <header className="puntos-header">
        <h1 className="brand-title puntos-header__logo" onClick={() => navigate('/tienda')}>M&X STUDIO</h1>
        <div className="puntos-header__actions">
          <span className="puntos-header__greeting">Hola, {user.fullName}</span>
          <button className="puntos-header__btn" onClick={() => navigate('/tienda')}>TIENDA</button>
          <button className="puntos-header__btn" onClick={() => navigate('/carrito')}>{'\u{1F6D2}'} CARRITO</button>
          <button className="puntos-header__btn" onClick={() => navigate('/favoritos')}>{'\u2661'} FAVORITOS</button>
          <button onClick={handleLogout} className="puntos-header__btn puntos-header__btn--logout">SALIR</button>
        </div>
      </header>

      <div className="puntos-main">
        <div className="puntos-breadcrumb">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tienda'); }}>Inicio</a>
          {' / '}
          <span>Mis Puntos</span>
        </div>

        <h1 className="puntos-page-title">Mis Puntos</h1>

        {/* Tarjeta principal */}
        <div className="puntos-card">
          <div className="puntos-card__info">
            <div className="puntos-card__label">Puntos Acumulados</div>
            <div className="puntos-card__total">
              {totalPuntos.toLocaleString()} <span className="puntos-card__total-label">pts</span>
            </div>
            <div className="puntos-card__equivalence">
              Equivale a ${(totalPuntos * 0.1).toFixed(2)} MXN en descuentos
            </div>
          </div>
          <div className="puntos-card__icon">{'\u2605'}</div>
        </div>

        <div className="puntos-how">
          <div className="puntos-how__card">
            <div className="puntos-how__icon">{'\u{1F6D2}'}</div>
            <div className="puntos-how__title">Compra</div>
            <div className="puntos-how__text">Gana puntos con cada compra. Cada prenda tiene sus propios puntos de lealtad.</div>
          </div>
          <div className="puntos-how__card">
            <div className="puntos-how__icon">{'\u2605'}</div>
            <div className="puntos-how__title">Acumula</div>
            <div className="puntos-how__text">Tus puntos se suman automaticamente. Mientras mas compras, mas ganas.</div>
          </div>
          <div className="puntos-how__card">
            <div className="puntos-how__icon">{'\u{1F381}'}</div>
            <div className="puntos-how__title">Canjea</div>
            <div className="puntos-how__text">Cada 100 puntos equivalen a $10 MXN de descuento en tu proxima compra.</div>
          </div>
        </div>

        <div>
          <h2 className="puntos-historial__title">Historial de Puntos</h2>

          {historial.length === 0 ? (
            <div className="puntos-historial__empty">
              Aun no tienes compras registradas. Tus puntos apareceran aqui despues de tu primera compra.
            </div>
          ) : (
            <>
              <div className="puntos-historial__table-header">
                <span>Orden</span>
                <span>Fecha</span>
                <span>Total Compra</span>
                <span style={{ textAlign: 'right' }}>Puntos Ganados</span>
              </div>
              {historial.map((h) => (
                <div key={h.order_id} className="puntos-historial__row">
                  <span className="puntos-historial__order">#{h.order_id}</span>
                  <span className="puntos-historial__date">{formatFecha(h.created_at)}</span>
                  <span className="puntos-historial__total">${Number(h.total).toFixed(2)}</span>
                  <span className="puntos-historial__earned" style={{ textAlign: 'right' }}>+{h.puntos_ganados || 0} pts</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <footer className="puntos-footer">2026 M&X Studio. Todos los derechos reservados.</footer>
    </div>
  );
}