import React, { useEffect, useRef, useState } from "react"; // importa React e hooks para estado, refs e efeitos
import { useParams, useNavigate } from "react-router-dom"; // importa hooks de rota para ler params e navegar
import axios from "axios"; // cliente HTTP para buscar dados da câmera
import getHostNameSocket from "../../../utils/getUrlSocket"; // utilitário que resolve a URL base do WebSocket
import getHostName from "../../../utils/getUrl"; // utilitário que resolve a URL base da API REST
import Header from "../../components/Header"; // componente de cabeçalho

export const MonitoringCam = () => { // declara e exporta o componente de monitoramento por câmera
  const { id } = useParams(); // obtém o parâmetro :id da rota
  const navigate = useNavigate(); // função para redirecionar o usuário

  const [camera, setCamera] = useState(null); // estado com dados da câmera (id, ip, name, etc.)
  const [fallback, setFallback] = useState(false); // controla modo fallback (simulação) quando WS dedicado falha
  const [loading, setLoading] = useState(true); // indica carregamento até desenhar o primeiro frame

  const canvasRef = useRef(null); // referência ao <canvas> onde desenhamos os frames JPEG
  const closedRef = useRef(false); // flag para indicar encerramento/limpeza e evitar uso de WS após unmount
  const alertedRef = useRef(false); // evita exibir múltiplos alerts de erro ao carregar câmera
  const retryRef = useRef(0); // contador de tentativas de reconexão do WS dedicado da câmera
  const wsRef = useRef(null); // referência para a instância atual de WebSocket
  const lastPaintRef = useRef(0); // timestamp do último frame desenhado (para limitar FPS ~15)
  const decodingRef = useRef(false); // evita decodificação concorrente de blobs (debounce de decode)
  const sendTimerRef = useRef(null); // id do timer usado no fallback para envio de frames

  const API_URL = getHostName(); // URL base da API (HTTP)
  const API_URL_WEBSOCKET = getHostNameSocket(); // URL base do WebSocket (WS/WSS)
  const token = localStorage.getItem("access_token") || ""; // token JWT armazenado no navegador

  useEffect(() => { // reseta flags quando trocar o id da câmera
    setFallback(false); // sai do modo fallback ao trocar de câmera
    retryRef.current = 0; // zera tentativas
  }, [id]); // depende do parâmetro de rota

  useEffect(() => { // busca dados (nome, ip, etc.) da câmera pelo id
    let cancel = false; // flag local para cancelar setState após unmount
    (async () => { // IIFE assíncrona
      try {
        const response = await axios.get(`${API_URL}/cameras/${id}`, { // requisita dados da câmera
          headers: { Authorization: `Bearer ${token}` }, // envia JWT
        });
        if (!cancel) setCamera(response.data); // salva dados da câmera se ainda montado
      } catch { // em caso de erro (ex.: câmera inexistente)
        if (!cancel && !alertedRef.current) { // evita alert duplicado
          alertedRef.current = true; // marca que já alertou
          alert("Não foi possível carregar os dados da câmera."); // feedback ao usuário
          navigate(-1); // volta para a página anterior
        }
      }
    })();
    return () => {
      cancel = true; // marca cancelamento ao desmontar
    };
  }, [id, navigate, API_URL, token]); // reexecuta quando mudar id/URL/token

  useEffect(() => { // gerencia o WebSocket dedicado da câmera (stream -> frames JPEG)
    if (!camera) return; // só inicia após carregar dados da câmera
    let reconnectTimer; // timer para agendar reconexão

    const paintBlob = async (blob) => { // desenha um blob JPEG no canvas
      if (decodingRef.current) return; // se já estiver decodificando, ignora (evita overlap)
      const now = performance.now(); // tempo atual de alta resolução
      if (now - lastPaintRef.current < 66) return; // limita ~15fps (66ms)
      decodingRef.current = true; // bloqueia novas decodificações
      try {
        if ("createImageBitmap" in window) { // caminho rápido: decodifica blob em ImageBitmap
          const bitmap = await createImageBitmap(blob); // cria bitmap do JPEG
          const c = canvasRef.current; // pega canvas
          if (!c) return; // se não existir, aborta
          if (c.width !== bitmap.width || c.height !== bitmap.height) { // ajusta resolução do canvas
            c.width = bitmap.width;
            c.height = bitmap.height;
          }
          const ctx = c.getContext("2d"); // contexto 2D
          ctx.drawImage(bitmap, 0, 0); // desenha o frame no canvas
          bitmap.close(); // libera recursos do bitmap
          setLoading(false); // marca que já renderizou algo
        } else { // fallback de decodificação via Image + URL.createObjectURL
          const url = URL.createObjectURL(blob); // cria URL temporária para o blob
          const img = new Image(); // cria elemento imagem
          img.onload = () => { // quando carregar a imagem
            const c = canvasRef.current; // canvas atual
            if (!c) return; // aborta se não houver
            if (c.width !== img.naturalWidth || c.height !== img.naturalHeight) { // ajusta dimensões
              c.width = img.naturalWidth;
              c.height = img.naturalHeight;
            }
            const ctx = c.getContext("2d"); // contexto 2D
            ctx.drawImage(img, 0, 0); // desenha a imagem no canvas
            URL.revokeObjectURL(url); // libera a URL temporária
            setLoading(false); // remove loading
          };
          img.onerror = () => URL.revokeObjectURL(url); // em erro, também libera URL
          img.src = url; // inicia carregamento
        }
        lastPaintRef.current = performance.now(); // atualiza timestamp do último draw
      } finally {
        decodingRef.current = false; // libera decodificação
      }
    };

    const startWebSocket = () => { // função que abre e gerencia o WS da câmera
      if (retryRef.current >= 1) { // permite apenas 1 tentativa (0 => primeira, 1 => já falhou)
        setFallback(true); // ativa modo fallback (simulação)
        return; // não tenta mais
      }
      const wsUrl = `${API_URL_WEBSOCKET}/ws/camera/${camera.id}?token=${token}`; // URL WS dedicada para a câmera
      const ws = new WebSocket(wsUrl); // instancia o WebSocket
      wsRef.current = ws; // guarda a referência
      ws.binaryType = "arraybuffer"; // recebe frames binários como ArrayBuffer (JPEG)
      closedRef.current = false; // marca como ativo
      setFallback(false); // garante que fallback esteja desligado

      ws.onopen = () => console.log(`📡 WebSocket tentativa ${retryRef.current + 1}/1 conectada.`); // log de conexão
      

      ws.onmessage = (event) => { // handler para mensagens do WS
        if (closedRef.current) return; // se já fechou, ignora
        if (typeof event.data === "string") { // mensagens de controle em texto (JSON)
          try {
            const data = JSON.parse(event.data); // tenta parsear JSON
            if (data.erro) { // se servidor informou erro
              if (
                data.erro === "timeout_stream" ||
                data.erro === "stream_indisponivel" ||
                data.erro === "conexao_encerrada"
              ) ws.close(); // fecha para acionar reconexão/fallback
              return; // não processa como frame
            }
          } catch {} // se não for JSON válido, ignora
        } else { // caso contrário é binário (frame JPEG)
          retryRef.current = 0; // zera tentativas ao receber dados válidos
          const blob = new Blob([event.data], { type: "image/jpeg" }); // monta Blob a partir do ArrayBuffer
          paintBlob(blob); // desenha no canvas
        }
      };

      ws.onerror = () => ws.close(); // em erro, fecha para acionar onclose

      ws.onclose = () => { // quando a conexão fecha
        if (closedRef.current) return; // se já estamos limpando, não faça nada
        retryRef.current += 1; // incrementa contador de tentativa
        if (retryRef.current < 1) { // (nunca entra, pois ao fechar já será 1) — mantido por clareza
          reconnectTimer = setTimeout(startWebSocket, 300); // tentaria reconectar após 300ms
        } else {
          setFallback(true); // ativa fallback após falha
        }
      };
    };

    startWebSocket(); // inicia o WebSocket

    return () => { // cleanup ao desmontar ou trocar de câmera
      closedRef.current = true; // marca encerrado
      if (reconnectTimer) clearTimeout(reconnectTimer); // cancela possível reconexão agendada
      retryRef.current = 0; // reseta tentativas
      setFallback(false); // reseta fallback
      try {
        wsRef.current?.close(); // fecha WS se existir
      } catch {} // ignora erros ao fechar
    };
  }, [camera, API_URL_WEBSOCKET, token]); // reexecuta quando dados da câmera/URL WS/token mudarem

  useEffect(() => { // modo fallback: envia frames de um vídeo local para o WS genérico (/ws)
    if (!fallback) return; // só ativa se fallback estiver ligado

    const video = document.createElement("video"); // cria elemento <video> invisível
    video.src = "/1029.mp4"; // caminho do vídeo local para simulação
    video.autoplay = true; // inicia automáticamente
    video.muted = true; // sem áudio
    video.loop = true; // loop infinito
    video.playsInline = true; // evita fullscreen automático no iOS
    document.body.appendChild(video); // anexa ao DOM (fora da tela)
    video.style.position = "absolute"; // posiciona absoluto
    video.style.left = "-9999px"; // desloca para fora da viewport (invisível)

    const canvas = document.createElement("canvas"); // canvas auxiliar para capturar frames do vídeo
    const ctx = canvas.getContext("2d"); // contexto 2D do canvas auxiliar

    const wsUrl = `${API_URL_WEBSOCKET}/ws?token=${token}`; // WS genérico para enviar frames base64
    const ws = new WebSocket(wsUrl); // cria a conexão WS
    ws.binaryType = "arraybuffer"; // recebimento de bytes (frames processados de volta)
    wsRef.current = ws; // guarda referência global

    const paintBlob = async (blob) => { // desenha frame processado de volta no canvas visível
      if (decodingRef.current) return; // evita concorrência de decodificação
      const now = performance.now(); // timestamp atual
      if (now - lastPaintRef.current < 66) return; // limita ~15fps
      decodingRef.current = true; // bloqueia novas decodificações
      try {
        if ("createImageBitmap" in window) { // fast-path com ImageBitmap
          const bmp = await createImageBitmap(blob); // decodifica blob
          const c = canvasRef.current; // canvas visível
          if (!c) return; // aborta se não existir
          if (c.width !== bmp.width || c.height !== bmp.height) { // ajusta resolução do canvas
            c.width = bmp.width;
            c.height = bmp.height;
          }
          const cctx = c.getContext("2d"); // contexto 2D
          cctx.drawImage(bmp, 0, 0); // desenha bitmap no canvas
          bmp.close(); // libera recursos
          setLoading(false); // remove loading após primeiro draw
        } else { // fallback com Image()
          const url = URL.createObjectURL(blob); // cria URL temporária
          const img = new Image(); // cria elemento imagem
          img.onload = () => { // ao carregar
            const c = canvasRef.current; // canvas visível
            if (!c) return; // aborta se não houver
            if (c.width !== img.naturalWidth || c.height !== img.naturalHeight) { // ajusta dimensões
              c.width = img.naturalWidth;
              c.height = img.naturalHeight;
            }
            const cctx = c.getContext("2d"); // contexto 2D
            cctx.drawImage(img, 0, 0); // desenha imagem
            URL.revokeObjectURL(url); // libera URL temporária
            setLoading(false); // remove loading
          };
          img.onerror = () => URL.revokeObjectURL(url); // em erro, limpa URL
          img.src = url; // inicia carregamento
        }
        lastPaintRef.current = performance.now(); // atualiza timestamp do último draw
      } finally {
        decodingRef.current = false; // libera para próxima decodificação
      }
    };

    ws.onopen = () => console.log("🎥 WebSocket fallback conectado"); // log quando WS fallback conecta

    ws.onmessage = (event) => { // recebe frames processados do backend (JPEG)
      const blob = new Blob([event.data], { type: "image/jpeg" }); // monta Blob a partir do ArrayBuffer
      paintBlob(blob); // desenha no canvas principal
    };

    ws.onerror = (err) => console.error("Erro WS fallback:", err); // loga eventuais erros de WS
    ws.onclose = () => console.log("❌ WS fallback fechado"); // loga fechamento

    const sendFrame = () => { // função que envia frames do vídeo local para o backend (em loop)
      if (video.readyState >= 2 && ws.readyState === WebSocket.OPEN) { // garante que vídeo e WS estão prontos
        canvas.width = video.videoWidth || 0; // ajusta largura do canvas auxiliar
        canvas.height = video.videoHeight || 0; // ajusta altura do canvas auxiliar
        if (canvas.width && canvas.height && ctx) { // só prossegue se dimensões válidas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // desenha frame do vídeo no canvas auxiliar
          canvas.toBlob( // transforma o canvas em JPEG comprimido
            (blob) => {
              if (!blob) return; // se falhou gerar blob, aborta
              const reader = new FileReader(); // leitor para converter em base64
              reader.onloadend = () => {
                if (ws.readyState !== WebSocket.OPEN) return; // verifica conexão antes de enviar
                const b64 = String(reader.result).split(",")[1]; // extrai a parte base64 (após a vírgula)
                ws.send(JSON.stringify({ camera_name: "demo_apresentacao", frame: b64 })); // envia JSON com frame base64
              };
              reader.readAsDataURL(blob); // lê blob como dataURL (base64)
            },
            "image/jpeg", // formato de saída
            0.7 // qualidade de compressão
          );
        }
      }
      sendTimerRef.current = setTimeout(sendFrame, 100); // agenda próximo envio (~10fps)
    };

    video.addEventListener("play", sendFrame); // inicia loop de envio quando vídeo começar a tocar
    video.play().catch((err) => console.error("Erro ao tocar vídeo:", err)); // tenta dar play e loga erro se houver

    return () => { // cleanup do fallback
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current); // cancela o timer de envio
      try {
        ws.close(); // fecha WS fallback
      } catch {} // ignora erros ao fechar
      video.remove(); // remove o elemento de vídeo do DOM
    };
  }, [fallback, API_URL_WEBSOCKET, token]); // reexecuta se fallback/URL/token mudarem

  return ( // renderização do componente
    <>
      <Header /> {/* barra superior do app */}
      <div className="p-4 flex flex-col items-center justify-center relative"> {/* container central */}
        <h2 className="text-xl font-bold mb-4">Visualizando: {camera?.name || "..."}</h2> {/* título com nome da câmera */}
        <div className="relative sm:w-1/2 flex flex-col items-center"> {/* wrapper do canvas responsivo */}
          {fallback && <h3 className="text-lg mb-2">🎬 Simulação ao vivo (vídeo processado)</h3>} {/* aviso de modo fallback */}
          <div className="relative w-full"> {/* área do player/canvas */}
            {loading && ( // overlay de loading enquanto primeiro frame não chega
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>
              </div>
            )}
            <canvas ref={canvasRef} className="rounded border object-cover w-full" /> {/* canvas onde frames são desenhados */}
          </div>
        </div>
      </div>
    </>
  ); // fim da árvore JSX
}; // fim do componente MonitoringCam
