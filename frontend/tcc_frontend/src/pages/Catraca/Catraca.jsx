// Importa bibliotecas necessárias
import React, { useRef, useState, useEffect } from "react"; // React e hooks (referência, estado, efeito)
import axios from "axios"; // Cliente HTTP para requisições à API
import img from "../../assets/imgs/photo.png"; // Imagem de placeholder (não utilizada aqui)
import getHostName from "../../../utils/getUrl"; // Utilitário que resolve a URL base da API
import Header from "../../components/Header"; // Componente de cabeçalho da aplicação
import { AiFillUnlock } from "react-icons/ai"; // Ícone de cadeado destravado

export default function Catraca() { // Componente principal da página da catraca
  // Referências para elementos HTML
  const videoRef = useRef(null); // Referência ao elemento <video> (webcam)
  const canvasRef = useRef(null); // Referência ao elemento <canvas> (captura de frame)

  // Estados do componente
  const [preview, setPreview] = useState(null);          // URL (blob) da imagem processada exibida
  const [loading, setLoading] = useState(false);         // Indica se há uma operação em andamento
  const [cameraActive, setCameraActive] = useState(false); // Controla se a webcam está ativa/visível
  const [stream, setStream] = useState(null);            // Armazena o MediaStream retornado pela webcam
  const [funcionarioId, setFuncionarioId] = useState(""); // ID do funcionário digitado no input

  // API base e token JWT
  const API_URL = getHostName(); // Lê a URL base da API do utilitário
  const token = localStorage.getItem("access_token"); // Recupera o token JWT do localStorage

  // Nome fixo da câmera (pode trocar depois se quiser)
  const CAMERA_NAME = "catraca_entrada"; // Identificador da câmera utilizado pela API

  // Envia a imagem capturada + ID do funcionário + nome da câmera
  const handleUpload = async (file) => { // Função assíncrona para fazer upload da imagem para a API
    if (!funcionarioId.trim()) { // Valida se o ID foi informado
      alert("Por favor, insira o ID do funcionário antes de continuar."); // Alerta caso não haja ID
      return; // Interrompe a execução
    }

    setLoading(true); // Exibe estado de carregamento

    const formData = new FormData(); // Cria um FormData para envio multipart
    formData.append("file", file);                   // Anexa o arquivo de imagem
    formData.append("camera_name", CAMERA_NAME);     // Anexa o nome/identificador da câmera
    formData.append("user_id", funcionarioId);       // Anexa o ID do funcionário

    try { // Tenta enviar requisição à API
      const response = await axios.post(`${API_URL}/predict_catraca`, formData, {
        headers: {
          Authorization: `Bearer ${token}`, // Inclui JWT no cabeçalho Authorization
          "Content-Type": "multipart/form-data", // Indica envio multipart
        },
        responseType: "blob", // Espera um blob (imagem) como resposta
      });

      const url = URL.createObjectURL(response.data); // Cria URL temporária para o blob
      if (preview) URL.revokeObjectURL(preview); // Libera URL anterior se existir
      setPreview(url); // Atualiza estado com nova imagem processada
    } catch (error) {
      console.error("Erro ao enviar imagem:", error.response?.data || error); // Loga erro de upload
    } finally {
      setLoading(false); // Finaliza estado de carregamento
    }
  };

  // Ativa webcam
  const startCamera = async () => { // Solicita acesso à webcam e configura o <video>
    setLoading(true); // Ativa indicador de carregamento
    try {
      setCameraActive(true); // Marca webcam como ativa para exibição
      const s = await navigator.mediaDevices.getUserMedia({ // Pede permissão e obtém stream de vídeo
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, // Preferência de resolução
      });
      setStream(s); // Salva o MediaStream no estado
      if (videoRef.current) videoRef.current.srcObject = s; // Atribui o stream ao elemento <video>
    } catch (error) {
      console.error("Erro ao acessar a câmera:", error); // Loga erro ao acessar webcam
    } finally {
      setLoading(false); // Desativa indicador de carregamento
    }
  };

  // Captura frame e envia
  const capturePhoto = () => { // Captura um frame do vídeo e envia à API
    if (!funcionarioId.trim()) { // Garante que o ID foi informado
      alert("Digite o ID do funcionário antes de simular a passagem!"); // Pede ID ao usuário
      return; // Interrompe caso não haja ID
    }

    if (videoRef.current && canvasRef.current) { // Verifica referências aos elementos
      const context = canvasRef.current.getContext("2d"); // Obtém o contexto 2D do canvas
      canvasRef.current.width = videoRef.current.videoWidth; // Ajusta largura do canvas
      canvasRef.current.height = videoRef.current.videoHeight; // Ajusta altura do canvas
      context.drawImage(videoRef.current, 0, 0); // Desenha o frame do vídeo no canvas
      canvasRef.current.toBlob((blob) => { // Converte o conteúdo do canvas em blob (JPEG)
        if (blob) handleUpload(blob); // Se gerou blob, envia para a API
      }, "image/jpeg");
    }
  };

  // Ativa câmera ao abrir página (efeito executa uma vez)
  useEffect(() => { // Efeito de montagem do componente
    startCamera(); // Inicia a webcam automaticamente
  }, []); // Dependências vazias => roda apenas na montagem

  // Desativa câmera ao sair da página (cleanup do stream)
  useEffect(() => { // Observa mudanças em 'stream'
    return () => { // Função de limpeza chamada ao desmontar ou trocar o stream
      if (stream) stream.getTracks().forEach((track) => track.stop()); // Interrompe todas as tracks
    };
  }, [stream]); // Reexecuta cleanup se o stream mudar

  return ( // Renderiza a interface do componente
    <>
      {/* Fragmento raiz */}
      <Header /> {/* Cabeçalho da aplicação */}
      <div className="flex justify-center flex-col items-center"> {/* Container central da página */}
        {/* Ícone ilustrativo da catraca */}
        <AiFillUnlock className="size-16 mt-5" alt="Catraca" />

        {/* Campo de entrada para o ID do funcionário */}
        <div className="mt-4 flex flex-col items-center"> {/* Bloco do input de ID */}
          <label htmlFor="func-id" className="font-semibold mb-2"> {/* Rótulo do campo */}
            ID do Funcionário:
          </label>
          {/* Input numérico para digitar o ID do funcionário */}
          <input
            id="func-id"
            type="number"
            className="border border-gray-400 rounded-md px-3 py-2 w-40 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: 1023"
            value={funcionarioId}
            onChange={(e) => setFuncionarioId(e.target.value)}
          />
        </div>

        {/* Vídeo da webcam + botão de captura (apenas se câmera ativa) */}
        {/* Condicional: quando cameraActive for true, mostra bloco abaixo */}
        {cameraActive && (
          <div className="mt-4 flex flex-col items-center"> {/* Bloco do preview da câmera */}
            {/* Elemento de vídeo que exibe o stream da webcam */}
            <video
              ref={videoRef}
              autoPlay
              className="w-screen sm:max-w-[50vw] rounded-lg shadow-md"
            />
            {/* Botão que captura um frame do vídeo e envia para API */}
            <button
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={capturePhoto}
            >
              Simular Passagem na Catraca
            </button>
            {/* Canvas oculto usado apenas para capturar o frame do vídeo */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Loading: exibe mensagem durante processamento */}
        {loading && (
          <h1 className="text-xl mt-2 font-semibold text-gray-600">
            Processando...
          </h1>
        )}

        {/* Exibe imagem processada quando houver preview gerado pela API */}
        {preview && (
          <div className="mt-4 flex flex-col items-center"> {/* Bloco da imagem de resposta */}
            <h2 className="font-semibold text-center mb-2">
              Imagem Processada:
            </h2>
            <img
              src={preview}
              alt="Imagem processada"
              className="my-2 rounded-lg max-w-[80vw] shadow-md"
            />
          </div>
        )}
      </div>
    </>
  );
}

