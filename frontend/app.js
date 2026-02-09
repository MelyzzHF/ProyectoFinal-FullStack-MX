const API_URL = 'http://localhost:3000';

function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

async function cargarInventario() {
    const lista = document.getElementById('lista-ropa');
    if (!lista) return;

    try {
        const response = await fetch(`${API_URL}/inventario`, { headers: getHeaders() });
        if (response.status === 401 || response.status === 403) return cerrarSesion();

        const productos = await response.json();
        lista.innerHTML = '';
        
        const usuarioEsAdmin = localStorage.getItem('rol') === 'admin';
        document.querySelector('.agregar-box').style.display = usuarioEsAdmin ? 'flex' : 'none';

        productos.forEach(prod => {
            const item = document.createElement('li');
            let botonesHTML = usuarioEsAdmin ? `
                <div class="acciones">
                    <button onclick="editarRopa(${prod.id}, '${prod.title}', '${prod.description}')" class="btn-editar">Editar</button>
                    <button onclick="eliminarRopa(${prod.id})" class="btn-eliminar">Eliminar</button>
                </div>` : '';

            item.innerHTML = `<div><strong>${prod.title}</strong> - ${prod.description}</div> ${botonesHTML}`;
            lista.appendChild(item);
        });
    } catch (error) { console.error("Error:", error); }
}

async function agregarRopa() {
    const nombre = document.getElementById('nombre-ropa').value.trim();
    const precio = document.getElementById('precio-ropa').value.trim();

    if (!nombre || !precio) return alert("Completa todos los campos");

    try {
        const response = await fetch(`${API_URL}/inventario`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ nombre, detalles: precio })
        });
        if (response.ok) {
            cargarInventario();
            document.getElementById('nombre-ropa').value = '';
            document.getElementById('precio-ropa').value = '';
        }
    } catch (error) { alert('Error al agregar'); }
}

async function editarRopa(id, nombreActual, precioActual) {
    const nuevoNombre = prompt("Nuevo nombre:", nombreActual);
    const nuevoPrecio = prompt("Nuevo precio:", precioActual);

    if (!nuevoNombre || !nuevoPrecio) return alert("Los campos son obligatorios");

    try {
        const response = await fetch(`${API_URL}/inventario/${id}`, {
            method: "PUT",
            headers: getHeaders(),
            body: JSON.stringify({ nombre: nuevoNombre.trim(), detalles: nuevoPrecio.trim() })
        });
        if (response.ok) cargarInventario();
    } catch (error) { console.error(error); }
}

async function eliminarRopa(id) {
    if (!confirm("¿Eliminar esta prenda?")) return;
    try {
        const response = await fetch(`${API_URL}/inventario/${id}`, {
            method: 'DELETE',
            headers: getHeaders()
        });
        if (response.ok) cargarInventario();
    } catch (error) { console.error(error); }
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'index.html';
}

if (window.location.pathname.includes('tienda.html')) {
    !localStorage.getItem('token') ? (window.location.href = 'index.html') : cargarInventario();
}