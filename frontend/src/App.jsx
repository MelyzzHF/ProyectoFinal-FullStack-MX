import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Tienda from './pages/Tienda';
import AgregarPrenda from './pages/AgregarPrenda'; // <-- 1. Importa el nuevo componente

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/tienda" element={<Tienda />} />
        {/* 2. Añade la ruta aquí abajo */}
        <Route path="/agregar-prenda" element={<AgregarPrenda />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;