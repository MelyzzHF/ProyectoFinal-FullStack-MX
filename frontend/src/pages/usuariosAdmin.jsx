import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './usuariosAdmin.css';

const UsuariosAdmin = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const cargarUsuarios = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Error al cargar usuarios o acceso denegado');
            }

            const data = await response.json();
            setUsuarios(data);
        } catch (err) {
            setError(err.message);
        }
    };

   useEffect(() => {
    const userString = localStorage.getItem('usuario') || localStorage.getItem('user'); 
    
    if (!userString) {
      alert("No hay datos");
      return;
    }

    const userLocal = JSON.parse(userString);
    
    if (userLocal.role === 'admin') {
      cargarUsuarios(); 
    }}, []);


    const eliminarUsuario = async (id) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3000/api/users/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Error al eliminar');
            }

            setUsuarios(usuarios.filter(user => user.id !== id));
            alert('Usuario eliminado correctamente');
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="admin-usuarios-container">
            <div className="admin-header">
                <h2>Gestión de Usuarios</h2>
                <button onClick={() => navigate('/tienda')}>Volver a la Tienda</button>
            </div>

            {error && <p className="error-msg">{error}</p>}

            <table className="usuarios-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Correo</th>
                        <th>Rol</th>
                        <th>Puntos</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map(user => (
                        <tr key={user.id}>
                            <td>{user.id}</td>
                            <td>{user.full_name}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>{user.points || 0}</td>
                            <td>
                                {user.role !== 'admin' && (
                                    <button
                                        className="btn-eliminar"
                                        onClick={() => eliminarUsuario(user.id)}
                                    >
                                        Eliminar
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UsuariosAdmin;