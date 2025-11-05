import React, { useRef, useState } from "react"; // importa React e hooks para referências (useRef) e estado (useState)
import axios from "axios"; // importa axios para fazer requisições HTTP ao backend
import img from "../../assets/imgs/video.png"; // importa a imagem usada como ícone na interface
import getHostName from "../../../utils/getUrl"; // função utilitária que retorna a URL base da API
import Header from "../../components/Header"; // componente de cabeçalho reutilizável

export default function Video() { // declara e exporta o componente funcional principal "Video"
  const inputRef = useRef(null); // referência ao input[type="file"] para acionar clique programaticamente
  const [dragging, setDragging] = useState(false); // estado visual: indica se há arquivo sendo arrastado sobre a área
  const [uploading, setUploading] = useState(false); // estado de carregamento: indica se o vídeo está sendo enviado/processado
  const [processedVideo, setProcessedVideo] = useState(null); // URL blob do vídeo processado retornado pelo backend
  const API_URL = getHostName(); // resolve a URL base do backend (ex.: http://localhost:3001/api)
  const token = localStorage.getItem("access_token"); // recupera o token JWT salvo no navegador para autenticação
  const CAMERA_NAME = "cam_video"; // 🔸 nome fixo da câmera // identifica a origem no backend

  const handleDragOver = (e) => { // handler chamado quando um arquivo é arrastado sobre a área
    e.preventDefault(); // evita o comportamento padrão do browser (abrir o arquivo)
    setDragging(true); // ativa o estado visual de arraste
  }; // fim handleDragOver
  const handleDragLeave = () => setDragging(false); // handler quando o arquivo sai da área de arraste, desativa o estado visual
  const handleDrop = (e) => { // handler quando o arquivo é solto na área
    e.preventDefault(); // previne comportamento padrão do drop
    setDragging(false); // desativa o estado de arraste
    if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); // se houver arquivo, envia para processamento
  }; // fim handleDrop
  const handleFileChange = (e) => { // handler para seleção manual de arquivo pelo input
    if (e.target.files[0]) handleUpload(e.target.files[0]); // envia o primeiro arquivo selecionado
  }; // fim handleFileChange

  const handleUpload = async (file) => { // função responsável por enviar o vídeo ao backend e receber o processado
    setUploading(true); // liga o indicador de processamento
    const form = new FormData(); // cria um FormData para envio multipart/form-data
    form.append("file", file); // adiciona o arquivo de vídeo ao corpo da requisição
    form.append("camera_name", CAMERA_NAME); // ✅ envia o nome da câmera // backend registra a origem

    try { // tenta enviar e receber resposta
      const res = await axios.post(`${API_URL}/predict_video`, form, { // faz POST para o endpoint de processamento de vídeo
        headers: { // define cabeçalhos HTTP
          "Content-Type": "multipart/form-data", // indica que o corpo é multipart/form-data (necessário para arquivo)
          Authorization: `Bearer ${token}`, // envia o token JWT para autenticação
        }, // fim headers
        responseType: "blob", // vídeo binário // instrui axios a tratar a resposta como Blob
      }); // fim requisição axios

      const url = URL.createObjectURL(res.data); // cria uma URL temporária (blob:) para reproduzir o vídeo retornado
      if (processedVideo) URL.revokeObjectURL(processedVideo); // libera URL anterior para evitar vazamento de memória
      setProcessedVideo(url); // armazena a nova URL do vídeo processado no estado para exibição
    } catch (err) { // captura e trata erros da requisição
      console.error("Erro:", err.response?.data || err); // loga o erro no console com detalhe da resposta (se existir)
    } finally { // executa sempre, com sucesso ou erro
      setUploading(false); // desliga o indicador de processamento
    } // fim try/catch/finally
  }; // fim handleUpload

  return ( // JSX que renderiza a interface do componente
    <> // fragmento React para agrupar elementos sem adicionar uma div extra
      <Header /> {/* renderiza o cabeçalho padrão da aplicação */}
      <div className="flex flex-col items-center p-6"> {/* container principal centralizado com padding */}
        <img src={img} className="w-16 mb-4" alt="Vídeo" /> {/* ícone ilustrativo acima da área de upload */}
        <h1 className="font-semibold mb-6"> {/* título dinâmico conforme estado de upload */}
          {uploading
            ? "Processando vídeo..."
            : "Arraste ou clique para selecionar um vídeo"}
        </h1> {/* fim do título */}

        <input
          type="file"
          ref={inputRef}
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        /> {/* input de arquivo oculto: acionado ao clicar na área de upload */}

        <div
          className={`w-2/4 p-12 border-2 border-dashed rounded-lg cursor-pointer text-center ${
            dragging ? "border-blue-500 bg-blue-100" : "border-gray-300"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        > {/* área de arraste/solta e clique para selecionar arquivo */}
          <span className="text-gray-600">
            {uploading ? <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>
              </div> : "Clique ou arraste um vídeo aqui"}
          </span> {/* texto/loader exibido dentro da área de upload */}
        </div>

        {processedVideo && (
          <div className="mt-6 flex flex-col items-center">
            <h2 className="font-semibold mb-2">Vídeo Processado:</h2> {/* título da seção de resultado */}
            <video
              controls
              src={processedVideo}
              className="w-screen sm:w-2/3 rounded-lg shadow-md"
            />
          </div>
        )} {/* exibe o player do vídeo processado quando disponível */}
      </div>
    </> // fim do fragmento raiz
  ); // fim do return JSX
} // fim do componente Video
