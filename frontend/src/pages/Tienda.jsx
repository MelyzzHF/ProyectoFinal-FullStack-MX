import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Tienda.css';

export default function Tienda() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');

  // Modal de edicion
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tabActual, setTabActual] = useState('datos');
  const [mensajeModal, setMensajeModal] = useState({ texto: '', tipo: '' });
  const [formData, setFormData] = useState({
    id: null, name: '', brand: '', basePrice: '', description: '',
    materials_care: '', styling_tips: '', categoryId: '1'
  });

  // Imagenes del producto en edicion
  const [imagenesProducto, setImagenesProducto] = useState([]);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const fileInputRef = useRef(null);

  // CRUD
  const cargarProductos = useCallback(async () => {
    try {
      const response = await api.get(`/items?search=${busqueda}&category=${categoria}&limit=100`);
      setProductos(response.data);
    } catch (error) {
      console.error("Error al cargar productos:", error);
    }
  }, [busqueda, categoria]);

  useEffect(() => { cargarProductos(); }, [cargarProductos]);

  const handleEliminar = async (id) => {
    if (window.confirm('Estas segura de que deseas eliminar esta prenda del catalogo?')) {
      try {
        await api.delete(`/items/${id}`);
        cargarProductos();
      } catch (error) { alert('Error al eliminar la prenda', error); }
    }
  };

  // Modal para editar
  const abrirModalEditar = async (producto) => {
    setFormData({
      id: producto.id,
      name: producto.name,
      brand: producto.brand,
      basePrice: producto.base_price,
      description: producto.description || '',
      materials_care: producto.materials_care || '',
      styling_tips: producto.styling_tips || '',
      categoryId: producto.category_id || '1'
    });
    setMensajeModal({ texto: '', tipo: '' });
    setTabActual('datos');
    setModalAbierto(true);

    // Cargar imagenes del producto
    try {
      const res = await api.get(`/items/${producto.id}`);
      setImagenesProducto(res.data.images || []);
    } catch { setImagenesProducto([]); }
  };

  const cerrarModal = () => { setModalAbierto(false); setImagenesProducto([]); };

  const handleModalChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditarSubmit = async (e) => {
    e.preventDefault();
    setMensajeModal({ texto: '', tipo: '' });
    try {
      await api.put(`/items/${formData.id}`, {
        name: formData.name,
        brand: formData.brand,
        basePrice: formData.basePrice,
        description: formData.description,
        categoryId: formData.categoryId,
        materials_care: formData.materials_care,
        styling_tips: formData.styling_tips
      });
      setMensajeModal({ texto: 'Prenda actualizada exitosamente!', tipo: 'exito' });
      cargarProductos();
      setTimeout(() => setMensajeModal({ texto: '', tipo: '' }), 2000);
    } catch (error) {
      setMensajeModal({ texto: error.response?.data?.error || 'Error al actualizar', tipo: 'error' });
    }
  };

  // Imagenes
  const subirImagenes = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSubiendoImagen(true);
    const data = new FormData();
    for (let i = 0; i < files.length; i++) {
      data.append('images', files[i]);
    }

    try {
      await api.post(`/items/${formData.id}/images`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const res = await api.get(`/items/${formData.id}`);
      setImagenesProducto(res.data.images || []);
      setMensajeModal({ texto: `${files.length} imagen(es) subida(s)`, tipo: 'exito' });
      cargarProductos();
      setTimeout(() => setMensajeModal({ texto: '', tipo: '' }), 2000);
    } catch (error) {
      setMensajeModal({ texto: error.response?.data?.error || 'Error al subir imagenes', tipo: 'error' });
    } finally {
      setSubiendoImagen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const eliminarImagen = async (imageId, isPrimary) => {
    if (isPrimary) {
      setMensajeModal({ texto: 'No se puede eliminar la imagen principal', tipo: 'error' });
      setTimeout(() => setMensajeModal({ texto: '', tipo: '' }), 2000);
      return;
    }
    try {
      await api.delete(`/images/${imageId}`);
      setImagenesProducto(prev => prev.filter(img => img.id !== imageId));
      setMensajeModal({ texto: 'Imagen eliminada', tipo: 'exito' });
      cargarProductos();
      setTimeout(() => setMensajeModal({ texto: '', tipo: '' }), 2000);
    } catch (error) {
      setMensajeModal({ texto: 'Error al eliminar imagen', tipo: error});
    }
  };

  const handleLogout = () => { localStorage.clear(); navigate('/'); };

  return (
    <div className="tienda">

      {/*MODAL DE EDICION CON TABS */}
      {modalAbierto && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content modal-content--wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-header__title">Editar Prenda</h2>
              <button onClick={cerrarModal} className="modal-header__close">X</button>
            </div>
            <div className="modal-tabs">
              <button
                className={`modal-tabs__btn ${tabActual === 'datos' ? 'modal-tabs__btn--active' : ''}`}
                onClick={() => setTabActual('datos')}
              >
                Datos
              </button>
              <button
                className={`modal-tabs__btn ${tabActual === 'imagenes' ? 'modal-tabs__btn--active' : ''}`}
                onClick={() => setTabActual('imagenes')}
              >
                Imagenes ({imagenesProducto.length})
              </button>
            </div>

            {mensajeModal.texto && (
              <p className={`modal-msg ${mensajeModal.tipo === 'error' ? 'modal-msg--error' : 'modal-msg--exito'}`}>
                {mensajeModal.texto}
              </p>
            )}

            {tabActual === 'datos' && (
              <form onSubmit={handleEditarSubmit} className="modal-form">
                <div className="modal-form__row">
                  <div className="modal-form__group">
                    <label className="modal-form__label">Marca</label>
                    <input type="text" name="brand" value={formData.brand} onChange={handleModalChange} required className="modal-form__input" />
                  </div>
                  <div className="modal-form__group">
                    <label className="modal-form__label">Categoria</label>
                    <select name="categoryId" value={formData.categoryId} onChange={handleModalChange} className="modal-form__select">
                      <option value="1">Hombre</option>
                      <option value="2">Mujer</option>
                      <option value="3">Ninos</option>
                    </select>
                  </div>
                </div>

                <div className="modal-form__row">
                  <div className="modal-form__group">
                    <label className="modal-form__label">Nombre de la Prenda</label>
                    <input type="text" name="name" value={formData.name} onChange={handleModalChange} required className="modal-form__input" />
                  </div>
                  <div className="modal-form__group">
                    <label className="modal-form__label">Precio ($)</label>
                    <input type="number" name="basePrice" value={formData.basePrice} onChange={handleModalChange} step="0.01" required className="modal-form__input" />
                  </div>
                </div>

                <div className="modal-form__group">
                  <label className="modal-form__label">Descripcion</label>
                  <textarea name="description" value={formData.description} onChange={handleModalChange} className="modal-form__textarea" />
                </div>

                <div className="modal-form__group">
                  <label className="modal-form__label">Materiales y Cuidados</label>
                  <textarea name="materials_care" value={formData.materials_care} onChange={handleModalChange} className="modal-form__textarea" />
                </div>

                <div className="modal-form__group">
                  <label className="modal-form__label">Tips de Estilo</label>
                  <textarea name="styling_tips" value={formData.styling_tips} onChange={handleModalChange} className="modal-form__textarea" />
                </div>

                <div className="modal-form__actions">
                  <button type="button" onClick={cerrarModal} className="modal-form__cancel-btn">Cancelar</button>
                  <button type="submit" className="modal-form__save-btn">Guardar Cambios</button>
                </div>
              </form>
            )}

            {tabActual === 'imagenes' && (
              <div className="modal-images">
                <div className="modal-images__upload" onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={subirImagenes}
                    style={{ display: 'none' }}
                  />
                  {subiendoImagen ? (
                    <span className="modal-images__upload-text">Subiendo...</span>
                  ) : (
                    <>
                      <div className="modal-images__upload-icon">+</div>
                      <span className="modal-images__upload-text">Click para subir imagenes</span>
                      <span className="modal-images__upload-hint">JPG, PNG - Maximo 5 archivos</span>
                    </>
                  )}
                </div>

                {imagenesProducto.length === 0 ? (
                  <p className="modal-images__empty">Este producto no tiene imagenes.</p>
                ) : (
                  <div className="modal-images__grid">
                    {imagenesProducto.map((img) => (
                      <div key={img.id || img.image_path} className="modal-images__item">
                        <img
                          src={`http://localhost:3000${img.image_path}`}
                          alt="Producto"
                          className="modal-images__preview"
                        />
                        <div className="modal-images__item-info">
                          {img.is_primary ? (
                            <span className="modal-images__badge-primary">PRINCIPAL</span>
                          ) : (
                            <button
                              className="modal-images__delete-btn"
                              onClick={() => eliminarImagen(img.id, img.is_primary)}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <header className="tienda-header">
        <img src="/logo-header.svg" alt="M&X Studio" className="tienda-header__logo-img" onClick={() => navigate('/tienda')} />
        <nav className="tienda-header__nav">
          {['', 'Hombre', 'Mujer', 'Ninos'].map((cat) => (
            <button key={cat} onClick={() => setCategoria(cat)}
              className={`tienda-header__nav-btn ${categoria === cat ? 'tienda-header__nav-btn--active' : ''}`}>
              {cat || 'Todos'}
            </button>
          ))}
        </nav>
        <div className="tienda-header__actions">
          <div className="tienda-header__search-wrap">
            <span className="tienda-header__search-icon">&#128269;</span>
            <input type="text" placeholder="Buscar..." value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)} className="tienda-header__search-input" />
          </div>
          <span className="tienda-header__greeting">Hola, {user.fullName}</span>
          <button className="tienda-header__btn" onClick={() => navigate('/carrito')}>&#128722; CARRITO</button>
          <button className="tienda-header__btn" onClick={() => navigate('/favoritos')}>{'\u2661'} FAVORITOS</button>
          <button className="tienda-header__btn" onClick={() => navigate('/mis-puntos')}>{'\u2605'} PUNTOS</button>
          <button onClick={handleLogout} className="tienda-header__btn tienda-header__btn--logout">SALIR</button>
        </div>
      </header>

      <div className="tienda-hero">
        <div>
          <h2 className="tienda-hero__title">{categoria || 'Catalogo'}</h2>
          <p className="tienda-hero__count">{productos.length} prendas disponibles</p>
        </div>
        {user.role === 'admin' && (
          <button onClick={() => navigate('/agregar-prenda')} className="tienda-admin__btn">+ Agregar Prenda</button>
        )}
      </div>

      <main>
        {productos.length === 0 ? (
          <div className="tienda-empty">
            <h3 className="tienda-empty__title">Aun no hay prendas en el catalogo.</h3>
            {user.role === 'admin' && <p>Usa el boton de arriba para comenzar a agregar inventario.</p>}
          </div>
        ) : (
          <div className="tienda-grid">
            {productos.map((producto) => (
              <div key={producto.id} className="tienda-card">
                <div className="tienda-card__img-container" onClick={() => navigate(`/producto/${producto.id}`)}>
                  {producto.image_path ? (
                    <img src={`http://localhost:3000${producto.image_path}`} alt={producto.name} className="tienda-card__img" />
                  ) : (
                    <div className="tienda-card__placeholder">
                      <div className="tienda-card__placeholder-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </div>
                      <span className="tienda-card__placeholder-text">Sin imagen</span>
                    </div>
                  )}
                  {producto.category_name && <span className="tienda-card__badge">{producto.category_name}</span>}
                </div>
                <div className="tienda-card__body">
                  <span className="tienda-card__brand">{producto.brand || 'M&X Studio'}</span>
                  <h4 className="tienda-card__name">{producto.name}</h4>
                  <p className="tienda-card__price">
                    ${Number(producto.base_price).toFixed(2)}
                  </p>
                </div>
                <button className="tienda-card__ver-mas" onClick={() => navigate(`/producto/${producto.id}`)}>Ver mas</button>
                {user.role === 'admin' && (
                  <div className="tienda-card__admin-actions">
                    <button onClick={() => abrirModalEditar(producto)} className="tienda-card__edit-btn">Editar</button>
                    <button onClick={() => handleEliminar(producto.id)} className="tienda-card__delete-btn">Eliminar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}