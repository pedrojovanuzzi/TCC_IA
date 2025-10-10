import React, { useRef, useState, useEffect } from "react";
import getHostNameSocket from "../../../utils/getUrlSocket";
import Header from '../../components/Header';

export default function Cam() {
  const videoRef = useRef(null); // referência do <video>
  const [ws, setWs] = useState(null); // conexão websocket
  const [frame, setFrame] = useState(""); // frame recebido
  const API_URL = getHostNameSocket();

  // Conexão WebSocket
  useEffect(() => {
    const wsUrl = `${API_URL}/ws`;
    const w = new WebSocket(wsUrl);

    w.binaryType = "arraybuffer"; // vamos trabalhar com binário

    w.onopen = () => console.log("WebSocket conectado!");
    w.onmessage = (e) => {
      // Criar Blob a partir do ArrayBuffer recebido
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

    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } } // traseira
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
        streamA.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Envia frames como Blob
  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 480;
      c.getContext("2d").drawImage(videoRef.current, 0, 0, 640, 480);

      c.toBlob((blob) => {
        if (blob) {
          ws.send(blob); // envia o blob binário direto
        }
      }, "image/jpeg", 1);
    }, 80);

    return () => clearInterval(interval);
  }, [ws]);

  return (
    <div className="bg-gray-200 h-screen">
      <Header />
      <div className="flex justify-center " style={{ textAlign: "center" }}>
        <div className="px-5 mt-2 bg-gray-200 pb-5">
          {frame && (
            <img
              src={frame}
              alt="processed"
              className="rounded-sm h-[80vh] sm:h-[90vh] ring-1 ring-black "
            />
          )}
          {!frame && (
            <h1 className="text-3xl font-semibold text-gray-200">
              Video Ainda Não Iniciado
            </h1>
          )}
          <video ref={videoRef} style={{ display: "none" }} autoPlay />
        </div>
      </div>
    </div>
  );
}
