import React, { useRef, useState, useEffect } from "react"; // importa React e os hooks useRef (referências), useState (estado) e useEffect (efeitos colaterais)
import axios from "axios"; // importa o cliente HTTP axios para fazer requisições ao backend
import img from "../../assets/imgs/photo.png"; // importa uma imagem de ícone para a interface
import getHostName from "../../../utils/getUrl"; // importa função utilitária que retorna a URL base da API
import Header from "../../components/Header"; // importa o componente de cabeçalho da aplicação

export default function Photo() { // exporta o componente funcional principal "Photo" como padrão
  const inputRef = useRef(null); // referência para o input de arquivo (para acionar clique programaticamente)
  const videoRef = useRef(null); // referência para o elemento <video> (webcam)
  const canvasRef = useRef(null); // referência para o <canvas> (captura de frame da webcam)
  const [dragging, setDragging] = useState(false); // estado que indica se o usuário está arrastando um arquivo sobre a área
  const [preview, setPreview] = useState(null); // estado que guarda a URL do preview da imagem processada pelo backend
  const [loading, setLoading] = useState(false); // estado de carregamento para exibir spinner enquanto processa
  const [cameraActive, setCameraActive] = useState(false); // estado que indica se a webcam foi ativada
  const [stream, setStream] = useState(null); // estado que guarda o MediaStream da webcam para poder parar depois

  const API_URL = getHostName(); // resolve a URL base do backend (ex.: http://localhost:3001/api)
  const CAMERA_NAME = "cam_photo"; // 🔸 nome fixo da câmera/fonte // identifica a origem dos frames no backend

  // --- Manipuladores de arrastar e soltar ---
  const handleDragOver = (event) => { // handler chamado ao arrastar arquivo sobre a área
    event.preventDefault(); // previne o comportamento padrão do navegador (abrir arquivo)
    setDragging(true); // marca que está em estado de arraste para alterar estilo visual
  }; // fim handleDragOver

  const handleDragLeave = () => { // handler quando o arquivo deixa a área de arraste
    setDragging(false); // remove o estado visual de arraste
  }; // fim handleDragLeave

  const handleDrop = (event) => { // handler quando o arquivo é solto na área de arraste
    event.preventDefault(); // previne comportamento padrão
    setDragging(false); // encerra estado de arraste
    if (event.dataTransfer.files.length > 0) { // verifica se há arquivo
      const file = event.dataTransfer.files[0]; // pega o primeiro arquivo solto
      handleUpload(file); // envia o arquivo para processamento no backend
    } // fim if
  }; // fim handleDrop

  // --- Upload de arquivo manual ---
  const handleFileChange = (event) => { // handler para mudança do input de arquivo
    if (event.target.files.length > 0) { // verifica se algum arquivo foi selecionado
      const file = event.target.files[0]; // pega o primeiro arquivo do input
      handleUpload(file); // envia para o backend
    } // fim if
  }; // fim handleFileChange

  // --- Envio para o backend /predict ---
  const handleUpload = async (file) => { // função que envia o arquivo ao endpoint /predict
    setLoading(true); // ativa spinner de carregamento
    const token = localStorage.getItem("access_token"); // recupera o token JWT do armazenamento local

    const formData = new FormData(); // cria um FormData para envio multipart/form-data
    formData.append("file", file); // adiciona o arquivo no corpo da requisição
    formData.append("camera_name", CAMERA_NAME); // ✅ envia o nome da câmera // backend usa para registrar origem

    try { // bloco para tratar sucesso/erro
      const response = await axios.post(`${API_URL}/predict`, formData, { // faz POST para o endpoint de inferência
        headers: { // define cabeçalhos HTTP
          Authorization: `Bearer ${token}`, // envia o JWT no header Authorization
          "Content-Type": "multipart/form-data", // indica envio de formulário com arquivo
        }, // fim headers
        responseType: "blob", // recebe imagem processada como Blob (binário)
      }); // fim axios.post

      const url = URL.createObjectURL(response.data); // cria uma URL temporária para exibir o Blob retornado
      if (preview) URL.revokeObjectURL(preview); // libera a URL anterior (evita vazamento de memória)
      setPreview(url); // atualiza o preview com a nova imagem processada
    } catch (error) { // capturando erros do envio/processamento
      console.error("❌ Erro ao enviar a imagem:", error.response?.data || error); // log detalhado do erro
    } finally { // executa sempre, com sucesso ou erro
      setLoading(false); // desativa spinner de carregamento
    } // fim try/catch/finally
  }; // fim handleUpload

  // --- Ativar webcam ---
  const startCamera = async () => { // função que solicita acesso à webcam
    setCameraActive(true); // marca estado de webcam ativa para renderizar UI relacionada
    const s = await navigator.mediaDevices.getUserMedia({ // pede permissão e captura o stream de vídeo
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, // sugere resolução ideal FullHD
    }); // fim getUserMedia
    setStream(s); // guarda o stream para permitir encerramento posterior
    if (videoRef.current) { // se o elemento <video> já existe
      videoRef.current.srcObject = s; // atribui o stream ao <video> para exibir a câmera
    } // fim if
  }; // fim startCamera

  // --- Capturar foto da webcam e enviar ---
  const capturePhoto = () => { // tira um "snapshot" do vídeo para envio
    if (videoRef.current && canvasRef.current) { // garante que vídeo e canvas existem
      const context = canvasRef.current.getContext("2d"); // obtém contexto 2D do canvas
      canvasRef.current.width = videoRef.current.videoWidth; // ajusta largura do canvas à do vídeo
      canvasRef.current.height = videoRef.current.videoHeight; // ajusta altura do canvas à do vídeo
      context.drawImage(videoRef.current, 0, 0); // desenha o frame atual do vídeo no canvas
      canvasRef.current.toBlob((blob) => { // converte o conteúdo do canvas em Blob (JPEG)
        if (blob) handleUpload(blob); // envia a imagem capturada para o backend
      }, "image/jpeg"); // define o tipo de imagem de saída
    } // fim if
  }; // fim capturePhoto

  // --- Encerrar stream da câmera ao desmontar ---
  useEffect(() => { // efeito de limpeza quando o componente desmonta ou quando "stream" muda
    return () => { // função de cleanup
      if (stream) { // se houver stream ativo
        stream.getTracks().forEach((track) => track.stop()); // interrompe todas as tracks (fecha webcam)
      } // fim if
    }; // fim return cleanup
  }, [stream]); // depende de "stream" para sempre encerrar o atual quando for substituído

  return ( // renderização JSX do componente
    <> // fragmento React para agrupar elementos
      <Header /> // cabeçalho da aplicação (navbar/topo)
      <div className="flex justify-center flex-col"> // container vertical centralizado
        <div className="flex justify-center"> // linha central para o ícone
          <img src={img} className="size-16 mt-5 sm:size-24" alt="Ícone" /> // exibe ícone ilustrativo
        </div>
        <div className="flex flex-col justify-center items-center"> // área central de interação
          <h1 className="font-semibold mb-4"> // título orientando o usuário
            Arraste ou clique para selecionar uma Foto // texto do título
          </h1>

          {/* INPUT DE ARQUIVO */}
          <input // campo de seleção de arquivo (escondido, acionado por clique no card)
            type="file" // aceita arquivo único
            ref={inputRef} // referência para acionar clique programaticamente
            accept="image/*" // restringe a tipos de imagem
            className="hidden" // esconde o input da tela
            onChange={handleFileChange} // handler ao selecionar arquivo manualmente
          />

          {/* ÁREA DE ARRASTO */}
          <div // card/área para arrastar e soltar imagem ou clicar para abrir seletor
            className={`relative cursor-pointer block w-2/4 rounded-lg border-2 border-dashed ${ // estilos responsivos e bordas tracejadas
              dragging ? "border-blue-500 bg-blue-100" : "border-gray-300" // muda cor quando está arrastando
            } p-12 text-center hover:border-gray-400`} // padding e hover
            onClick={() => inputRef.current?.click()} // abre seletor de arquivo ao clicar na área
            onDragOver={handleDragOver} // sinaliza que pode soltar e altera estado visual
            onDragLeave={handleDragLeave} // volta ao estado normal ao sair da área
            onDrop={handleDrop} // trata o arquivo solto para envio
          >
            {loading ? ( // se estiver processando mostra overlay de carregamento
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded"> // backdrop translúcido
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div> // spinner animado
              </div>
            ) : ( // quando não está carregando, exibe conteúdo padrão
              <> // fragmento
                <svg // ícone ilustrativo (SVG) dentro da área de arraste
                  fill="none" // sem preenchimento
                  stroke="currentColor" // usa a cor atual do texto
                  viewBox="0 0 48 48" // define a área de visualização do SVG
                  aria-hidden="true" // marca como decorativo para leitores de tela
                  className="mx-auto size-12 text-gray-400" // centraliza e define tamanho/cor
                >
                  <path // caminho do ícone
                    d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6" // desenho do símbolo
                    strokeWidth={2} // espessura do traço
                    strokeLinecap="round" // cantos arredondados
                    strokeLinejoin="round" // junções arredondadas
                  />
                </svg>
                <span className="mt-2 block text-sm font-semibold text-gray-900"> // legenda convidando a enviar arquivo
                  Selecione ou arraste uma Foto aqui // texto da legenda
                </span>
              </> // fim fragmento
            )} // fim render condicional de loading
          </div>

          {/* BOTÃO WEBCAM */}
          <button // botão que solicita acesso à webcam
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" // estilos do botão
            onClick={startCamera} // ao clicar, ativa a câmera chamando startCamera
          >
            Ativar Webcam // rótulo do botão
          </button>

          {/* CAPTURA E PREVIEW */}
          {cameraActive && ( // quando a webcam está ativa, mostra vídeo e botão de captura
            <div className="mt-4 flex flex-col items-center"> // container do player da webcam
              <video ref={videoRef} autoPlay className="w-full max-w-md rounded-lg" /> // elemento de vídeo exibindo a webcam
              <button // botão que captura um frame do vídeo
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600" // estilos do botão
                onClick={capturePhoto} // ao clicar, captura a foto e envia ao backend
              >
                Capturar Foto // rótulo do botão de captura
              </button>
              <canvas ref={canvasRef} className="hidden" /> // canvas oculto usado para "fotografar" o frame do vídeo
            </div>
          )}

          {/* IMAGEM PROCESSADA */}
          {preview && ( // se já há preview retornado, exibe a seção de imagem processada
            <div className="mt-4 flex flex-col"> // container da imagem de resultado
              <h2 className="font-semibold text-center">Imagem Processada:</h2> // título da seção de resultado
              <img // exibe a imagem resultante do backend (com boxes/labels)
                src={preview} // URL temporária criada a partir do Blob retornado
                alt="Imagem processada" // texto alternativo acessível
                className="my-2 rounded-lg max-w-[80vw] shadow-md" // estilos da imagem de preview
              />
            </div>
          )}
        </div>
      </div>
    </> // fim do fragmento principal
  ); // fim do return JSX
} // fim do componente Photo
