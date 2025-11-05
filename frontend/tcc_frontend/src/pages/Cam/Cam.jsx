// Importa React e hooks necessários do React (useRef, useState, useEffect)
import React, { useRef, useState, useEffect } from "react";
// Importa função utilitária que retorna o hostname/base URL do WebSocket
import getHostNameSocket from "../../../utils/getUrlSocket";
// Importa o componente de cabeçalho da aplicação
import Header from "../../components/Header";

// Exporta o componente padrão chamado Cam
export default function Cam() { // Define o componente funcional Cam
  const videoRef = useRef(null); // Cria uma referência para o elemento <video> (captura da webcam)
  const canvasRef = useRef(null); // Cria uma referência para o elemento <canvas> (renderização dos frames processados)
  const wsRef = useRef(null); // Cria uma referência para manter a instância do WebSocket (persistente entre renders)

  const [loading, setLoading] = useState(true); // Estado para controlar a tela/overlay de carregamento

  const API_URL = getHostNameSocket(); // Obtém a URL base do servidor de WebSocket
  const token = localStorage.getItem("access_token") || ""; // Lê o token de acesso do localStorage (ou string vazia se não existir)
  const CAMERA_NAME = "cam_ws"; // Nome lógico da câmera que será enviado nas mensagens ao servidor

  // Abre conexão WebSocket e renderiza frames recebidos
  useEffect(() => { // Efeito que configura a conexão de WebSocket e o pipeline de recepção de imagens
    const w = new WebSocket(`${API_URL}/ws?token=${token}`); // Cria conexão WebSocket com query param de autenticação
    w.binaryType = "arraybuffer"; // Define o tipo de dados binários recebidos como ArrayBuffer (para imagens JPEG)
    wsRef.current = w; // Armazena a instância do WebSocket na ref para uso em outros efeitos

    w.onmessage = async (e) => { // Handler chamado quando uma mensagem binária chega do servidor
      if (typeof e.data === "string") return; // Ignora mensagens de texto (apenas processa binário com os frames)
      const blob = new Blob([e.data], { type: "image/jpeg" }); // Converte o ArrayBuffer recebido em um Blob JPEG
      const bitmap = await createImageBitmap(blob); // Decodifica o Blob em um ImageBitmap eficiente para desenhar no canvas
      const c = canvasRef.current; // Obtém a referência atual do <canvas>
      if (!c) return; // Se o canvas ainda não estiver montado, aborta

      if (c.width !== bitmap.width || c.height !== bitmap.height) { // Se o tamanho do canvas for diferente do frame recebido
        c.width = bitmap.width; // Ajusta a largura do canvas para a largura do frame
        c.height = bitmap.height; // Ajusta a altura do canvas para a altura do frame
      }

      c.getContext("2d").drawImage(bitmap, 0, 0); // Desenha o frame decodificado no canvas na posição (0,0)
      bitmap.close(); // Libera recursos do ImageBitmap (boa prática para evitar vazamento)
      setLoading(false); // Remove o estado de carregamento, pois já recebemos e renderizamos um frame
    };

    return () => w.close(); // Ao desmontar o componente/efeito, fecha a conexão WebSocket para limpar recursos
  }, [API_URL, token]); // Dependências: reabre a conexão se a URL do servidor ou o token mudarem

  // Acessa a câmera
  useEffect(() => { // Efeito responsável por solicitar acesso à webcam local do usuário
    navigator.mediaDevices
      .getUserMedia({ video: true }) // Solicita um MediaStream de vídeo da câmera (sem áudio)
      .then((stream) => { // Quando o usuário concede permissão e o stream é obtido
        if (videoRef.current) videoRef.current.srcObject = stream; // Atribui o stream ao elemento <video> para obter frames locais
      })
      .catch(() => setLoading(true)); // Se falhar (sem permissão/erro), mantém o loading ativo (ou poderia exibir erro)

    return () => { // Cleanup executado quando o componente desmonta
      const stream = videoRef.current?.srcObject; // Recupera o MediaStream atualmente atrelado ao <video>
      if (stream) stream.getTracks().forEach((t) => t.stop()); // Para todas as trilhas do stream (libera a webcam)
    };
  }, []); // Executa apenas uma vez ao montar o componente

  // Captura e envia frames ao servidor
  useEffect(() => { // Efeito que periodicamente captura frames da webcam e envia ao backend via WebSocket
    const sendFrame = () => { // Função que coleta um frame do <video>, converte para JPEG e envia como base64
      const ws = wsRef.current; // Obtém a instância atual do WebSocket
      const video = videoRef.current; // Obtém a referência do elemento <video> com o stream local
      if (!video || !ws || ws.readyState !== WebSocket.OPEN) return; // Se não houver vídeo ou WS fechado, não faz nada

      const c = document.createElement("canvas"); // Cria um canvas off-screen (temporário) para desenhar o frame
      c.width = 640; // Define a largura do frame a ser enviado (redução/normalização)
      c.height = 480; // Define a altura do frame a ser enviado
      c.getContext("2d").drawImage(video, 0, 0, 640, 480); // Desenha o frame atual do <video> no canvas (redimensionado)

      c.toBlob((blob) => { // Converte o conteúdo do canvas em um Blob JPEG assíncrono
        if (!blob) return; // Se a conversão falhar, aborta
        const reader = new FileReader(); // Cria um FileReader para transformar o Blob em DataURL (base64)
        reader.onloadend = () => { // Quando a leitura terminar
          if (ws.readyState !== WebSocket.OPEN) return; // Garante que o WebSocket ainda está aberto antes de enviar
          const b64 = String(reader.result).split(",")[1]; // Extrai apenas a parte base64 do DataURL (remove o prefixo)
          ws.send(JSON.stringify({ camera_name: CAMERA_NAME, frame: b64 })); // Envia JSON com nome da câmera e frame em base64
        };
        reader.readAsDataURL(blob); // Inicia leitura do Blob como DataURL (gera string base64)
      }, "image/jpeg", 0.7); // Define o formato de saída como JPEG com qualidade 0.7 (compressão)
    };

    const timer = setInterval(sendFrame, 100); // Agenda o envio de frames a cada 100ms (~10 fps) para o servidor
    return () => clearInterval(timer); // Ao desmontar/atualizar o efeito, limpa o intervalo para evitar vazamentos
  }, []); // Executa apenas uma vez ao montar o componente

  return ( // Retorna a estrutura JSX do componente
    <div className="bg-gray-200 h-screen"> {/* Container de página com fundo cinza e altura de tela inteira */}
      <Header /> {/* Componente de cabeçalho global da aplicação */}
      <div className="flex justify-center p-4"> {/* Wrapper centralizado com padding */}
        <div className="relative sm:w-1/2 flex flex-col items-center"> {/* Área principal: metade da largura em telas >= sm, layout em coluna */}
          {loading && ( /* Renderiza overlay de loading enquanto o estado 'loading' for verdadeiro */
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded"> {/* Overlay semitransparente cobrindo o conteúdo */}
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div> {/* Spinner animado estilo Tailwind */}
            </div>
          )} {/* Fim do condicional de loading */}
          <canvas ref={canvasRef} className="rounded border object-cover w-full" /> {/* Canvas onde os frames recebidos via WS são desenhados */}
          <video ref={videoRef} style={{ display: "none" }} autoPlay /> {/* Elemento de vídeo oculto que recebe o stream da webcam local */}
        </div> {/* Fim do container interno */}
      </div> {/* Fim do wrapper centralizado */}
    </div> // Fim do container principal
  ); // Fim do retorno JSX
} // Fim do componente Cam
