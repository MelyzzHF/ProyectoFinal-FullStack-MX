const API_URL = 'http://localhost:3000';

async function cargarInventario() {
    const lista = document.getElementById('lista-ropa');
    if (!lista) return;

    try {
        const response = await fetch(`${API_URL}/inventario`);
        const productos = await response.json();

        lista.innerHTML = '';
        productos.forEach(prod => {
            const item = document.createElement('li');
            item.innerHTML = `
                <div>
                    <strong>${prod.title}</strong> 
                    <span>${prod.description}</span>
                </div>
                <div class="acciones">
                    <button onclick="editarRopa(${prod.id}, '${prod.title}', '${prod.description}')" class="btn-editar">Editar</button>
                    <button onclick="eliminarRopa(${prod.id})" class="btn-eliminar">Eliminar</button>
                </div>
            `;
            lista.appendChild(item);
        });
    } catch (error) {
        console.error(error);
    }
}
async function agregarRopa() {
    const nombre = document.getElementById('nombre-ropa').value;
    const precio = document.getElementById('precio-ropa').value;

    if (!nombre || !precio) return alert("Llena ambos campos");

    await fetch(`${API_URL}/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nombre, detalles: precio })
    });

    alert('Prenda agregada');
    cargarInventario();
    document.getElementById('nombre-ropa').value = '';
    document.getElementById('precio-ropa').value = '';
}

async function editarRopa(id, nombreActual, precioActual) {
    const nuevoNombre = prompt("Nuevo nombre:", nombreActual);
    if (nuevoNombre === null) return;

    const nuevoPrecio = prompt("Nuevo precio:", precioActual);
    if (nuevoPrecio === null) return;

    if (!nuevoNombre || !nuevoPrecio) return alert("Ambos campos son obligatorios");

    try {
        const response = await fetch(`${API_URL}/inventario/${id}`, {
            method: "PUT",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: nuevoNombre, detalles: nuevoPrecio })
        });

        if (response.ok) {
            alert('Prenda actualizada');
            cargarInventario();
        } else {
            alert('Error al actualizar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function eliminarRopa(id) {
    if (!confirm("¿Estás seguro de eliminar esta prenda?")) return;

    try {
        const response = await fetch(`${API_URL}/inventario/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Prenda eliminada');
            cargarInventario();
        } else {
            alert('Error al eliminar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }

}

function cerrarSesion() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

if (window.location.pathname.includes('tienda.html')) {
    cargarInventario();
}
