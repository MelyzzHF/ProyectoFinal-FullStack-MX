import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './verMas.css';

export default function VerMas() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [producto, setProducto] = useState(null);
    const [relacionados, setRelacionados] = useState([]);
    const [resenas, setResenas] = useState([]);
    const [imagenActual, setImagenActual] = useState(0);
    const [colorSeleccionado, setColorSeleccionado] = useState(null);
    const [tallaSeleccionada, setTallaSeleccionada] = useState(null);
    const [esFavorito, setEsFavorito] = useState(false);
    const [cantidad, setCantidad] = useState(1);
    const [notificacion, setNotificacion] = useState('');
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const cargar = async () => {
            setCargando(true);
            try {
                const res = await api.get(`/items/${id}`);
                setProducto(res.data);
                const colores = [...new Set(res.data.variants?.map(v => v.color))];
                if (colores.length > 0) setColorSeleccionado(colores[0]);

                const relRes = await api.get(`/items?limit=10`);
                setRelacionados(relRes.data.filter(p => p.id !== parseInt(id)));

                try { const revRes = await api.get(`/items/${id}/reviews`); setResenas(revRes.data); }
                catch { setResenas([]); }

                try { const favRes = await api.get('/wishlist'); setEsFavorito(favRes.data.some(f => f.product_id === parseInt(id))); }
                catch { setEsFavorito(false); }
            } catch (error) { console.error('Error:', error); }
            finally { setCargando(false); }
        };
        cargar();
        window.scrollTo(0, 0);
    }, [id]);

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    const toggleFavorito = async () => {
        try {
            if (esFavorito) await api.delete(`/wishlist/${id}`);
            else await api.post('/wishlist', { productId: parseInt(id) });
            setEsFavorito(!esFavorito);
        } catch (error) { console.error('Error favorito:', error); }
    };

    const agregarAlCarrito = async () => {
        if (!tallaSeleccionada) { setNotificacion('Selecciona una talla'); setTimeout(() => setNotificacion(''), 2500); return; }
        if (!colorSeleccionado) { setNotificacion('Selecciona un color'); setTimeout(() => setNotificacion(''), 2500); return; }
        try {
            await api.post('/cart', { productId: producto.id, size: tallaSeleccionada, color: colorSeleccionado, quantity: cantidad });
            setNotificacion('Producto agregado al carrito');
            setTimeout(() => setNotificacion(''), 3000);
        } catch (error) {
            setNotificacion(error.response?.data?.error || 'Error al agregar');
            setTimeout(() => setNotificacion(''), 3000);
        }
    };

    if (cargando) return <div className="vermas" style={{ textAlign: 'center', padding: '80px' }}><p>Cargando...</p></div>;
    if (!producto) return <div className="vermas" style={{ textAlign: 'center', padding: '80px' }}><p>Producto no encontrado.</p></div>;

    // Procesar imagenes
    const imagenPrimaria = producto.images?.find(img => img.is_primary);
    const imagenesSecundarias = producto.images?.filter(img => !img.is_primary) || [];
    const todasImagenes = [
        ...(imagenPrimaria ? [imagenPrimaria.image_path] : []),
        ...imagenesSecundarias.map(img => img.image_path)
    ];
    if (todasImagenes.length === 0) todasImagenes.push(null);

    // Procesar variantes
    const variants = producto.variants || [];
    const coloresUnicos = [...new Set(variants.map(v => v.color))];
    const tallasParaColor = variants.filter(v => v.color === colorSeleccionado);

    const ordenTallas = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
    const todasLasTallas = [...new Set(variants.map(v => v.size))].sort((a, b) => {
        const iA = ordenTallas.indexOf(a);
        const iB = ordenTallas.indexOf(b);
        return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB);
    });

    const varianteActual = variants.find(v => v.color === colorSeleccionado && v.size === tallaSeleccionada);
    const stockActual = varianteActual ? varianteActual.stock_quantity : 0;
    const stockTotal = variants.reduce((sum, v) => sum + v.stock_quantity, 0);
    const puntos = producto.loyalty_points || 0;
    const promedioResenas = resenas.length > 0 ? resenas.reduce((sum, r) => sum + r.rating, 0) / resenas.length : 0;

    const colorHexMap = {
        'Blanco': '#FFFFFF', 'Negro': '#1a1a1a', 'Azul Marino': '#1B3A5C',
        'Azul': '#4A6FA5', 'Rojo': '#C0392B', 'Verde': '#27AE60',
        'Gris': '#95A5A6', 'Rosa': '#E8A0BF', 'Beige': '#C8BCAC',
        'Amarillo': '#F1C40F', 'Naranja': '#E67E22', 'Morado': '#8E44AD',
    };
    const getColorHex = (name) => colorHexMap[name] || '#CCCCCC';

    return (
        <div className="vermas">
            <header className="vermas-header">
                <img src="/logo-header.svg" alt="M&X Studio" className="tienda-header__logo-img" onClick={() => navigate('/tienda')} />
                <div className="vermas-header__actions">
                    <span className="vermas-header__greeting">Hola, {user.fullName}</span>
                    <button className="vermas-header__btn" onClick={() => navigate('/carrito')}>&#128722; CARRITO</button>
                    <button className="vermas-header__btn" onClick={() => navigate('/favoritos')}>{'\u2661'} FAVORITOS</button>
                    <button onClick={handleLogout} className="vermas-header__btn vermas-header__btn--logout">SALIR</button>
                </div>
            </header>

            <div className="vermas-breadcrumb">
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tienda'); }}>Inicio</a>
                {' / '}
                <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tienda'); }}>{producto.category_name || 'Tienda'}</a>
                {' / '}
                <span className="vermas-breadcrumb__current">{producto.name}</span>
            </div>

            {notificacion && <div className="vermas-notification">{notificacion}</div>}

            {/* PRODUCTO */}
            <section className="vermas-product">
                <div className="vermas-images">
                    <img
                        src={todasImagenes[imagenActual] ? `http://localhost:3000${todasImagenes[imagenActual]}` : 'https://via.placeholder.com/600x620?text=Sin+Imagen'}
                        alt={producto.name}
                        className="vermas-images__main"
                    />
                    {todasImagenes.length > 1 && (
                        <div className="vermas-images__thumbs">
                            {todasImagenes.map((img, i) => (
                                <img
                                    key={i}
                                    src={img ? `http://localhost:3000${img}` : 'https://via.placeholder.com/80x96?text=...'}
                                    alt={`Vista ${i + 1}`}
                                    className={`vermas-images__thumb ${imagenActual === i ? 'vermas-images__thumb--active' : ''}`}
                                    onClick={() => setImagenActual(i)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="vermas-info">
                    <div className="vermas-info__top">
                        <div className="vermas-info__brand">{producto.brand}</div>
                        <button className="vermas-info__fav-btn" onClick={toggleFavorito}>
                            {esFavorito ? '\u2665' : '\u2661'}
                        </button>
                    </div>

                    <h1 className="vermas-info__name">{producto.name}</h1>

                    <div className="vermas-price">
                        <span className="vermas-price__amount">${Number(producto.base_price).toFixed(2)}</span>
                        {puntos > 0 && <span className="vermas-price__points">+{puntos} PUNTOS</span>}
                    </div>

                    {resenas.length > 0 && (
                        <div className="vermas-reviews-summary">
                            <span className="vermas-reviews-summary__stars">
                                {'\u2605'.repeat(Math.round(promedioResenas))}{'\u2606'.repeat(5 - Math.round(promedioResenas))}
                            </span>
                            <span>{promedioResenas.toFixed(1)} ({resenas.length} resenas)</span>
                        </div>
                    )}

                    <div className="vermas-divider" />

                    {coloresUnicos.length > 0 && (
                        <div>
                            <div className="vermas-variation__label">Color {colorSeleccionado ? `\u2014 ${colorSeleccionado}` : ''}</div>
                            <div className="vermas-colors">
                                {coloresUnicos.map((color, i) => (
                                    <div key={i}
                                        className={`vermas-colors__circle ${colorSeleccionado === color ? 'vermas-colors__circle--active' : ''} ${getColorHex(color).toUpperCase() === '#FFFFFF' ? 'vermas-colors__circle--light' : ''}`}
                                        style={{ backgroundColor: getColorHex(color) }}
                                        onClick={() => { setColorSeleccionado(color); setTallaSeleccionada(null); setCantidad(1); }}
                                        title={color} />
                                ))}
                            </div>
                        </div>
                    )}

                    {todasLasTallas.length > 0 && (
                        <div>
                            <div className="vermas-variation__label">Talla</div>
                            <div className="vermas-sizes">
                                {todasLasTallas.map((talla) => {
                                    const v = tallasParaColor.find(vr => vr.size === talla);
                                    const disponible = v && v.stock_quantity > 0;
                                    return (
                                        <button key={talla}
                                            className={`vermas-sizes__btn ${tallaSeleccionada === talla ? 'vermas-sizes__btn--active' : ''} ${!disponible ? 'vermas-sizes__btn--disabled' : ''}`}
                                            onClick={() => { if (disponible) { setTallaSeleccionada(talla); setCantidad(1); } }}
                                            disabled={!disponible}>
                                            {talla}
                                        </button>
                                    );
                                })}
                            </div>
                            {todasLasTallas.some(t => { const v = tallasParaColor.find(vr => vr.size === t); return !v || v.stock_quantity === 0; }) && (
                                <div className="vermas-sizes__unavailable">
                                    Agotadas: {todasLasTallas.filter(t => { const v = tallasParaColor.find(vr => vr.size === t); return !v || v.stock_quantity === 0; }).join(', ')}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="vermas-stock">
                        <span className={`vermas-stock__dot ${varianteActual ? (stockActual > 5 ? 'vermas-stock__dot--ok' : stockActual > 0 ? 'vermas-stock__dot--low' : 'vermas-stock__dot--out') : (stockTotal > 0 ? 'vermas-stock__dot--ok' : 'vermas-stock__dot--out')}`} />
                        {varianteActual
                            ? (stockActual > 0 ? `${stockActual} piezas disponibles` : 'Agotado en esta variante')
                            : (stockTotal > 0 ? `${stockTotal} piezas en total` : 'Agotado')}
                    </div>

                    <div className="vermas-divider" />

                    <div className="vermas-actions">
                        <div className="vermas-qty">
                            <button className="vermas-qty__btn" onClick={() => setCantidad(Math.max(1, cantidad - 1))}>-</button>
                            <span className="vermas-qty__num">{cantidad}</span>
                            <button className="vermas-qty__btn" onClick={() => setCantidad(Math.min(stockActual || 99, cantidad + 1))}>+</button>
                        </div>
                        <button className="vermas-add-cart" onClick={agregarAlCarrito} disabled={stockTotal === 0}>+ AGREGAR AL CARRITO</button>
                    </div>

                    {puntos > 0 && (
                        <div className="vermas-points-box">
                            <div className="vermas-points-box__title">* Puntos Extra</div>
                            <div className="vermas-points-box__text">Gana <strong>+{puntos} puntos</strong> con esta compra. Acumula puntos para canjear descuentos de hasta el 10%.</div>
                        </div>
                    )}
                </div>
            </section>

            {/* DESCRIPCION */}
            <section className="vermas-desc">
                <h2 className="vermas-desc__title">Descripcion Detallada</h2>
                <div className="vermas-desc__grid">
                    <div className="vermas-desc__card">
                        <div className="vermas-desc__card-title">Materiales y Cuidados</div>
                        <div className="vermas-desc__card-text">{producto.materials_care || 'Informacion no disponible.'}</div>
                    </div>
                    <div className="vermas-desc__card">
                        <div className="vermas-desc__card-title">Descripcion</div>
                        <div className="vermas-desc__card-text">{producto.description || 'Sin descripcion.'}</div>
                    </div>
                    <div className="vermas-desc__card">
                        <div className="vermas-desc__card-title">Como Combinarlo</div>
                        <div className="vermas-desc__card-text">{producto.styling_tips || 'Combina con distintas prendas para diferentes looks.'}</div>
                    </div>
                </div>
            </section>

            {resenas.length > 0 && (
                <section className="vermas-reviews">
                    <h2 className="vermas-desc__title">Resenas</h2>
                    {resenas.map((r) => (
                        <div key={r.id} className="vermas-reviews__card">
                            <div className="vermas-reviews__card-header">
                                <span className="vermas-reviews__user">{r.full_name || 'Usuario'}</span>
                                <span className="vermas-reviews-summary__stars">{'\u2605'.repeat(r.rating)}{'\u2606'.repeat(5 - r.rating)}</span>
                            </div>
                            <div className="vermas-reviews__comment">{r.comment}</div>
                            {r.photo_path && <img src={`http://localhost:3000${r.photo_path}`} alt="Foto" style={{ maxWidth: '150px', marginTop: '8px', borderRadius: '8px' }} />}
                        </div>
                    ))}
                </section>
            )}

            {relacionados.length > 0 && (
                <section className="vermas-related">
                    <h2 className="vermas-desc__title">Prendas Relacionadas</h2>
                    <div className="vermas-related__grid">
                        {relacionados.slice(0, 10).map((p) => (
                            <div key={p.id} className="vermas-related__card" onClick={() => navigate(`/producto/${p.id}`)}>
                                <img src={p.image_path ? `http://localhost:3000${p.image_path}` : 'https://via.placeholder.com/300x200?text=Prenda'} alt={p.name} className="vermas-related__img" />
                                <div className="vermas-related__info">
                                    <div className="vermas-related__name">{p.name}</div>
                                    <div className="vermas-related__price">${Number(p.base_price).toFixed(2)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section className="vermas-contact">
                <div>
                    <div className="vermas-contact__title">Contacto</div>
                    <div className="vermas-contact__text">contacto@mxstudio.com<br />+52 (81) 1234-5678<br />Monterrey, N.L., Mexico</div>
                </div>
                <div>
                    <div className="vermas-variation__label" style={{ marginBottom: '14px' }}>Siguenos</div>
                    <div className="vermas-social">
                        <button className="vermas-social__circle">IG</button>
                        <button className="vermas-social__circle">FB</button>
                        <button className="vermas-social__circle">TT</button>
                    </div>
                </div>
            </section>

            <footer className="vermas-footer">2026 M&X Studio. Todos los derechos reservados.</footer>
        </div>
    );
}