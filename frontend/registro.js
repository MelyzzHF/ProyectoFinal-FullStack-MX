const API_URL = 'http://localhost:3000';

function mostrarVista(vista) {
    document.querySelectorAll('.vista').forEach(v => v.classList.remove('active'));
    document.getElementById('vista-' + vista).classList.add('active');
    document.querySelectorAll('.mensaje').forEach(m => m.style.display = 'none');
}

function mostrarMensaje(idMensaje, texto, tipo) {
    const mensaje = document.getElementById(idMensaje);
    mensaje.textContent = texto;
    mensaje.className = `mensaje ${tipo}`;
    mensaje.style.display = 'block';
}

async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

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
            mostrarMensaje('mensaje-login', 'Inicio de sesión exitoso', 'exito');
            setTimeout(() => {
                window.location.href = 'tienda.html';
            }, 1000);
        } else {
            mostrarMensaje('mensaje-login', data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('mensaje-login', 'No se pudo conectar al servidor', 'error');
    }
}

async function registro(event) {
    event.preventDefault();
    
    const username = document.getElementById('registro-nombre').value; 
    const email = document.getElementById('registro-email').value;
    const password = document.getElementById('registro-password').value;
    try {
        const response = await fetch(`${API_URL}/registro`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }) 
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensaje('mensaje-registro', 'Registro exitoso. Cambiando a login...', 'exito');
            setTimeout(() => {
                mostrarVista('login');
                document.getElementById('registro-nombre').value = '';
                document.getElementById('registro-email').value = '';
                document.getElementById('registro-password').value = '';
            }, 2000);
        } else {
            mostrarMensaje('mensaje-registro', data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('mensaje-registro', 'No se pudo conectar al servidor', 'error');
    }
}