import React, { useEffect, useRef, useState } from "react"; // React e hooks
import { useParams } from "react-router-dom"; // Lê parâmetros da rota
import axios from "axios"; // Cliente HTTP
import getHostNameSocket from "../../../utils/getUrlSocket"; // URL base do WebSocket
import getHostName from "../../../utils/getUrl"; // URL base HTTP
import Header from "../../components/Header"; // Cabeçalho

export const MonitoringCam = () => { // Visualização de uma câmera específica
  const { id } = useParams(); // Captura o :id da URL

  const [camera, setCamera] = useState(null); // Metadados da câmera
  const [loading, setLoading] = useState(true); // Loading do vídeo
  const [fallback, setFallback] = useState(false); // Ativa modo fallback

  const canvasRef = useRef(null); // Canvas onde os frames serão desenhados
  const wsRef = useRef(null); // Referência ao websocket ativo
  const decodingRef = useRef(false); // Flag para evitar decodificações concorrentes
  const lastPaintRef = useRef(0); // Marca tempo da última pintura (limitar FPS)
  const sendTimerRef = useRef(null); // Timer para envio de frames no fallback

  const API_URL = getHostName(); // Base HTTP
  const API_URL_WEBSOCKET = getHostNameSocket(); // Base WS
  const token = localStorage.getItem("access_token") || ""; // Token JWT

  // Carrega informações da câmera selecionada
  useEffect(() => {
    axios
      .get(`${API_URL}/cameras/${id}`, {
        headers: { Authorization: `Bearer ${token}` }, // Autorização
      })
      .then((res) => setCamera(res.data)) // Salva dados da câmera
      .catch(() => {
        alert("Erro ao carregar dados da câmera.");
        setFallback(true); // Cai para modo fallback
      });
  }, [id, API_URL, token]);

  // Desenha no canvas um blob (frame JPEG)
  const paintBlob = async (blob) => {
    if (decodingRef.current) return; // Evita concorrência
    const now = performance.now();
    if (now - lastPaintRef.current < 66) return; // ~15fps
    decodingRef.current = true; // Trava decodificação

    try {
      const bitmap = await createImageBitmap(blob); // Decodifica em bitmap
      const c = canvasRef.current; // Canvas atual
      if (!c) return; // Canvas pode ter desmontado

      if (c.width !== bitmap.width || c.height !== bitmap.height) { // Ajusta tamanho
        c.width = bitmap.width;
        c.height = bitmap.height;
      }

      c.getContext("2d").drawImage(bitmap, 0, 0); // Desenha frame
      bitmap.close(); // Libera recursos
      setLoading(false); // Já renderizou algo
      lastPaintRef.current = performance.now(); // Atualiza carimbo de tempo
    } finally {
      decodingRef.current = false; // Libera decodificação
    }
  };

  // Conexão principal via WebSocket para receber frames
  useEffect(() => {
    if (!camera) return; // Só conecta depois de carregar dados

    const ws = new WebSocket(`${API_URL_WEBSOCKET}/ws/camera/${camera.id}?token=${token}`); // WS por câmera
    ws.binaryType = "arraybuffer"; // Recebe binário
    wsRef.current = ws; // Salva ref

    ws.onmessage = (event) => { // Ao receber dado
      if (typeof event.data === "string") return; // Ignora mensagens de texto
      const blob = new Blob([event.data], { type: "image/jpeg" }); // Transforma em blob JPEG
      paintBlob(blob); // Desenha no canvas
    };

    ws.onerror = () => setFallback(true); // Em erro, ativa fallback
    ws.onclose = () => setFallback(true); // Em fechamento, ativa fallback

    return () => ws.close(); // Fecha WS ao desmontar
  }, [camera, API_URL_WEBSOCKET, token]);

  // Fallback: envia frames de um vídeo local e também recebe frames processados
  useEffect(() => {
    if (!fallback) return; // Só roda se fallback ativo

    const video = document.createElement("video"); // Vídeo local escondido
    video.src = "/1029.mp4"; // arquivo local
    video.autoplay = true;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    document.body.appendChild(video);
    video.style.display = "none"; // Fica invisível

    const canvasTemp = document.createElement("canvas"); // Canvas temporário
    const ctx = canvasTemp.getContext("2d"); // Contexto 2D

    const ws = new WebSocket(`${API_URL_WEBSOCKET}/ws?token=${token}`); // WS genérico
    ws.binaryType = "arraybuffer"; // Recebe binário
    wsRef.current = ws; // Salva ref

    ws.onmessage = (e) => { // Recebe frames processados
      const blob = new Blob([e.data], { type: "image/jpeg" });
      paintBlob(blob); // Desenha no canvas
    };

    const sendFrame = () => { // Envia frame atual do vídeo local
      if (video.readyState >= 2 && ws.readyState === WebSocket.OPEN) { // Checa pronto e WS aberto
        canvasTemp.width = video.videoWidth; // Ajusta dimensões
        canvasTemp.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvasTemp.width, canvasTemp.height); // Desenha frame
        canvasTemp.toBlob((blob) => { // Converte em blob JPEG
          if (!blob) return;
          const reader = new FileReader(); // Lê blob como base64
          reader.onloadend = () => {
            const b64 = String(reader.result).split(",")[1]; // Extrai parte base64
            ws.send(JSON.stringify({ camera_name: "fallback_demo", frame: b64 })); // Envia ao servidor
          };
          reader.readAsDataURL(blob); // Inicia leitura
        }, "image/jpeg", 0.7);
      }
      sendTimerRef.current = setTimeout(sendFrame, 100); // Agenda próximo envio (~10fps)
    };

    video.addEventListener("play", sendFrame); // Inicia loop quando vídeo tocar
    video.play().catch(console.error); // Garante reprodução

    return () => { // Limpeza ao desmontar
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current); // Cancela timer
      ws.close(); // Fecha WS
      video.remove(); // Remove elemento de vídeo
    };
  }, [fallback, API_URL_WEBSOCKET, token]);


  // Conexão principal via WebSocket para receber frames + ENVIAR FRAMES (modo normal)
