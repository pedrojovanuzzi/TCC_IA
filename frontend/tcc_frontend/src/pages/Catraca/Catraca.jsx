// Importa bibliotecas necessárias
import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import img from "../../assets/imgs/photo.png";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";
import { AiFillUnlock } from "react-icons/ai";

export default function Catraca() {
  // Referências para elementos HTML
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Estados do componente
  const [preview, setPreview] = useState(null);          // imagem processada
  const [loading, setLoading] = useState(false);         // indicador de carregamento
  const [cameraActive, setCameraActive] = useState(false); // webcam ativa
  const [stream, setStream] = useState(null);            // stream da câmera
  const [funcionarioId, setFuncionarioId] = useState(""); // 🔸 ID do funcionário digitado

  // API base e token JWT
  const API_URL = getHostName();
  const token = localStorage.getItem("access_token");

  // Nome fixo da câmera (pode trocar depois se quiser)
  const CAMERA_NAME = "catraca_entrada";

  // Envia a imagem capturada + ID do funcionário + nome da câmera
  const handleUpload = async (file) => {
  if (!funcionarioId.trim()) {
    alert("Por favor, insira o ID do funcionário antes de continuar.");
    return;
  }

  setLoading(true);

  const formData = new FormData();
  formData.append("file", file);                   // 👈 arquivo
  formData.append("camera_name", CAMERA_NAME);     // 👈 nome da câmera
  formData.append("user_id", funcionarioId);          // 👈 ID do funcionário (string aceita)

  try {
    const response = await axios.post(`${API_URL}/predict_catraca`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data", // 👈 importante
      },
      responseType: "blob",
    });

    const url = URL.createObjectURL(response.data);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(url);
  } catch (error) {
    console.error("❌ Erro ao enviar imagem:", error.response?.data || error);
  } finally {
    setLoading(false);
  }
};


  // Ativa webcam
  const startCamera = async () => {
    setLoading(true);
    try {
      setCameraActive(true);
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (error) {
      console.error("❌ Erro ao acessar a câmera:", error);
    } finally {
      setLoading(false);
    }
  };

  // Captura frame e envia
  const capturePhoto = () => {
    if (!funcionarioId.trim()) {
      alert("⚠️ Digite o ID do funcionário antes de simular a passagem!");
      return;
    }

    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      canvasRef.current.toBlob((blob) => {
        if (blob) handleUpload(blob);
      }, "image/jpeg");
    }
  };

  // Ativa câmera ao abrir página
  useEffect(() => {
    startCamera();
  }, []);

  // Desativa câmera ao sair da página
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return (
    <>
      <Header />
      <div className="flex justify-center flex-col items-center">
        {/* Ícone */}
        <AiFillUnlock className="size-16 mt-5" alt="Catraca" />

        {/* Campo de entrada para o ID do funcionário */}
        <div className="mt-4 flex flex-col items-center">
          <label htmlFor="func-id" className="font-semibold mb-2">
            ID do Funcionário:
          </label>
          <input
            id="func-id"
            type="number"
            className="border border-gray-400 rounded-md px-3 py-2 w-40 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: 1023"
            value={funcionarioId}
            onChange={(e) => setFuncionarioId(e.target.value)}
          />
        </div>

        {/* Vídeo da webcam + botão */}
        {cameraActive && (
          <div className="mt-4 flex flex-col items-center">
            <video
              ref={videoRef}
              autoPlay
              className="w-screen sm:max-w-[50vw] rounded-lg shadow-md"
            />
            <button
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={capturePhoto}
            >
              Simular Passagem na Catraca
            </button>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <h1 className="text-xl mt-2 font-semibold text-gray-600">
            Processando...
          </h1>
        )}

        {/* Exibe imagem processada */}
        {preview && (
          <div className="mt-4 flex flex-col items-center">
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