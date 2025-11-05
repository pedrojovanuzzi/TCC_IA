import React, { useRef, useState, useEffect } from "react";
import getHostNameSocket from "../../../utils/getUrlSocket";
import Header from "../../components/Header";

export default function Cam() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const API_URL = getHostNameSocket();
  const token = localStorage.getItem("access_token") || "";
  const CAMERA_NAME = "cam_ws";

  // Abre conexão WebSocket e renderiza frames recebidos
  useEffect(() => {
    const w = new WebSocket(`${API_URL}/ws?token=${token}`);
    w.binaryType = "arraybuffer";
    wsRef.current = w;

    w.onmessage = async (e) => {
      if (typeof e.data === "string") return;
      const blob = new Blob([e.data], { type: "image/jpeg" });
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
    };

    return () => w.close();
  }, [API_URL, token]);

  // Acessa a câmera
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setLoading(true));

    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Captura e envia frames ao servidor
  useEffect(() => {
    const sendFrame = () => {
      const ws = wsRef.current;
      const video = videoRef.current;
      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return;

      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 480;
      c.getContext("2d").drawImage(video, 0, 0, 640, 480);

      c.toBlob((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onloadend = () => {
          if (ws.readyState !== WebSocket.OPEN) return;
          const b64 = String(reader.result).split(",")[1];
          ws.send(JSON.stringify({ camera_name: CAMERA_NAME, frame: b64 }));
        };
        reader.readAsDataURL(blob);
      }, "image/jpeg", 0.7);
    };

    const timer = setInterval(sendFrame, 100);
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
          <canvas ref={canvasRef} className="rounded border object-cover w-full" />
          <video ref={videoRef} style={{ display: "none" }} autoPlay />
        </div>
      </div>
    </div>
  );
}
