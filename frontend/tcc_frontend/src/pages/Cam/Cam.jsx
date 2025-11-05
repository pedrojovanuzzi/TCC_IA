import React, { useRef, useState, useEffect } from "react"; // importa React e hooks (referência ao vídeo, estado e efeitos)
import getHostNameSocket from "../../../utils/getUrlSocket"; // função utilitária que resolve a URL base do WebSocket
import Header from "../../components/Header"; // componente de cabeçalho da aplicação

export default function Cam() { // componente principal da página de câmera
  const videoRef = useRef(null); // referência ao elemento <video> para capturar frames
  const [ws, setWs] = useState(null); // estado para manter a conexão WebSocket
  const [frame, setFrame] = useState(""); // URL do último frame processado recebido do servidor
  const API_URL = getHostNameSocket(); // URL base do socket (ex.: ws://host:port)
  const token = localStorage.getItem("access_token") || ""; // token JWT salvo no navegador (ou string vazia)
  const CAMERA_NAME = "cam_ws"; // 🔸 nome da câmera // etiqueta usada no payload enviado

  // Conexão WebSocket
  useEffect(() => { // estabelece a conexão ao montar o componente
    const wsUrl = `${API_URL}/ws?token=${token}`; // monta URL do WS incluindo o token como query
    const w = new WebSocket(wsUrl); // abre conexão WebSocket
    w.binaryType = "arraybuffer"; // recebe mensagens como bytes (ArrayBuffer)

    w.onopen = () => console.log("WebSocket conectado!"); // log quando conectar
    w.onmessage = (e) => { // handler de mensagens recebidas (frames processados)
      // Recebe imagem processada // comentário explicativo do bloco
      const blob = new Blob([e.data], { type: "image/jpeg" }); // cria Blob JPEG a partir dos bytes
      const url = URL.createObjectURL(blob); // gera URL temporária para exibir a imagem
      setFrame(url); // atualiza o estado com o frame processado
    }; // fim do onmessage
    w.onerror = (e) => console.error("Erro no WebSocket:", e); // log de erro da conexão
    w.onclose = () => console.log("WebSocket fechado."); // log ao fechar

    setWs(w); // salva a instância do WebSocket no estado
    return () => w.close(); // fecha a conexão ao desmontar o componente
  }, []); // executa apenas uma vez (montagem)

  // Captura da câmera
  useEffect(() => { // solicita acesso à câmera do dispositivo
    let streamA; // referência ao MediaStream ativo
    navigator.mediaDevices
      .getUserMedia({ // tenta usar a câmera traseira (quando disponível)
        video: { facingMode: { ideal: "environment" } },
      })
      .then((stream) => { // sucesso na captura
        if (videoRef.current) videoRef.current.srcObject = stream; // vincula stream ao <video> oculto
        streamA = stream; // guarda referência para encerramento posterior
      })
      .catch((err) => { // falhou em abrir câmera traseira
        console.error("Erro ao acessar câmera traseira:", err); // log do erro
        // fallback: tenta câmera padrão // comentário explicativo
        navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => { // tenta qualquer câmera
          if (videoRef.current) videoRef.current.srcObject = stream; // vincula stream ao <video>
          streamA = stream; // guarda referência
        }); // fim do fallback
      }); // fim do catch principal

    return () => { // limpeza ao desmontar
      if (streamA) { // se havia stream aberto
        streamA.getTracks().forEach((track) => track.stop()); // encerra todas as tracks (libera câmera)
      } // fim if
    }; // fim return cleanup
  }, []); // roda uma vez

  // Envia frames com o nome da câmera
  useEffect(() => { // loop periódico para capturar e enviar frames ao servidor
    const interval = setInterval(() => { // dispara a cada intervalo
      if (!videoRef.current || !ws || ws.readyState !== WebSocket.OPEN) return; // garante que há vídeo e WS aberto

      const c = document.createElement("canvas"); // cria canvas temporário
      c.width = 640; // largura alvo do frame
      c.height = 480; // altura alvo do frame
      const ctx = c.getContext("2d"); // contexto de desenho 2D
      ctx.drawImage(videoRef.current, 0, 0, 640, 480); // desenha frame atual do <video> no canvas

      // Converte o frame para base64 // comentário explicativo
      const base64Frame = c.toDataURL("image/jpeg", 0.9).split(",")[1]; // exporta JPEG (qualidade 0.9) e pega parte após a vírgula

      // Envia JSON com o nome da câmera + frame // comentário explicativo
      const payload = JSON.stringify({ // serializa objeto para string
        camera_name: CAMERA_NAME, // identifica a câmera no backend
        frame: base64Frame, // buffer do frame em Base64 (sem prefixo data URL)
      }); // fim JSON.stringify

      ws.send(payload); // envia ao servidor via WS
    }, 80); // 10 fps // intervalo de ~80ms

    return () => clearInterval(interval); // limpa intervalo quando ws ou componente muda
  }, [ws]); // depende do socket

  return ( // JSX renderizado
    <div className="bg-gray-200 h-screen">{/* container tela inteira com fundo cinza claro */}
      <Header />{/* cabeçalho fixo/importado */}
      <div className="flex justify-center" style={{ textAlign: "center" }}>{/* centraliza conteúdo horizontal e alinha texto */}
        <div className="px-5 mt-2 bg-gray-200 pb-5">{/* padding horizontal, margem topo, fundo e padding inferior */}
          {frame ? ( // se já tem frame processado, exibe imagem
            <img
              src={frame}
              alt="processed"
              className="rounded-sm h-[80vh] sm:h-[90vh] ring-1 ring-black"
            /> /* imagem com borda e altura responsiva */
          ) : ( // caso contrário, mostra loader
             
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">{/* overlay com spinner centralizado */}
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>{/* spinner animado */}
              </div>
          )}{/* fim condicional */}
          <video ref={videoRef} style={{ display: "none" }} autoPlay />{/* elemento de vídeo oculto que recebe o MediaStream */}
        </div>{/* fim inner container */}
      </div>{/* fim wrapper centralizador */}
    </div>/* fim página */
  ); // fim do return
} // fim do componente Cam
