// Importa bibliotecas necessárias
import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import img from "../../assets/imgs/photo.png";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export default function Catraca() {
  // Referências para os elementos de vídeo, input e canvas
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Estados de controle do componente
  const [preview, setPreview] = useState(null);       // imagem processada
  const [loading, setLoading] = useState(false);      // indicador de carregamento
  const [cameraActive, setCameraActive] = useState(false); // se a webcam está ativa
  const [stream, setStream] = useState(null);         // fluxo de vídeo ativo

  // URL base do backend
  const API_URL = getHostName();

  // Token JWT armazenado localmente
  const token = localStorage.getItem("access_token");

  // Nome da câmera (pode vir fixo ou configurável depois)
  const CAMERA_NAME = "catraca_entrada"; // ✅ nome enviado ao backend

  // Função que envia a imagem capturada ao backend
  const handleUpload = async (file) => {
    setLoading(true); // ativa loading
    const formData = new FormData(); // cria objeto de formulário

    // adiciona arquivo e nome da câmera ao payload
    formData.append("file", file);
    formData.append("camera_name", CAMERA_NAME);

    try {
      // faz a requisição POST para o backend
      const response = await axios.post(`${API_URL}/predict_catraca`, formData, {
        headers: {
          Authorization: `Bearer ${token}`, // autenticação JWT
        },
        responseType: "blob", // resposta virá como imagem
      });

      // cria uma URL local para exibir a imagem retornada
      const url = URL.createObjectURL(response.data);
      if (preview) URL.revokeObjectURL(preview); // limpa imagem anterior
      setPreview(url); // exibe nova imagem
    } catch (error) {
      console.error("❌ Erro ao enviar a imagem:", error.response?.data || error);
    } finally {
      setLoading(false); // desativa loading
    }
  };

  // Ativa a webcam do usuário
  const startCamera = async () => {
    setLoading(true);
    try {
      setCameraActive(true);
      // solicita permissão e abre câmera
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
      }
    } catch (error) {
      console.error("❌ Erro ao acessar a câmera:", error);
    } finally {
      setLoading(false);
    }
  };

  // Captura uma foto do vídeo atual e envia para o backend
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      // desenha o frame atual da câmera no canvas
      context.drawImage(videoRef.current, 0, 0);
      // converte o conteúdo do canvas para blob JPEG e envia
      canvasRef.current.toBlob((blob) => {
        if (blob) handleUpload(blob);
      }, "image/jpeg");
    }
  };

  // Inicia a câmera automaticamente ao abrir a página
  useEffect(() => {
    startCamera();
  }, []);

  // Encerra a câmera ao sair da página
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <>
      <Header />
      <div className="flex justify-center flex-col">
        <div className="flex flex-col justify-center items-center">
          {/* Se a câmera estiver ativa, mostra o vídeo e o botão */}
          {cameraActive && (
            <div className="mt-4 flex flex-col items-center">
              <video
                ref={videoRef}
                autoPlay
                className="w-screen sm:max-w-[50vw] rounded-lg"
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

          {/* Mensagem de carregamento */}
          {loading && (
            <h1 className="text-xl mt-2 font-semibold text-gray-600">
              Carregando...
            </h1>
          )}

          {/* Exibe a imagem processada */}
          {preview && (
            <div className="mt-4 flex flex-col">
              <h2 className="font-semibold text-center">
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
      </div>
    </>
  );
}
