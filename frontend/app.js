const API_URL = 'http://localhost:3000';

async function login() {
    const email = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pass })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            window.location.href = 'tienda.html';
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('No se pudo conectar al servidor.');
    }
}

async function cargarInventario() {
    const lista = document.getElementById('lista-ropa');
    if (!lista) return;

    try {
        const response = await fetch(`${API_URL}/inventario`);
        const productos = await response.json();

        lista.innerHTML = '';
        productos.forEach(prod => {
            const item = document.createElement('li');
            item.innerHTML = `<strong>${prod.title}</strong> <span>${prod.description}</span>`;
            lista.appendChild(item);
        });
    } catch (error) {
        console.error(error);
    }
}

async function agregarRopa() {
    const nombre = document.getElementById('nombre-ropa').value;
    const precio = document.getElementById('precio-ropa').value;

    if(!nombre || !precio) return alert("Llena ambos campos");

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

function cerrarSesion() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

if (window.location.pathname.includes('tienda.html')) {
    cargarInventario();
}
