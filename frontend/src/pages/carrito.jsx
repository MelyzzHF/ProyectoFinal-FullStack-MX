import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './carrito.css';

export default function Carrito() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [items, setItems] = useState([]);
    const [codigoDescuento, setCodigoDescuento] = useState('');
    const [descuentoAplicado, setDescuentoAplicado] = useState(false);
    const [cargando, setCargando] = useState(true);
    const [procesandoPago, setProcesandoPago] = useState(false);
    const [totalPagado, setTotalPagado] = useState(0);
    const [pagoExitoso, setPagoExitoso] = useState(false);
    const [ordenId, setOrdenId] = useState(null);
    const [modalConfirmar, setModalConfirmar] = useState(false);
    const [puntosUsuario, setPuntosUsuario] = useState(0);
    const [puntosCanjeados, setPuntosCanjeados] = useState(false);

    useEffect(() => { cargarCarrito(); cargarPuntos(); }, []);

    const cargarPuntos = async () => {
        try {
            const res = await api.get('/user/points');
            setPuntosUsuario(res.data.total_points || 0);
        } catch { setPuntosUsuario(0); }
    };

    const cargarCarrito = async () => {
        setCargando(true);
        try {
            const res = await api.get('/cart');
            setItems(res.data);
        } catch (error) {
            console.error('Error al cargar carrito:', error);
        } finally {
            setCargando(false);
        }
    };

    const actualizarCantidad = async (cartItemId, nuevaCantidad) => {
        if (nuevaCantidad < 1) return;
        try {
            await api.put(`/cart/${cartItemId}`, { quantity: nuevaCantidad });
            setItems(prev => prev.map(item =>
                item.cart_item_id === cartItemId ? { ...item, quantity: nuevaCantidad } : item
            ));
        } catch (error) {
            console.error('Error al actualizar cantidad:', error);
            alert(error.response?.data?.error || 'Error al actualizar');
        }
    };

    const eliminarItem = async (cartItemId) => {
        try {
            await api.delete(`/cart/${cartItemId}`);
            setItems(prev => prev.filter(item => item.cart_item_id !== cartItemId));
        } catch (error) {
            console.error('Error al eliminar item:', error);
        }
    };

    const aplicarDescuento = () => {
        if (codigoDescuento.toUpperCase() === 'MX10') {
            setDescuentoAplicado(true);
        } else {
            alert('Codigo no valido');
        }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/'); };

    // Calculos
    const subtotal = items.reduce((sum, item) => sum + Number(item.base_price) * item.quantity, 0);
    const envio = subtotal >= 999 ? 0 : 99;
    const descuento = descuentoAplicado ? subtotal * 0.1 : 0;
    const descuentoPuntos = puntosCanjeados ? puntosUsuario * 0.1 : 0; // 100 pts = $10
    const total = Math.max(0, subtotal + envio - descuento - descuentoPuntos);
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    const canjearPuntos = () => {
        if (puntosUsuario <= 0) { alert('No tienes puntos disponibles'); return; }
        setPuntosCanjeados(true);
    };

    const quitarCanjePuntos = () => {
        setPuntosCanjeados(false);
    };

    const colorHexMap = {
        'Blanco': '#FFFFFF', 'Negro': '#1a1a1a', 'Azul Marino': '#1B3A5C',
        'Azul': '#4A6FA5', 'Rojo': '#C0392B', 'Verde': '#27AE60',
        'Gris': '#95A5A6', 'Rosa': '#E8A0BF', 'Beige': '#C8BCAC',
    };

    // PAGO
    const procesarPago = async () => {
    setProcesandoPago(true);
    try {
        const res = await api.post('/checkout', {
            discountCode: descuentoAplicado ? codigoDescuento : null,
            pointsUsed: puntosCanjeados ? puntosUsuario : 0
        });

        setTotalPagado(res.data.total);
        setOrdenId(res.data.orderId);
        setPagoExitoso(true);
        setModalConfirmar(false);
        setItems([]);

    } catch (error) {
        alert(error.response?.data?.error || 'Error al procesar el pago');
        setModalConfirmar(false);
    } finally {
        setProcesandoPago(false);
    }
};

    if (cargando) {
        return <div className="carrito" style={{ textAlign: 'center', padding: '80px 30px' }}><p>Cargando carrito...</p></div>;
    }

    return (
        <div className="carrito">

            {/* CONFIRMACION DE PAGO */}
            {modalConfirmar && (
                <div className="carrito-modal-overlay" onClick={() => !procesandoPago && setModalConfirmar(false)}>
                    <div className="carrito-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="carrito-modal__icon">&#128179;</div>
                        <h3 className="carrito-modal__title">Confirmar Compra</h3>
                        <p className="carrito-modal__text">
                            Estas a punto de realizar una compra por:
                        </p>
                        <div className="carrito-modal__total">${total.toFixed(2)}</div>
                        <p className="carrito-modal__detail">
                            {totalItems} {totalItems === 1 ? 'articulo' : 'articulos'}
                            {descuentoAplicado ? ' - Descuento 10% aplicado' : ''}
                            {puntosCanjeados ? ` - ${puntosUsuario} pts canjeados (-$${descuentoPuntos.toFixed(2)})` : ''}
                            {envio === 0 ? ' - Envio gratis' : ` - Envio $${envio.toFixed(2)}`}
                        </p>
                        <div className="carrito-modal__actions">
                            <button
                                className="carrito-modal__cancel"
                                onClick={() => setModalConfirmar(false)}
                                disabled={procesandoPago}
                            >
                                Cancelar
                            </button>
                            <button
                                className="carrito-modal__confirm"
                                onClick={procesarPago}
                                disabled={procesandoPago}
                            >
                                {procesandoPago ? 'Procesando...' : 'Confirmar Pago'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAGO EXITOSO */}
            {pagoExitoso && (
                <div className="carrito-modal-overlay">
                    <div className="carrito-modal carrito-modal--exito">
                        <div className="carrito-modal__icon-check">&#10003;</div>
                        <h3 className="carrito-modal__title">Pago Realizado Exitosamente</h3>
                        <p className="carrito-modal__text">
                            Tu orden <strong>#{ordenId}</strong> ha sido registrada.
                        </p>
                        <div className="carrito-modal__total">
                            ${totalPagado.toFixed(2)}
                        </div>
                        <p className="carrito-modal__detail">Gracias por tu compra en M&X Studio</p>
                        <button
                            className="carrito-modal__confirm"
                            onClick={() => navigate('/tienda')}
                        >
                            Seguir Comprando
                        </button>
                    </div>
                </div>
            )}

            <header className="carrito-header">
                <h1 className="brand-title carrito-header__logo" onClick={() => navigate('/tienda')}>M&X STUDIO</h1>
                <div className="carrito-header__actions">
                    <span className="carrito-header__greeting">Hola, {user.fullName}</span>
                    <button className="carrito-header__btn" onClick={() => navigate('/tienda')}>TIENDA</button>
                    <button onClick={handleLogout} className="carrito-header__btn carrito-header__btn--logout">SALIR</button>
                </div>
            </header>

            <div className="carrito-main">
                <div className="carrito-breadcrumb">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigate('/tienda'); }}>Inicio</a>
                    {' / '}<span>Carrito</span>
                </div>

                <h1 className="carrito-title">Tu Carrito</h1>
                <p className="carrito-subtitle">{totalItems} {totalItems === 1 ? 'articulo' : 'articulos'} en tu carrito</p>

                {items.length === 0 && !pagoExitoso ? (
                    <div className="carrito-empty">
                        <div className="carrito-empty__icon">&#128722;</div>
                        <div className="carrito-empty__title">Tu carrito esta vacio</div>
                        <div className="carrito-empty__text">Descubre nuestras prendas y encuentra tu estilo</div>
                        <button className="carrito-empty__btn" onClick={() => navigate('/tienda')}>IR A LA TIENDA</button>
                    </div>
                ) : items.length > 0 && (
                    <div className="carrito-layout">
                        <div>
                            <div className="carrito-items__header">
                                <span>Producto</span>
                                <span style={{ textAlign: 'center' }}>Precio</span>
                                <span style={{ textAlign: 'center' }}>Cantidad</span>
                                <span style={{ textAlign: 'right' }}>Subtotal</span>
                                <span></span>
                            </div>

                            {items.map((item) => (
                                <div key={item.cart_item_id} className="carrito-item">
                                    <div className="carrito-item__product">
                                        <img
                                            src={item.image_path ? `http://localhost:3000${item.image_path}` : 'https://via.placeholder.com/85x105?text=...'}
                                            alt={item.name}
                                            className="carrito-item__img"
                                            onClick={() => navigate(`/producto/${item.product_id}`)}
                                        />
                                        <div className="carrito-item__info">
                                            <div className="carrito-item__brand">{item.brand}</div>
                                            <div className="carrito-item__name" onClick={() => navigate(`/producto/${item.product_id}`)}>{item.name}</div>
                                            <div className="carrito-item__variant">
                                                {item.color && <span className="carrito-item__color-dot" style={{ backgroundColor: colorHexMap[item.color] || '#CCCCCC' }} />}
                                                {item.color || ''}{item.color && item.size ? ' - ' : ''}{item.size ? `Talla ${item.size}` : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="carrito-item__price">${Number(item.base_price).toFixed(2)}</div>
                                    <div className="carrito-qty">
                                        <button className="carrito-qty__btn" onClick={() => actualizarCantidad(item.cart_item_id, item.quantity - 1)}>-</button>
                                        <span className="carrito-qty__num">{item.quantity}</span>
                                        <button className="carrito-qty__btn" onClick={() => actualizarCantidad(item.cart_item_id, item.quantity + 1)}>+</button>
                                    </div>
                                    <div className="carrito-item__subtotal">${(Number(item.base_price) * item.quantity).toFixed(2)}</div>
                                    <button className="carrito-item__remove" onClick={() => eliminarItem(item.cart_item_id)} title="Eliminar">X</button>
                                </div>
                            ))}
                        </div>

                        {/* RESUMEN */}
                        <div className="carrito-summary">
                            <div className="carrito-summary__title">Resumen del Pedido</div>
                            <div className="carrito-summary__row">
                                <span>Subtotal ({totalItems} articulos)</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="carrito-summary__row">
                                <span>Envio</span>
                                <span className={envio === 0 ? 'carrito-summary__free' : ''}>
                                    {envio === 0 ? 'GRATIS' : '$' + envio.toFixed(2)}
                                </span>
                            </div>
                            {envio > 0 && <div className="carrito-summary__shipping-note">Envio gratis en compras mayores a $999</div>}
                            {descuentoAplicado && (
                                <div className="carrito-summary__row carrito-summary__discount">
                                    <span>Descuento (10%)</span>
                                    <span>-${descuento.toFixed(2)}</span>
                                </div>
                            )}
                            {puntosCanjeados && (
                                <div className="carrito-summary__row carrito-summary__discount">
                                    <span>Puntos canjeados ({puntosUsuario} pts)</span>
                                    <span>-${descuentoPuntos.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="carrito-summary__divider" />
                            <div className="carrito-summary__total">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>

                            {/* Canje de puntos */}
                            {puntosUsuario > 0 && !puntosCanjeados && (
                                <button className="carrito-points-btn" onClick={canjearPuntos}>
                                    <span className="carrito-points-btn__icon">{'\u2605'}</span>
                                    <span className="carrito-points-btn__text">
                                        Canjear {puntosUsuario} puntos = -${(puntosUsuario * 0.1).toFixed(2)}
                                    </span>
                                </button>
                            )}
                            {puntosCanjeados && (
                                <button className="carrito-points-btn carrito-points-btn--active" onClick={quitarCanjePuntos}>
                                    <span className="carrito-points-btn__icon">{'\u2713'}</span>
                                    <span className="carrito-points-btn__text">
                                        {puntosUsuario} puntos aplicados (-${descuentoPuntos.toFixed(2)})
                                    </span>
                                    <span className="carrito-points-btn__remove">Quitar</span>
                                </button>
                            )}
                            {puntosUsuario === 0 && (
                                <div className="carrito-points-empty">
                                    {'\u2605'} No tienes puntos disponibles. <a href="#" onClick={(e) => { e.preventDefault(); navigate('/mis-puntos'); }}>Ver como ganar</a>
                                </div>
                            )}

                            <div className="carrito-discount">
                                <input type="text" placeholder="Codigo de descuento" value={codigoDescuento} onChange={(e) => setCodigoDescuento(e.target.value)} className="carrito-discount__input" />
                                <button className="carrito-discount__btn" onClick={aplicarDescuento}>Aplicar</button>
                            </div>

                            <button className="carrito-checkout-btn" onClick={() => setModalConfirmar(true)}>
                                PROCEDER AL PAGO
                            </button>
                            <button className="carrito-continue-btn" onClick={() => navigate('/tienda')}>SEGUIR COMPRANDO</button>
                        </div>
                    </div>
                )}
            </div>

            <footer className="carrito-footer">2026 M&X Studio. Todos los derechos reservados.</footer>
        </div>
    );
}