import React, { useRef, useState } from "react";
import axios from "axios";
import img from "../../assets/imgs/photo.png";

export default function Photo() {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const backendIP = "localhost";
  const API_URL = `http://${backendIP}:3001`;

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    if (event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      handleUpload(file);
    }
  };

  const handleFileChange = (event) => {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      handleUpload(file);
    }
  };

  const handleUpload = async (file) => {
    setLoading(true);
  
    const token = localStorage.getItem("access_token"); // ou onde você guarda o JWT
  
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const response = await axios.post(
        `${API_URL}/api/predict`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            "Authorization": `Bearer ${token}`,
          },
        }
      );
  
      if (response.data.frame) {
        setPreview(`data:image/jpeg;base64,${response.data.frame}`);
      }
    } catch (error) {
      console.error("Erro ao enviar a imagem:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };
  

  const startCamera = async () => {
    setCameraActive(true);
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } } // Solicita 1080p
    });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  };
  

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);
      canvasRef.current.toBlob((blob) => {
        handleUpload(blob);
      }, "image/jpeg");
    }
  };

  return (
    <div className="flex justify-center flex-col">
      <div className="flex justify-center">
        <img src={img} className="size-16 mt-5 sm:size-24" />
      </div>
      <div className="flex flex-col justify-center items-center">
        <h1 className="font-semibold mb-4">Arraste ou clique para selecionar uma Foto</h1>

        <input type="file" ref={inputRef} accept="image/*" className="hidden" onChange={handleFileChange} />

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
            <p className="text-gray-600">Processando...</p>
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

        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={startCamera}
        >
          Ativar Webcam
        </button>

        {cameraActive && (
          <div className="mt-4 flex flex-col items-center">
            <video ref={videoRef} autoPlay className="w-full max-w-md rounded-lg" />
            <button
              className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              onClick={capturePhoto}
            >
              Capturar Foto
            </button>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {preview && (
          <div className="mt-4">
            <h2 className="font-semibold">Imagem Processada:</h2>
            <img src={preview} alt="Imagem processada" className="mt-2 w-7xl m-5 rounded-lg shadow-md" />
          </div>
        )}
      </div>
    </div>
  );
}