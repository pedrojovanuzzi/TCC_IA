// Página para upload/captura de foto com anotações da API
import React, { useRef, useState, useEffect } from "react"; // React e hooks
import axios from "axios"; // Cliente HTTP
import img from "../../assets/imgs/photo.png"; // Ícone ilustrativo
import getHostName from "../../../utils/getUrl"; // URL base da API
import Header from "../../components/Header"; // Cabeçalho

export default function Photo() { // Componente principal da página Photo
  // Refs e estados
  const inputRef = useRef(null); // Ref do input de arquivo
  const videoRef = useRef(null); // Ref do elemento <video> (webcam)
  const canvasRef = useRef(null); // Ref do <canvas> (captura de frame)
  const [dragging, setDragging] = useState(false); // Indica estado de arrastar/soltar
  const [preview, setPreview] = useState(null); // URL blob do preview processado
  const [loading, setLoading] = useState(false); // Indicador de carregamento
  const [cameraActive, setCameraActive] = useState(false); // Se webcam está ativa
  const [stream, setStream] = useState(null); // MediaStream da webcam

  const API_URL = getHostName(); // URL base da API
  const CAMERA_NAME = "cam_photo"; // Nome fixo da câmera/fonte

  // --- Manipuladores de arrastar e soltar ---
  const handleDragOver = (event) => {
    event.preventDefault(); // Permite o drop
    setDragging(true); // Ativa estilo de arrasto
  };

  const handleDragLeave = () => {
    setDragging(false); // Saiu da área de arrasto
  };

  const handleDrop = (event) => {
    event.preventDefault(); // Evita abrir arquivo no navegador
    setDragging(false); // Finaliza arrasto
    if (event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0]; // Primeiro arquivo
      handleUpload(file); // Envia para API
    }
  };

  // --- Upload de arquivo manual ---
  const handleFileChange = (event) => {
    if (event.target.files.length > 0) {
      const file = event.target.files[0]; // Primeiro arquivo selecionado
      handleUpload(file); // Envia para API
    }
  };

  // --- Envio para o backend /predict ---
  const handleUpload = async (file) => {
    setLoading(true); // Ativa loading
    const token = localStorage.getItem("access_token"); // Recupera token

    const formData = new FormData(); // Multipart form
    formData.append("file", file); // Arquivo
    formData.append("camera_name", CAMERA_NAME); // Nome da câmera (origem)

    try {
      const response = await axios.post(`${API_URL}/predict`, formData, {
        headers: {
          Authorization: `Bearer ${token}`, // Autorização
          "Content-Type": "multipart/form-data", // Envio multipart
        },
        responseType: "blob", // recebe imagem processada
      });

      const url = URL.createObjectURL(response.data); // Cria URL blob
      if (preview) URL.revokeObjectURL(preview); // Libera anterior
      setPreview(url); // Salva preview
    } catch (error) {
      console.error("�?O Erro ao enviar a imagem:", error.response?.data || error); // Mantém texto original
    } finally {
      setLoading(false); // Encerra loading
    }
  };

  // --- Ativar webcam ---
  const startCamera = async () => {
    setCameraActive(true); // Mostra bloco de webcam
    const s = await navigator.mediaDevices.getUserMedia({ // Solicita webcam
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, // Preferência de resolução
    });
    setStream(s); // Guarda stream
    if (videoRef.current) {
      videoRef.current.srcObject = s; // Atribui stream ao <video>
    }
  };

  // --- Capturar foto da webcam e enviar ---
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d"); // Contexto 2D
      canvasRef.current.width = videoRef.current.videoWidth; // Ajusta largura
      canvasRef.current.height = videoRef.current.videoHeight; // Ajusta altura
      context.drawImage(videoRef.current, 0, 0); // Desenha frame atual
      canvasRef.current.toBlob((blob) => {
        if (blob) handleUpload(blob); // Envia a imagem capturada
      }, "image/jpeg");
    }
  };

  // --- Encerrar stream da câmera ao desmontar ---
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop()); // Para todas as tracks
      }
    };
  }, [stream]);

  return (
    <>
      <Header />
      <div className="flex justify-center flex-col">
        <div className="flex justify-center">
          <img src={img} className="size-16 mt-5 sm:size-24" alt="�?cone" />
        </div>
        <div className="flex flex-col justify-center items-center">
          <h1 className="font-semibold mb-4">Arraste ou clique para selecionar uma Foto</h1>

          {/* INPUT DE ARQUIVO */}
          <input
            type="file"
            ref={inputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* ÁREA DE ARRASTO */}
          <div
            className={`relative cursor-pointer block w-2/4 rounded-lg border-2 border-dashed ${
              dragging ? "border-blue-500 bg-blue-100" : "border-gray-300"
            } p-12 text-center hover:border-gray-400`}
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>
              </div>
            ) : (
              <>
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                  className="mx-auto size-12 text-gray-400"
                >
                  <path
                    d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="mt-2 block text-sm font-semibold text-gray-900">
                  Selecione ou arraste uma Foto aqui
                </span>
              </>
            )}
          </div>

          {/* BOTÃO WEBCAM */}
          <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={startCamera}>
            Ativar Webcam
          </button>

          {/* CAPTURA E PREVIEW */}
          {cameraActive && (
            <div className="mt-4 flex flex-col items-center">
              <video ref={videoRef} autoPlay className="w-full max-w-md rounded-lg" />
              <button className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600" onClick={capturePhoto}>
                Capturar Foto
              </button>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {/* IMAGEM PROCESSADA */}
          {preview && (
            <div className="mt-4 flex flex-col">
              <h2 className="font-semibold text-center">Imagem Processada:</h2>
              <img src={preview} alt="Imagem processada" className="my-2 rounded-lg max-w-[80vw] shadow-md" />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

