import React, { useRef, useState, useEffect } from "react";
import getHostNameSocket from "../../../utils/getUrlSocket";
import Header from "../../components/Header";

export default function Cam() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const decodingRef = useRef(false);
  const lastPaintRef = useRef(0);

  const [loading, setLoading] = useState(true);

  const API_URL = getHostNameSocket();
  const token = localStorage.getItem("access_token") || "";
  const CAMERA_NAME = "cam_ws"; // nome da câmera

  // Conexão WebSocket
  useEffect(() => {
    const wsUrl = `${API_URL}/ws?token=${token}`;
    const w = new WebSocket(wsUrl);
    w.binaryType = "arraybuffer";
    wsRef.current = w;

    w.onopen = () => console.log("📡 WebSocket conectado!");

    // Renderiza frames recebidos
    w.onmessage = async (e) => {
      if (typeof e.data === "string") return;
      const blob = new Blob([e.data], { type: "image/jpeg" });

      // controla taxa de frames (≈15fps)
      const now = performance.now();
      if (decodingRef.current || now - lastPaintRef.current < 66) return;
      decodingRef.current = true;

      try {
        if ("createImageBitmap" in window) {
          // cria bitmap direto (muito mais leve que <img>)
          const bitmap = await createImageBitmap(blob);
          const c = canvasRef.current;
          if (!c) return;

          if (c.width !== bitmap.width || c.height !== bitmap.height) {
            c.width = bitmap.width;
            c.height = bitmap.height;
          }

          const ctx = c.getContext("2d");
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          setLoading(false);
        } else {
          // fallback caso createImageBitmap não exista
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const c = canvasRef.current;
            if (!c) return;
            if (c.width !== img.naturalWidth || c.height !== img.naturalHeight) {
              c.width = img.naturalWidth;
              c.height = img.naturalHeight;
            }
            const ctx = c.getContext("2d");
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            setLoading(false);
          };
          img.onerror = () => URL.revokeObjectURL(url);
          img.src = url;
        }
        lastPaintRef.current = performance.now();
      } finally {
        decodingRef.current = false;
      }
    };

    w.onerror = (e) => console.error("Erro no WebSocket:", e);
    w.onclose = () => console.log("❌ WebSocket fechado");

    return () => {
      try {
        w.close();
      } catch {}
    };
  }, [API_URL, token]);

  // Captura da câmera e envia frames
  useEffect(() => {
    let streamA;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } } })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
        streamA = stream;
      })
      .catch((err) => {
        console.error("Erro ao acessar câmera traseira:", err);
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

  // Envia frames capturados
  useEffect(() => {
    const sendFrame = () => {
      const ws = wsRef.current;
      const video = videoRef.current;
      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return;

      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 480;
      const ctx = c.getContext("2d");
      ctx.drawImage(video, 0, 0, 640, 480);

      c.toBlob(
        (blob) => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            if (ws.readyState !== WebSocket.OPEN) return;
            const b64 = String(reader.result).split(",")[1];
            ws.send(JSON.stringify({ camera_name: CAMERA_NAME, frame: b64 }));
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.7
      );
    };

    const timer = setInterval(sendFrame, 100); // ~10fps
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gray-200 h-screen">
      <Header />
      <div className="flex justify-center p-4">
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
          <video ref={videoRef} style={{ display: "none" }} autoPlay />
        </div>
      </div>
    </div>
  );
}
