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
  const [timestamp, setTimestamp] = useState("");
  const closedRef = useRef(false);
  const alertedRef = useRef(false);
  const retryRef = useRef(0);
  const wsRef = useRef(null);
  const API_URL = getHostName();
  const API_URL_WEBSOCKET = getHostNameSocket();
  const token = localStorage.getItem("access_token") || "";

  useEffect(() => {
    setFallback(false);
    setFrame(null);
    retryRef.current = 0;
  }, [id]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const dia = String(now.getDate()).padStart(2, "0");
      const mes = String(now.getMonth() + 1).padStart(2, "0");
      const ano = now.getFullYear();
      const hora = String(now.getHours()).padStart(2, "0");
      const min = String(now.getMinutes()).padStart(2, "0");
      const seg = String(now.getSeconds()).padStart(2, "0");
      const diaSemana = dias[now.getDay()];
      setTimestamp(`${dia}-${mes}-${ano} ${hora}:${min}:${seg} ${diaSemana}`);
    };
    const timer = setInterval(updateTime, 1000);
    updateTime();
    return () => clearInterval(timer);
  }, []);

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

      ws.onopen = () => {
        console.log(
          `📡 WebSocket tentativa ${retryRef.current + 1}/1 conectada.`
        );
      };

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
              ) {
                ws.close();
              }
              return;
            }
          } catch {}
        } else {
          retryRef.current = 0;
          const blob = new Blob([event.data], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);
          if (frame) URL.revokeObjectURL(frame);
          setFrame(url);
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
      if (frame) URL.revokeObjectURL(frame);
      clearTimeout(reconnectTimer);
      retryRef.current = 0;
      setFallback(false);
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [camera, API_URL_WEBSOCKET, token]);

  return (
    <>
      <Header />
      <div className="p-4 flex flex-col items-center justify-center relative">
        <h2 className="text-xl font-bold mb-4">
          Visualizando: {camera?.name || "..."}
        </h2>

        {fallback && 
        <>
        <h1 className="text-2xl mb-2">Fallback Para Apresentação</h1>
        </>
        }

        <div className="relative sm:w-1/2">
          {fallback ? (
            <><video
              src="/1029.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls={false}
              className="rounded border object-cover w-full" /></>
          ) : frame ? (
            <img
              src={frame}
              alt="Frame da câmera"
              className="rounded border object-cover w-full"
            />
          ) : (
            <p className="text-center">🔄 Tentando conectar à câmera...</p>
          )}

          
        </div>
      </div>
    </>
  );
};
