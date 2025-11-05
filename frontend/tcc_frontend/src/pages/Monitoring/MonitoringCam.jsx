import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import getHostNameSocket from "../../../utils/getUrlSocket";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export const MonitoringCam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [camera, setCamera] = useState(null);
  const [fallback, setFallback] = useState(false);
  const [loading, setLoading] = useState(true);

  const canvasRef = useRef(null);
  const closedRef = useRef(false);
  const alertedRef = useRef(false);
  const retryRef = useRef(0);
  const wsRef = useRef(null);
  const lastPaintRef = useRef(0);
  const decodingRef = useRef(false);
  const sendTimerRef = useRef(null);

  const API_URL = getHostName();
  const API_URL_WEBSOCKET = getHostNameSocket();
  const token = localStorage.getItem("access_token") || "";

  useEffect(() => {
    setFallback(false);
    retryRef.current = 0;
  }, [id]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const response = await axios.get(`${API_URL}/cameras/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancel) setCamera(response.data);
      } catch {
        if (!cancel && !alertedRef.current) {
          alertedRef.current = true;
          alert("Não foi possível carregar os dados da câmera.");
          navigate(-1);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id, navigate, API_URL, token]);

  useEffect(() => {
    if (!camera) return;
    let reconnectTimer;

    const paintBlob = async (blob) => {
      if (decodingRef.current) return;
      const now = performance.now();
      if (now - lastPaintRef.current < 66) return;
      decodingRef.current = true;
      try {
        if ("createImageBitmap" in window) {
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

    const startWebSocket = () => {
      if (retryRef.current >= 1) {
        setFallback(true);
        return;
      }
      const wsUrl = `${API_URL_WEBSOCKET}/ws/camera/${camera.id}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";
      closedRef.current = false;
      setFallback(false);

      ws.onopen = () => console.log(`📡 WebSocket tentativa ${retryRef.current + 1}/1 conectada.`);
      

      ws.onmessage = (event) => {
        if (closedRef.current) return;
        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);
            if (data.erro) {
              if (
                data.erro === "timeout_stream" ||
                data.erro === "stream_indisponivel" ||
                data.erro === "conexao_encerrada"
              ) ws.close();
              return;
            }
          } catch {}
        } else {
          retryRef.current = 0;
          const blob = new Blob([event.data], { type: "image/jpeg" });
          paintBlob(blob);
        }
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        if (closedRef.current) return;
        retryRef.current += 1;
        if (retryRef.current < 1) {
          reconnectTimer = setTimeout(startWebSocket, 300);
        } else {
          setFallback(true);
        }
      };
    };

    startWebSocket();

    return () => {
      closedRef.current = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      retryRef.current = 0;
      setFallback(false);
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [camera, API_URL_WEBSOCKET, token]);

  useEffect(() => {
    if (!fallback) return;

    const video = document.createElement("video");
    video.src = "/1029.mp4";
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    document.body.appendChild(video);
    video.style.position = "absolute";
    video.style.left = "-9999px";

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const wsUrl = `${API_URL_WEBSOCKET}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    const paintBlob = async (blob) => {
      if (decodingRef.current) return;
      const now = performance.now();
      if (now - lastPaintRef.current < 66) return;
      decodingRef.current = true;
      try {
        if ("createImageBitmap" in window) {
          const bmp = await createImageBitmap(blob);
          const c = canvasRef.current;
          if (!c) return;
          if (c.width !== bmp.width || c.height !== bmp.height) {
            c.width = bmp.width;
            c.height = bmp.height;
          }
          const cctx = c.getContext("2d");
          cctx.drawImage(bmp, 0, 0);
          bmp.close();
          setLoading(false);
        } else {
          const url = URL.createObjectURL(blob);
          const img = new Image();
          img.onload = () => {
            const c = canvasRef.current;
            if (!c) return;
            if (c.width !== img.naturalWidth || c.height !== img.naturalHeight) {
              c.width = img.naturalWidth;
              c.height = img.naturalHeight;
            }
            const cctx = c.getContext("2d");
            cctx.drawImage(img, 0, 0);
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

    ws.onopen = () => console.log("🎥 WebSocket fallback conectado");

    ws.onmessage = (event) => {
      const blob = new Blob([event.data], { type: "image/jpeg" });
      paintBlob(blob);
    };

    ws.onerror = (err) => console.error("Erro WS fallback:", err);
    ws.onclose = () => console.log("❌ WS fallback fechado");

    const sendFrame = () => {
      if (video.readyState >= 2 && ws.readyState === WebSocket.OPEN) {
        canvas.width = video.videoWidth || 0;
        canvas.height = video.videoHeight || 0;
        if (canvas.width && canvas.height && ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (!blob) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                if (ws.readyState !== WebSocket.OPEN) return;
                const b64 = String(reader.result).split(",")[1];
                ws.send(JSON.stringify({ camera_name: "demo_apresentacao", frame: b64 }));
              };
              reader.readAsDataURL(blob);
            },
            "image/jpeg",
            0.7
          );
        }
      }
      sendTimerRef.current = setTimeout(sendFrame, 100);
    };

    video.addEventListener("play", sendFrame);
    video.play().catch((err) => console.error("Erro ao tocar vídeo:", err));

    return () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
      try {
        ws.close();
      } catch {}
      video.remove();
    };
  }, [fallback, API_URL_WEBSOCKET, token]);

  return (
    <>
      <Header />
      <div className="p-4 flex flex-col items-center justify-center relative">
        <h2 className="text-xl font-bold mb-4">Visualizando: {camera?.name || "..."}</h2>
        <div className="relative sm:w-1/2 flex flex-col items-center">
          {fallback && <h3 className="text-lg mb-2">🎬 Simulação ao vivo (vídeo processado)</h3>}
          <div className="relative w-full">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>
              </div>
            )}
            <canvas ref={canvasRef} className="rounded border object-cover w-full" />
          </div>
        </div>
      </div>
    </>
  );
};