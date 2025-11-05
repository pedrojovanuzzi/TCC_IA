// Importa React e hooks necessários do React (useRef, useState, useEffect)
import React, { useRef, useState, useEffect } from "react";
// Importa função utilitária que retorna o hostname/base URL do WebSocket
import getHostNameSocket from "../../../utils/getUrlSocket";
// Importa o componente de cabeçalho da aplicação
import Header from "../../components/Header";

// Exporta o componente padrão chamado Cam
export default function Cam() { // Define o componente funcional Cam
  const videoRef = useRef(null); // Referência para o elemento <video> (captura da webcam)
  const canvasRef = useRef(null); // Referência para o elemento <canvas> (renderização dos frames processados)
  const wsRef = useRef(null); // Referência para manter a instância do WebSocket (persistente entre renders)

  const [loading, setLoading] = useState(true); // Controla a tela/overlay de carregamento
  const [stream, setStream] = useState(null); // Mantém referência ao MediaStream atual da câmera

  const API_URL = getHostNameSocket(); // Obtém a URL base do servidor de WebSocket
  const token = localStorage.getItem("access_token") || ""; // Lê o token de acesso do localStorage
  const CAMERA_NAME = "cam_ws"; // Nome lógico da câmera enviado nas mensagens ao servidor

  // Abre conexão WebSocket e renderiza frames recebidos
  useEffect(() => { // Configura a conexão de WebSocket e o pipeline de recepção de imagens
    const w = new WebSocket(`${API_URL}/ws?token=${token}`); // Cria conexão WS com token na query string
    w.binaryType = "arraybuffer"; // Define que o payload virá em binário (ArrayBuffer)
    wsRef.current = w; // Guarda a instância do WS para uso posterior

    w.onmessage = async (e) => { // Handler chamado a cada mensagem do servidor
      if (typeof e.data === "string") return; // Se não for binário (ex.: ping), ignora
      const blob = new Blob([e.data], { type: "image/jpeg" }); // Converte ArrayBuffer => Blob JPEG
      const bitmap = await createImageBitmap(blob); // Decodifica o JPEG em bitmap eficiente
      const c = canvasRef.current; // Pega o canvas atual
      if (!c) return; // Pode ainda não estar montado

      if (c.width !== bitmap.width || c.height !== bitmap.height) { // Ajusta o tamanho do canvas ao frame
        c.width = bitmap.width; // Largura do frame recebido
        c.height = bitmap.height; // Altura do frame recebido
      }

      c.getContext("2d").drawImage(bitmap, 0, 0); // Desenha a imagem decodificada no canvas
      bitmap.close(); // Libera recursos do bitmap
      setLoading(false); // Já temos um frame renderizado: tira o overlay de loading
    };

    return () => w.close(); // Ao desmontar, encerra a conexão WS
  }, [API_URL, token]); // Reexecuta se a URL base ou o token mudarem

  // Acessa a câmera (prioriza a traseira do celular; fallback para qualquer disponível)
  useEffect(() => { // Solicita acesso à webcam local do usuário
    const openCamera = async () => {
      try {
        let stream = null;
        // Preferência: câmera traseira em dispositivos móveis
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" } }, // Pede câmera "environment" (traseira)
          });
        } catch (e1) {
          // Fallback final: qualquer câmera
          if (!stream) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true }); // Deixa o browser escolher
          }
        }
        if (videoRef.current) videoRef.current.srcObject = stream; // Atribui stream ao <video>
        setStream(stream); // Armazena o MediaStream para permitir cleanup reativo
      } catch {
        setLoading(true); // Mantém loading em caso de erro/permissão negada
      }
    };

    openCamera();

    return () => { // Cleanup quando desmontar
      const stream = videoRef.current?.srcObject; // Recupera stream atual, se houver
      if (stream) stream.getTracks().forEach((t) => t.stop()); // Para todas as trilhas (libera a webcam)
    };
  }, []); // Executa apenas uma vez ao montar

  // Desativa câmera ao sair da página (cleanup do stream)
  useEffect(() => { // Observa mudanças em 'stream'
    return () => { // Função de limpeza chamada ao desmontar ou trocar o stream
      if (stream) stream.getTracks().forEach((track) => track.stop()); // Interrompe todas as tracks
    };
  }, [stream]); // Reexecuta cleanup se o stream mudar

  // Captura e envia frames ao servidor
  useEffect(() => { // Captura frames e envia via WebSocket
    const sendFrame = () => { // Coleta um frame do <video>, converte em JPEG e envia como base64
      const ws = wsRef.current; // WS atual
      const video = videoRef.current; // Elemento <video> com stream local
      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return; // Sem vídeo ou WS fechado

      const c = document.createElement("canvas"); // Canvas off-screen para desenhar o frame
      c.width = 640; // Largura padrão a enviar
      c.height = 480; // Altura padrão a enviar
      c.getContext("2d").drawImage(video, 0, 0, 640, 480); // Desenha frame atual do vídeo

      c.toBlob((blob) => { // Converte o canvas em Blob JPEG
        if (!blob) return; // Aborta se falhar
        const reader = new FileReader(); // Lê o blob como DataURL
        reader.onloadend = () => {
          if (ws.readyState !== WebSocket.OPEN) return; // Garante WS aberto
          const b64 = String(reader.result).split(",")[1]; // Extrai apenas a parte base64
          ws.send(JSON.stringify({ camera_name: CAMERA_NAME, frame: b64 })); // Envia payload
        };
        reader.readAsDataURL(blob); // Dispara leitura do blob
      }, "image/jpeg", 0.7); // JPEG com qualidade 0.7
    };

    const timer = setInterval(sendFrame, 100); // ~10 fps
    return () => clearInterval(timer); // Limpa intervalo em unmount
  }, []); // Uma vez ao montar

    // Desativa câmera ao sair da página (cleanup do stream)
    useEffect(() => { // Observa mudanças em 'stream'
      return () => { // Função de limpeza chamada ao desmontar ou trocar o stream
        if (stream) stream.getTracks().forEach((track) => track.stop()); // Interrompe todas as tracks
      };
    }, [stream]); // Reexecuta cleanup se o stream mudar

  return ( // Estrutura JSX do componente
    <div className="bg-gray-200 h-screen"> {/* Container de página com fundo cinza e altura total */}
      <Header /> {/* Cabeçalho global */}
      <div className="flex justify-center p-4"> {/* Wrapper centralizado com padding */}
        <div className="relative sm:w-1/2 flex flex-col items-center"> {/* Área principal */}
          {loading && ( /* Overlay de loading enquanto 'loading' for verdadeiro */
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded"> {/* Overlay semitransparente */}
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div> {/* Spinner */}
            </div>
          )}
          <canvas ref={canvasRef} className="rounded border object-cover w-full" /> {/* Canvas para frames recebidos via WS */}
          <video ref={videoRef} style={{ display: "none" }} autoPlay /> {/* <video> oculto com o stream local */}
        </div>
      </div>
    </div>
  );
}
