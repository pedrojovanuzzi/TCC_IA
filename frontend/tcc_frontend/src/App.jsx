import { Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound/NotFound";
import Cam from "./pages/Cam/Cam";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import Options from "./pages/Options/Options";
import Video from "./pages/Video/Video";
import Photo from "./pages/Photo/Photo";
import { Gallery } from "./pages/Gallery/Gallery";
import Login from "./pages/Login/Login";
import ProtectedRoute from "./components/Protected";
import CamSahi from "./pages/CamSahi/CamSahi";
import { Monitoring } from "./pages/Monitoring/Monitoring";
import { MonitoringCam } from "./pages/Monitoring/MonitoringCam";
import { Users } from "./pages/Users/Users";
import AcessoNegado from "./pages/AcessoNegado/AcessoNegado";
import { Logs } from "./pages/Logs/Logs";
export default function App() {
  return (
    <Routes>
      {/* Rota de Login (não precisa ser protegida) */}
      <Route path="/login" element={<Login />} />

      {/* Rotas Protegidas */}
      <Route path="/" element={<Home/>}/>
      <Route path="/acesso-negado" element={<AcessoNegado/>}/>
      <Route path="/options" element={<ProtectedRoute element={<Options />} />} />
      <Route path="/video" element={<ProtectedRoute element={<Video />} minPermission={2}  />} />
      <Route path="/foto" element={<ProtectedRoute element={<Photo />} minPermission={2}  />} />
      <Route path="/cam" element={<ProtectedRoute element={<Cam />} />} />
      <Route path="/camsahi" element={<ProtectedRoute element={<CamSahi />} />} />
      <Route path="/about" element={<About />}/>
      <Route path="/logs" element={<ProtectedRoute element={<Logs />} minPermission={2} />} />
      <Route path="/gallery" element={<ProtectedRoute element={<Gallery />} minPermission={3} />} />
      <Route path="/users" element={<ProtectedRoute element={<Users />} minPermission={3}  />} />
      <Route path="/monitoring" element={<ProtectedRoute element={<Monitoring />} minPermission={2}  />} />
      <Route path="/monitoring/:id" element={<ProtectedRoute element={<MonitoringCam />} minPermission={2}  />} />

      {/* Rota inválida */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
