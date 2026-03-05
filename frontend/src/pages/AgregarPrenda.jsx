import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function AgregarPrenda() {
  const navigate = useNavigate();
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });

  // Estado para guardar todos los campos del formulario
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    brand: '',
    basePrice: '',
    description: '',
    materialsCare: '',
    stylingTips: '',
    categoryId: '1'
  });

  const [image, setImage] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });

    const data = new FormData();
    data.append('sku', formData.sku);
    data.append('name', formData.name);
    data.append('brand', formData.brand);
    data.append('basePrice', formData.basePrice);
    data.append('description', formData.description);
    data.append('materialsCare', formData.materialsCare);
    data.append('stylingTips', formData.stylingTips);
    data.append('categoryId', formData.categoryId);

    if (image) {
      data.append('image', image);
    } else {
      setMensaje({ texto: 'Por favor, selecciona una imagen para la prenda.', tipo: 'error' });
      return;
    }

    try {
      await api.post('/items', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setMensaje({ texto: '¡Prenda guardada exitosamente en el catálogo!', tipo: 'exito' });
      setTimeout(() => navigate('/tienda'), 2000);
    } catch (error) {
      setMensaje({ texto: error.response?.data?.error || 'Error al guardar la prenda.', tipo: 'error' });
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <button onClick={() => navigate('/tienda')} className="btn-secondary" style={{ width: 'auto', marginBottom: '20px', padding: '5px 15px' }}>
        ← Volver a la Tienda
      </button>

      <div style={{ backgroundColor: 'var(--card-bg)', padding: '30px', borderRadius: '4px', border: '1px solid var(--input-border)' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '15px' }}>Alta de Nueva Prenda</h2>

        {mensaje.texto && (
          <p style={{ color: mensaje.tipo === 'error' ? 'var(--danger-soft)' : 'var(--accent-olive)', fontWeight: 'bold' }}>
            {mensaje.texto}
          </p>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>SKU (Código único)</label>
              <input type="text" name="sku" value={formData.sku} onChange={handleChange} placeholder="Ej: CAM-001" required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Marca</label>
              <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="Ej: Zara" required />
            </div>
          </div>

          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nombre de la Prenda</label>
          <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Camiseta Básica de Algodón" required />

          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Precio ($)</label>
              <input type="number" name="basePrice" value={formData.basePrice} onChange={handleChange} placeholder="299.99" step="0.01" required />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Categoría</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleChange}
                style={{ width: '100%', padding: '12px', border: '1px solid var(--input-border)', backgroundColor: '#fafafa', fontFamily: 'var(--font-sans)' }}
              >
                <option value="1">Hombre</option>
                <option value="2">Mujer</option>
                <option value="3">Niños</option>
              </select>
            </div>
          </div>

          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Descripción de la prenda</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Qué es, cómo es..."
            style={{ width: '100%', padding: '12px', border: '1px solid var(--input-border)', minHeight: '80px', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
            required
          />

          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Materiales y Cuidados</label>
          <textarea
            name="materialsCare"
            value={formData.materialsCare}
            onChange={handleChange}
            placeholder="Materiales, cuidados..."
            style={{ width: '100%', padding: '12px', border: '1px solid var(--input-border)', minHeight: '80px', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
            required
          />

           <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Como Combinarlo</label>
          <textarea
            name="stylingTips"
            value={formData.stylingTips}
            onChange={handleChange}
            placeholder="Cómo usarlo, qué combina..."
            style={{ width: '100%', padding: '12px', border: '1px solid var(--input-border)', minHeight: '80px', fontFamily: 'var(--font-sans)', boxSizing: 'border-box' }}
            required
          />

          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Imagen Principal</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ padding: '10px', backgroundColor: '#fff' }}
            required
          />

          <button type="submit" className="btn-success" style={{ marginTop: '15px' }}>Guardar Prenda</button>
        </form>
      </div>
    </div>
  );
}