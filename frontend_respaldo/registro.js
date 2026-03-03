const API_URL = 'http://localhost:3000';

function mostrarVista(vista) {
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('active'));
    document.getElementById('vista-' + vista).classList.add('active');
}

function mostrarMensaje(idMensaje, texto, tipo) {
    const mensaje = document.getElementById(idMensaje);
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
    mensaje.style.display = 'block';
}

async function login(event) {
    event.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) return mostrarMensaje('mensaje-login', 'Completa todos los campos', 'error');

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', data.usuario.username);
            localStorage.setItem('rol', data.usuario.role);
            window.location.href = 'tienda.html';
        } else {
            mostrarMensaje('mensaje-login', data.error, 'error');
        }
    } catch (error) {
        mostrarMensaje('mensaje-login', 'Error de conexión', 'error');
    }
}

async function registro(event) {
    event.preventDefault();
    const username = document.getElementById('registro-nombre').value.trim(); 
    const email = document.getElementById('registro-email').value.trim();
    const password = document.getElementById('registro-password').value;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (username.length < 3) return mostrarMensaje('mensaje-registro', 'Nombre muy corto', 'error');
    if (!emailRegex.test(email)) return mostrarMensaje('mensaje-registro', 'Correo inválido', 'error');
    if (password.length < 6) return mostrarMensaje('mensaje-registro', 'Contraseña mínima: 6 caracteres', 'error');

    try {
        const response = await fetch(`${API_URL}/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }) 
        });

        const data = await response.json();
        if (response.ok) {
            mostrarMensaje('mensaje-registro', '¡Registro exitoso!', 'exito');
            setTimeout(() => mostrarVista('login'), 2000);
        } else {
            mostrarMensaje('mensaje-registro', data.error, 'error');
        }
    } catch (error) {
        mostrarMensaje('mensaje-registro', 'Error de conexión', 'error');
    }
}