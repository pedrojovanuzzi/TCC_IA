// Importa bibliotecas necessárias
import React, { useRef, useState, useEffect } from "react"; // importa React e hooks para refs, estados e efeitos
import axios from "axios"; // cliente HTTP para chamadas ao backend
import img from "../../assets/imgs/photo.png"; // imagem (não utilizada neste componente)
import getHostName from "../../../utils/getUrl"; // utilitário que retorna a URL base da API
import Header from "../../components/Header"; // componente de cabeçalho da aplicação
import { AiFillUnlock } from "react-icons/ai"; // ícone de cadeado aberto da biblioteca react-icons

export default function Catraca() { // componente principal da página de "Catraca"
  // Referências para elementos HTML
  const videoRef = useRef(null); // referência ao elemento <video> para exibir o stream da câmera
  const canvasRef = useRef(null); // referência ao <canvas> usado para capturar um frame em JPEG

  // Estados do componente
  const [preview, setPreview] = useState(null);          // imagem processada retornada pelo backend
  const [loading, setLoading] = useState(false);         // indicador de carregamento para UX
  const [cameraActive, setCameraActive] = useState(false); // webcam ativa/desativa
  const [stream, setStream] = useState(null);            // objeto MediaStream da câmera
  const [funcionarioId, setFuncionarioId] = useState(""); // 🔸 ID do funcionário digitado no input

  // API base e token JWT
  const API_URL = getHostName(); // obtém URL base do backend (ex.: http://localhost:3001/api)
  const token = localStorage.getItem("access_token"); // resgata o token JWT salvo no navegador

  // Nome fixo da câmera (pode trocar depois se quiser)
  const CAMERA_NAME = "catraca_entrada"; // identifica a origem do frame no backend

  // Envia a imagem capturada + ID do funcionário + nome da câmera
  const handleUpload = async (file) => { // função que envia o frame ao endpoint /predict_catraca
  if (!funcionarioId.trim()) { // valida se o ID do funcionário foi informado
    alert("Por favor, insira o ID do funcionário antes de continuar."); // feedback ao usuário quando campo está vazio
    return; // aborta envio
  } // fim validação

  setLoading(true); // ativa indicador de carregamento

  const formData = new FormData(); // cria formulário multipart para enviar arquivo e campos
  formData.append("file", file);                   // 👈 arquivo  // anexa o blob de imagem
  formData.append("camera_name", CAMERA_NAME);     // 👈 nome da câmera  // anexa o identificador da câmera
  formData.append("user_id", funcionarioId);          // 👈 ID do funcionário (string aceita)  // anexa o ID do funcionário

  try { // tenta realizar a chamada HTTP ao backend
    const response = await axios.post(`${API_URL}/predict_catraca`, formData, { // faz POST multipart para o endpoint da catraca
      headers: { // cabeçalhos da requisição
        Authorization: `Bearer ${token}`, // envia o JWT para autenticação
        "Content-Type": "multipart/form-data", // 👈 importante  // define tipo de conteúdo como multipart
      },
      responseType: "blob", // espera um binário (imagem) como resposta
    }); // fim da chamada

    const url = URL.createObjectURL(response.data); // cria URL temporária para exibir a imagem retornada
    if (preview) URL.revokeObjectURL(preview); // libera URL anterior para não vazar memória
    setPreview(url); // atualiza estado com a nova imagem processada
  } catch (error) { // captura erros na requisição
    console.error("❌ Erro ao enviar imagem:", error.response?.data || error); // log detalhado do erro
  } finally { // sempre executa após try/catch
    setLoading(false); // desativa indicador de carregamento
  } // fim finally
}; // fim handleUpload


  // Ativa webcam
  const startCamera = async () => { // função para solicitar acesso e iniciar a câmera
    setLoading(true); // ativa loader enquanto solicita permissão
    try { // tenta abrir a câmera
      setCameraActive(true); // marca câmera como ativa
      const s = await navigator.mediaDevices.getUserMedia({ // solicita MediaStream de vídeo
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, // prefere resolução FullHD
      }); // fim getUserMedia
      setStream(s); // guarda o stream para liberar depois
      if (videoRef.current) videoRef.current.srcObject = s; // atribui o stream ao elemento <video>
    } catch (error) { // erro ao obter câmera (permissão negada/sem dispositivo)
      console.error("❌ Erro ao acessar a câmera:", error); // log do erro
    } finally { // finaliza o fluxo de loading
      setLoading(false); // desativa loader
    } // fim finally
  }; // fim startCamera

  // Captura frame e envia
  const capturePhoto = () => { // captura um frame do vídeo e envia ao backend
    if (!funcionarioId.trim()) { // exige ID antes da captura
      alert("⚠️ Digite o ID do funcionário antes de simular a passagem!"); // alerta de validação
      return; // interrompe execução
    } // fim validação

    if (videoRef.current && canvasRef.current) { // garante que o vídeo e o canvas estão disponíveis
      const context = canvasRef.current.getContext("2d"); // obtém o contexto 2D do canvas
      canvasRef.current.width = videoRef.current.videoWidth; // ajusta a largura do canvas ao vídeo
      canvasRef.current.height = videoRef.current.videoHeight; // ajusta a altura do canvas ao vídeo
      context.drawImage(videoRef.current, 0, 0); // desenha o frame atual do vídeo no canvas
      canvasRef.current.toBlob((blob) => { // exporta o conteúdo do canvas para um Blob
        if (blob) handleUpload(blob); // se gerou blob, chama o upload
      }, "image/jpeg"); // define o formato e a compressão do JPEG
    } // fim if elementos
  }; // fim capturePhoto

  // Ativa câmera ao abrir página
  useEffect(() => { // efeito que inicia a câmera quando o componente monta
    startCamera(); // chama função de inicialização da câmera
  }, []); // executa apenas uma vez

  // Desativa câmera ao sair da página
  useEffect(() => { // efeito de limpeza do stream ao desmontar
    return () => { // função de cleanup
      if (stream) stream.getTracks().forEach((track) => track.stop()); // para todas as trilhas do stream (libera câmera)
    }; // fim cleanup
  }, [stream]); // re-registra cleanup quando o stream mudar

  return ( // JSX da página
    <> {/* fragmento raiz */}
      <Header /> {/* cabeçalho do app */}
      <div className="flex justify-center flex-col items-center"> {/* container centralizado */}
        {/* Ícone */}
        <AiFillUnlock className="size-16 mt-5" alt="Catraca" /> {/* ícone ilustrativo da catraca */}

        {/* Campo de entrada para o ID do funcionário */}
        <div className="mt-4 flex flex-col items-center"> {/* bloco do input do funcionário */}
          <label htmlFor="func-id" className="font-semibold mb-2"> {/* rótulo do campo */}
            ID do Funcionário: {/* texto do rótulo */}
          </label> {/* fim label */}
          <input
            id="func-id"
            type="number"
            className="border border-gray-400 rounded-md px-3 py-2 w-40 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: 1023"
            value={funcionarioId}
            onChange={(e) => setFuncionarioId(e.target.value)}
          /> {/* input controlado para o ID */}
        </div> {/* fim bloco do input */}

        {/* Vídeo da webcam + botão */}
        {cameraActive && ( // renderiza vídeo e botão apenas se a câmera estiver ativa
          <div className="mt-4 flex flex-col items-center"> {/* container do vídeo e ações */}
            <video
              ref={videoRef}
              autoPlay
              className="w-screen sm:max-w-[50vw] rounded-lg shadow-md"
            /> {/* elemento de vídeo que exibe o stream */}
            <button
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={capturePhoto}
            >
              Simular Passagem na Catraca {/* texto do botão */}
            </button> {/* fim botão */}
            <canvas ref={canvasRef} className="hidden" /> {/* canvas oculto usado para captura do frame */}
          </div>
        )} {/* fim render condicional do vídeo */}

        {/* Loading */}
        {loading && ( // mostra indicador de processamento quando loading=true
          <h1 className="text-xl mt-2 font-semibold text-gray-600">
            Processando... {/* mensagem de status */}
          </h1>
        )} {/* fim loading */}

        {/* Exibe imagem processada */}
        {preview && ( // renderiza a imagem retornada do backend quando disponível
          <div className="mt-4 flex flex-col items-center"> {/* container da prévia */}
            <h2 className="font-semibold text-center mb-2">
              Imagem Processada: {/* título da seção */}
            </h2>
            <img
              src={preview}
              alt="Imagem processada"
              className="my-2 rounded-lg max-w-[80vw] shadow-md"
            /> {/* imagem resultante com estilo */}
          </div>
        )} {/* fim preview */}
      </div> {/* fim container principal */}
    </> // fim fragmento
  ); // fim return
} // fim do componente Catraca
