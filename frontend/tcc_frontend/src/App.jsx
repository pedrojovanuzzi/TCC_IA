import { Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound/NotFound";
import Cam from "./pages/Cam/Cam";
import Home from "./pages/Home/Home";

export default function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Cam" element={<Cam />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
  );
}