useEffect(() => {
  if (!camera) return; // Só conecta quando a câmera foi carregada

  
  const ws = new WebSocket(
    `${API_URL_WEBSOCKET}/ws/camera/${camera.id}?token=${token}`
  ); // Cria WS específico da câmera

  ws.binaryType = "arraybuffer"; // Indica recebimento de binário (JPEG)
  wsRef.current = ws; // Guarda referência para uso futuro

  // === RECEBIMENTO DE FRAMES (já existia) ===
  ws.onmessage = (event) => {
    if (typeof event.data === "string") return; // Ignora mensagens de texto
    const blob = new Blob([event.data], { type: "image/jpeg" }); // Transforma em Blob
    paintBlob(blob); // Desenha no canvas
  };

  ws.onerror = () => setFallback(true); // Em erro, ativa fallback
  ws.onclose = () => setFallback(true); // Ao fechar, ativa fallback

  // === ENVIO DE FRAMES NO MODO NORMAL (NOVO TRECHO AQUI) ===
  const video = document.createElement("video"); // Cria objeto de vídeo
  video.src = camera.stream_url || ""; // URL real da câmera (RTSP convertido via backend / HLS)
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true; // Necessário no mobile
  video.style.display = "none"; // Oculto
  document.body.appendChild(video); // Adiciona temporariamente na página

  // Canvas temporário para capturar os frames do <video>
  const canvasTemp = document.createElement("canvas");
  const ctx = canvasTemp.getContext("2d");

  const sendFrameNormal = () => {
    if (video.readyState >= 2 && ws.readyState === WebSocket.OPEN) {
      canvasTemp.width = video.videoWidth; // Ajusta dimensões
      canvasTemp.height = video.videoHeight;

      ctx.drawImage(video, 0, 0, canvasTemp.width, canvasTemp.height); // Puxa o frame atual

      canvasTemp.toBlob(
        (blob) => {
          if (!blob) return;
          const reader = new FileReader(); // Para converter para base64
          reader.onloadend = () => {
            const b64 = String(reader.result).split(",")[1]; // Extrai base64
            ws.send(
              JSON.stringify({
                camera_name: camera.name, // 🔥 Usa o nome REAL da câmera
                frame: b64, // Frame convertido
              })
            );
          };
          reader.readAsDataURL(blob); // Inicia conversão
        },
        "image/jpeg",
        0.7
      ); // Qualidade 0.7 (~ bom e leve)
    }

    sendTimerRef.current = setTimeout(sendFrameNormal, 100); // Envia a cada 100ms (~10fps)
  };

  video.addEventListener("play", sendFrameNormal); // Quando o vídeo começar, inicia loop de envio

  // === LIMPEZA ===
  return () => {
    ws.close(); // Fecha WebSocket
    video.remove(); // Remove vídeo oculto
    if (sendTimerRef.current) clearTimeout(sendTimerRef.current); // Cancela loop
  };
}, [camera, API_URL_WEBSOCKET, token]);


  return (
    <>
      <Header /> {/* Cabeçalho */}
      <div className="p-4 flex flex-col items-center justify-center relative"> {/* Container principal */}
        <h2 className="text-xl font-bold mb-4"> {/* Título */}
          Visualizando: {camera?.name || "Câmera"}
        </h2>

        {fallback && (
          <h3 className="text-lg mb-2 text-gray-700"> {/* Indica modo fallback */}
            Simulação ao vivo (modo fallback)
          </h3>
        )}

        <div className="relative sm:w-1/2 flex flex-col items-center"> {/* Área do canvas */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded"> {/* Overlay loading */}
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div> {/* Spinner */}
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="rounded border object-cover w-full" // Canvas onde desenhamos frames
          />
        </div>
      </div>
    </>
  );
};

