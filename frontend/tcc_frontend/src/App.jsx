import { Routes, Route } from "react-router-dom";
import NotFound from "./pages/NotFound/NotFound";
import Cam from "./pages/Cam/Cam";
import Home from "./pages/Home/Home";
import About from "./pages/About/About";
import Options from "./pages/Options/Options";
import Video from "./pages/Video/Video";
import Photo from "./pages/Photo/Photo";
import { Gallery } from "./pages/Gallery/Gallery";

export default function App() {
  return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/options" element={<Options />} />
        <Route path="/video" element={<Video />} />
        <Route path="/foto" element={<Photo />} />
        <Route path="/Cam" element={<Cam />} />
        <Route path="/about" element={<About />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/videos"/>
        <Route path="*" element={<NotFound />} />
      </Routes>
  );
}
