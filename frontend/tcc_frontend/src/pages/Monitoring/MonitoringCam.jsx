import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import getHostNameSocket from "../../../utils/getUrlSocket";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export const MonitoringCam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [frame, setFrame] = useState(null);
  const [camera, setCamera] = useState(null);
  const [fallback, setFallback] = useState(false);
  const closedRef = useRef(false);
  const alertedRef = useRef(false);
  const retryRef = useRef(0);
  const wsRef = useRef(null);
  const API_URL = getHostName();
  const API_URL_WEBSOCKET = getHostNameSocket();
  const token = localStorage.getItem("access_token") || "";

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

    const startWebSocket = () => {
      if (retryRef.current >= 2) {
        console.warn("🛑 Máximo de tentativas atingido — exibindo vídeo local.");
        setFallback(true);
        return;
      }

      const wsUrl = `${API_URL_WEBSOCKET}/ws/camera/${camera.id}?token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = "arraybuffer";
      closedRef.current = false;
      setFallback(false);

      ws.onopen = () => {
        console.log(`📡 WebSocket tentativa ${retryRef.current + 1}/1 conectada.`);
      };

      ws.onmessage = (event) => {
        if (closedRef.current) return;
        if (typeof event.data === "string") {
          try {
            const data = JSON.parse(event.data);
            if (data.erro) {
              console.warn("⚠️ Erro vindo do backend:", data);
              if (
                data.erro === "timeout_stream" ||
                data.erro === "stream_indisponivel" ||
                data.erro === "conexao_encerrada"
              ) {
                ws.close();
              }
              return;
            }
          } catch {}
        } else {
          // 🔹 se recebeu frame, zerar o contador
          retryRef.current = 0;
          const blob = new Blob([event.data], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          if (frame) URL.revokeObjectURL(frame);
          setFrame(url);
        }
      };

      ws.onerror = () => {
        ws.close();
      };

      ws.onclose = () => {
        if (closedRef.current) return;
        retryRef.current += 1; // 🔹 incrementa fora do escopo
        console.warn(`❌ Tentativa ${retryRef.current}/1 falhou.`);
        if (retryRef.current < 1) {
          reconnectTimer = setTimeout(startWebSocket, 300);
        } else {
          console.warn("🛑 Câmera inacessível — exibindo vídeo local.");
          setFallback(true);
        }
      };
    };

    startWebSocket();

    return () => {
      closedRef.current = true;
      if (frame) URL.revokeObjectURL(frame);
      clearTimeout(reconnectTimer);
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [camera, API_URL_WEBSOCKET, token]);

  return (
    <>
      <Header />
      <div className="p-4 flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-4">
          Visualizando: {camera?.name || "..."}
        </h2>

        {fallback ? (
          <video
            src="/1029.mp4"
            autoPlay
            muted
            loop
            playsInline
            controls={false}
            className="rounded border sm:w-1/2 object-cover"
          />
        ) : frame ? (
          <img
            src={frame}
            alt="Frame da câmera"
            className="rounded border sm:w-1/2 object-cover"
          />
        ) : (
          <p>🔄 Tentando conectar à câmera...</p>
        )}
      </div>
    </>
  );
};
