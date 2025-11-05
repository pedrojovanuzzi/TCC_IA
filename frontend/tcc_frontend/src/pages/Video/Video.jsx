import React, { useRef, useState } from "react"; // React e hooks
import axios from "axios"; // Cliente HTTP
import img from "../../assets/imgs/video.png"; // Ícone ilustrativo
import getHostName from "../../../utils/getUrl"; // URL base da API
import Header from "../../components/Header"; // Cabeçalho

export default function Video() { // Página para enviar vídeo e receber processamento
  const inputRef = useRef(null); // Ref do input de arquivo
  const [dragging, setDragging] = useState(false); // Indica arraste sobre a área
  const [uploading, setUploading] = useState(false); // Indica upload/processamento em andamento
  const [processedVideo, setProcessedVideo] = useState(null); // URL blob do vídeo processado
  const API_URL = getHostName(); // URL base
  const token = localStorage.getItem("access_token"); // Token JWT
  const CAMERA_NAME = "cam_video"; // Nome fixo da câmera

  // Eventos de drag-and-drop
  const handleDragOver = (e) => {
    e.preventDefault(); // Permite o drop
    setDragging(true); // Ativa estado de arraste
  };
  const handleDragLeave = () => setDragging(false); // Saiu da área
  const handleDrop = (e) => {
    e.preventDefault(); // Evita abrir arquivo no navegador
    setDragging(false); // Finaliza arraste
    if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]); // Envia o primeiro arquivo
  };
  const handleFileChange = (e) => {
    if (e.target.files[0]) handleUpload(e.target.files[0]); // Seleção manual
  };

  // Envia o vídeo para a API para processamento
  const handleUpload = async (file) => {
    setUploading(true); // Ativa loading
    const form = new FormData(); // FormData multipart
    form.append("file", file); // Arquivo de vídeo
    form.append("camera_name", CAMERA_NAME); // Envia o nome da câmera (origem)

    try {
      const res = await axios.post(`${API_URL}/predict_video`, form, {
        headers: {
          "Content-Type": "multipart/form-data", // Multipart
          Authorization: `Bearer ${token}`, // Auth
        },
        responseType: "blob", // Vídeo binário
      });

      const url = URL.createObjectURL(res.data); // Cria URL blob
      if (processedVideo) URL.revokeObjectURL(processedVideo); // Libera anterior
      setProcessedVideo(url); // Salva novo
    } catch (err) {
      console.error("Erro:", err.response?.data || err); // Log de erro
    } finally {
      setUploading(false); // Finaliza loading
    }
  };

  return (
    <>
      <Header /> {/* Cabeçalho */}
      <div className="flex flex-col items-center p-6"> {/* Container */}
        <img src={img} className="w-16 mb-4" alt="Vídeo" /> {/* Ícone */}
        <h1 className="font-semibold mb-6"> {/* Título dinâmico */}
          {uploading ? "Processando vídeo..." : "Arraste ou clique para selecionar um vídeo"}
        </h1>

        {/* Input de arquivo oculto */}
        <input
          type="file"
          ref={inputRef}
          accept="video/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Área de arraste/seleção */}
        <div
          className={`w-2/4 p-12 border-2 border-dashed rounded-lg cursor-pointer text-center ${
            dragging ? "border-blue-500 bg-blue-100" : "border-gray-300"
          }`}
          onClick={() => inputRef.current?.click()} // Clique abre seletor de arquivo
          onDragOver={handleDragOver} // Arrastando sobre a área
          onDragLeave={handleDragLeave} // Sai do perímetro
          onDrop={handleDrop} // Solta arquivo
        >
          <span className="text-gray-600"> {/* Texto/loader da área */}
            {uploading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>
              </div>
            ) : (
              "Clique ou arraste um vídeo aqui"
            )}
          </span>
        </div>

        {/* Preview do vídeo processado */}
        {processedVideo && (
          <div className="mt-6 flex flex-col items-center">
            <h2 className="font-semibold mb-2">Vídeo Processado:</h2>
            <video
              controls
              src={processedVideo}
              className="w-screen sm:w-2/3 rounded-lg shadow-md"
            />
          </div>
        )}
      </div>
    </>
  );
}

