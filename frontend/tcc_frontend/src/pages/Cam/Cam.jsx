import React, { useRef, useState, useEffect } from "react";
import getHostNameSocket from "../../../utils/getUrlSocket";
import Header from "../../components/Header";

export default function Cam() {
  const videoRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [frame, setFrame] = useState("");
  const API_URL = getHostNameSocket();
  const token = localStorage.getItem("access_token") || "";
  const CAMERA_NAME = "cam_ws"; // 🔸 nome da câmera

  // Conexão WebSocket
  useEffect(() => {
    const wsUrl = `${API_URL}/ws?token=${token}`;
    const w = new WebSocket(wsUrl);
    w.binaryType = "arraybuffer";

    w.onopen = () => console.log("WebSocket conectado!");
    w.onmessage = (e) => {
      // Recebe imagem processada
      const blob = new Blob([e.data], { type: "image/jpeg" });
      const url = URL.createObjectURL(blob);
      setFrame(url);
    };
    w.onerror = (e) => console.error("Erro no WebSocket:", e);
    w.onclose = () => console.log("WebSocket fechado.");

    setWs(w);
    return () => w.close();
  }, []);

  // Captura da câmera
  useEffect(() => {
    let streamA;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        streamA = stream;
      })
      .catch((err) => {
        console.error("Erro ao acessar câmera traseira:", err);
        // fallback: tenta câmera padrão
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
          if (videoRef.current) videoRef.current.srcObject = stream;
          streamA = stream;
        });
      });

    return () => {
      if (streamA) {
        streamA.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Envia frames com o nome da câmera
  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;

      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 480;
      const ctx = c.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0, 640, 480);

      // Converte o frame para base64
      const base64Frame = c.toDataURL("image/jpeg", 0.9).split(",")[1];

      // Envia JSON com o nome da câmera + frame
      const payload = JSON.stringify({
        camera_name: CAMERA_NAME,
        frame: base64Frame,
      });

      ws.send(payload);
    }, 80); // 10 fps

    return () => clearInterval(interval);
  }, [ws]);

  return (
    <div className="bg-gray-200 h-screen">
      <Header />
      <div className="flex justify-center" style={{ textAlign: "center" }}>
        <div className="px-5 mt-2 bg-gray-200 pb-5">
          {frame ? (
            <img
              src={frame}
              alt="processed"
              className="rounded-sm h-[80vh] sm:h-[90vh] ring-1 ring-black"
            />
          ) : (
             
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>
              </div>
          )}
          <video ref={videoRef} style={{ display: "none" }} autoPlay />
        </div>
      </div>
    </div>
  );
}
