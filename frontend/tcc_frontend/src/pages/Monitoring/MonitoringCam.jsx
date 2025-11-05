import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import getHostNameSocket from "../../../utils/getUrlSocket";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export const MonitoringCam = () => {
  const { id } = useParams();

  const [camera, setCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fallback, setFallback] = useState(false);

  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const decodingRef = useRef(false);
  const lastPaintRef = useRef(0);
  const sendTimerRef = useRef(null);

  const API_URL = getHostName();
  const API_URL_WEBSOCKET = getHostNameSocket();
  const token = localStorage.getItem("access_token") || "";

  // 🔹 Carrega informações da câmera
  useEffect(() => {
    axios
      .get(`${API_URL}/cameras/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCamera(res.data))
      .catch(() => {
        alert("Erro ao carregar dados da câmera.");
        setFallback(true);
      });
  }, [id, API_URL, token]);

  // 🔹 Exibe imagem vinda do servidor
  const paintBlob = async (blob) => {
    if (decodingRef.current) return;
    const now = performance.now();
    if (now - lastPaintRef.current < 66) return; // ~15fps
    decodingRef.current = true;

    try {
      const bitmap = await createImageBitmap(blob);
      const c = canvasRef.current;
      if (!c) return;

      if (c.width !== bitmap.width || c.height !== bitmap.height) {
        c.width = bitmap.width;
        c.height = bitmap.height;
      }

      c.getContext("2d").drawImage(bitmap, 0, 0);
      bitmap.close();
      setLoading(false);
      lastPaintRef.current = performance.now();
    } finally {
      decodingRef.current = false;
    }
  };

  // 🔹 Conexão principal WebSocket
  useEffect(() => {
    if (!camera) return;

    const ws = new WebSocket(`${API_URL_WEBSOCKET}/ws/camera/${camera.id}?token=${token}`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data === "string") return;
      const blob = new Blob([event.data], { type: "image/jpeg" });
      paintBlob(blob);
    };

    ws.onerror = () => setFallback(true);
    ws.onclose = () => setFallback(true);

    return () => ws.close();
  }, [camera, API_URL_WEBSOCKET, token]);

  // 🔹 Fallback: envia frames de um vídeo local
  useEffect(() => {
    if (!fallback) return;

    const video = document.createElement("video");
    video.src = "/1029.mp4"; // arquivo local
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    document.body.appendChild(video);
    video.style.display = "none";

    const canvasTemp = document.createElement("canvas");
    const ctx = canvasTemp.getContext("2d");

    const ws = new WebSocket(`${API_URL_WEBSOCKET}/ws?token=${token}`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onmessage = (e) => {
      const blob = new Blob([e.data], { type: "image/jpeg" });
      paintBlob(blob);
    };

    const sendFrame = () => {
      if (video.readyState >= 2 && ws.readyState === WebSocket.OPEN) {
        canvasTemp.width = video.videoWidth;
        canvasTemp.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvasTemp.width, canvasTemp.height);
        canvasTemp.toBlob((blob) => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            const b64 = String(reader.result).split(",")[1];
            ws.send(JSON.stringify({ camera_name: "fallback_demo", frame: b64 }));
          };
          reader.readAsDataURL(blob);
        }, "image/jpeg", 0.7);
      }
      sendTimerRef.current = setTimeout(sendFrame, 100);
    };

    video.addEventListener("play", sendFrame);
    video.play().catch(console.error);

    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      ws.close();
      video.remove();
    };
  }, [fallback, API_URL_WEBSOCKET, token]);

  return (
    <>
      <Header />
      <div className="p-4 flex flex-col items-center justify-center relative">
        <h2 className="text-xl font-bold mb-4">
          Visualizando: {camera?.name || "Câmera"}
        </h2>

        {fallback && (
          <h3 className="text-lg mb-2 text-gray-700">
            🎬 Simulação ao vivo (modo fallback)
          </h3>
        )}

        <div className="relative sm:w-1/2 flex flex-col items-center">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="rounded border object-cover w-full"
          />
        </div>
      </div>
    </>
  );
};
