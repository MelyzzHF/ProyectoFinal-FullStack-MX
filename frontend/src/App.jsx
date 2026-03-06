import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Tienda from './pages/Tienda';
import VerMas from './pages/verMas';
import Carrito from './pages/carrito';
import Favoritos from './pages/Favoritos';
import Puntos from './pages/Puntos';
import AgregarPrenda from './pages/AgregarPrenda';
import UsuariosAdmin from './pages/usuariosAdmin';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/tienda" element={<Tienda />} />
        <Route path="/producto/:id" element={<VerMas />} />
        <Route path="/carrito" element={<Carrito />} />
        <Route path="/favoritos" element={<Favoritos />} />
        <Route path="/mis-puntos" element={<Puntos />} />
        <Route path="/agregar-prenda" element={<AgregarPrenda />} />
        <Route path="/admin/usuarios" element={<UsuariosAdmin />} />
      </Routes>
    </Router>
  );
}

export default App;


