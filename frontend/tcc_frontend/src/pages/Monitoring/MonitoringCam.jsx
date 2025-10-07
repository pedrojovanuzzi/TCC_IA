import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import getHostNameSocket from "../../../utils/getUrlSocket";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export const MonitoringCam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [frame, setFrame] = useState(null); // URL do blob
  const [camera, setCamera] = useState(null);
  const closedRef = useRef(false);
  const alertedRef = useRef(false);
  const API_URL = getHostName();
  const API_URL_WEBSOCKET = getHostNameSocket();

  // Busca metadados da câmera
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const response = await axios.get(`${API_URL}/cameras/${id}`);
        if (!cancel) setCamera(response.data);
      } catch (error) {
        console.error("Erro ao buscar dados da câmera:", error);
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
  }, [id, navigate, API_URL]);

  // WebSocket
useEffect(() => {
  if (!camera) return;
  let ws;
  let reconnectTimer;

  const connect = () => {
    ws = new WebSocket(`${API_URL_WEBSOCKET}/ws/camera/${camera.id}`);
    ws.binaryType = "arraybuffer";

    closedRef.current = false;

    ws.onmessage = (event) => {
      if (closedRef.current) return;

      if (typeof event.data === "string") {
        try {
          const data = JSON.parse(event.data);
          if (data.erro) {
            console.warn("Erro vindo do backend:", data);
            return; // só loga, não derruba a tela
          }
        } catch (e) {
          console.error("Falha ao parsear mensagem WS:", e);
        }
      } else {
        const blob = new Blob([event.data], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);

        if (frame) URL.revokeObjectURL(frame);
        setFrame(url);
      }
    };

    ws.onerror = (err) => {
      console.error("Erro no WebSocket:", err);
      ws.close();
    };

    ws.onclose = () => {
      if (closedRef.current) return;
      console.warn("WebSocket fechado. Tentando reconectar em 2s...");
      reconnectTimer = setTimeout(connect, 2000);
    };
  };

  connect();

  return () => {
    closedRef.current = true;
    if (frame) URL.revokeObjectURL(frame);
    clearTimeout(reconnectTimer);
    try { ws && ws.close(); } catch {}
  };
}, [camera, API_URL_WEBSOCKET]);


  return (
    <>
      <Header />
      <div className="p-4 flex flex-col items-center justify-center">
        <h2 className="text-xl font-bold mb-4">
          Visualizando: {camera?.name || "..."}
        </h2>

        {frame ? (
          <img
            src={frame}
            alt="Frame da câmera"
            className="rounded border sm:w-1/2"
          />
        ) : (
          <p>🔄 Carregando stream da câmera...</p>
        )}
      </div>
    </>
  );
};
