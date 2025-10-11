import React, { useRef, useState, useEffect } from "react";
import axios from "axios";
import img from "../../assets/imgs/photo.png";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export default function Catraca() {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const API_URL = getHostName();
  const [stream, setStream] = useState(null); // guarda o stream ativo


  const handleUpload = async (file) => {
    setLoading(true);
    const token = localStorage.getItem("access_token");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API_URL}/predict_catraca`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob",
      });

      const url = URL.createObjectURL(response.data);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(url);
    } catch (error) {
      console.error("Erro ao enviar a imagem:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    setLoading(true);
    try {
      setCameraActive(true);
    const s = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } },
    });
    setStream(s);
    if (videoRef.current) {
      videoRef.current.srcObject = s;
    }
    } catch (error) {
      console.error(error);
    }
    finally{
      setLoading(false);
    }
  };

  const capturePhoto = () => {
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

  useEffect(() => {
    startCamera();
  },[])

  // 👇 cleanup quando sair da página (desmontar componente)
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
          {cameraActive && (
            <div className="mt-4 flex flex-col items-center">
              <video ref={videoRef} autoPlay className="w-screen sm:max-w-[50vw] rounded-lg" />
              <button
                className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                onClick={capturePhoto}
              >
                Simular Passar na Catraca
              </button>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}
          {loading && <><h1 className="text-xl mt-2">Carregando...</h1></>}

          {preview && (
            <div className="mt-4 flex flex-col">
              <h2 className="font-semibold text-center">Imagem Processada:</h2>
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
