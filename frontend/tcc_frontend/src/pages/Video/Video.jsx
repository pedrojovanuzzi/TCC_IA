import React, { useRef, useState } from "react";
import axios from "axios";
import img from "../../assets/imgs/video.png";

export default function Video() {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processedVideo, setProcessedVideo] = useState(null);
  const backendIP = window.location.hostname;
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
    setUploading(true);
  
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const response = await axios.post(`${API_URL}/api/predict_video`, formData);
  
      if (response.data.video_url) {
        // Corrige a URL do vídeo para um caminho absoluto
        setProcessedVideo(`${API_URL}/api${response.data.video_url}`);
      }
    } catch (error) {
      console.error("Erro ao enviar o vídeo:", error);
    } finally {
      setUploading(false);
    }
  };
  
  
  
  
      

  return (
    <div className="flex justify-center flex-col">
    <div className="flex justify-center">
      <img src={img} className="size-16 mt-5 sm:size-24" />
    </div>
    <div className="flex justify-center items-center flex-col">
      <h1 className="font-semibold mb-6">Arraste ou clique para selecionar um vídeo</h1>

      <input type="file" ref={inputRef} accept="video/*" className="hidden" onChange={handleFileChange} />

      <div
        className={`relative cursor-pointer block w-2/4 rounded-lg border-2 border-dashed ${
          dragging ? "border-blue-500 bg-blue-100" : "border-gray-300"
        } p-12 text-center hover:border-gray-400`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
          {uploading ? "Processando vídeo..." : "Selecione ou arraste um vídeo aqui"}
        </span>
      </div>

      {processedVideo && (
        <div className="mt-6 flex justify-center flex-col items-center">
          <h2 className="font-semibold">Vídeo Processado:</h2>
          <video key={processedVideo} controls className="mt-2 w-2/3 rounded-lg shadow-md">
            <source src={processedVideo} type="video/mp4" />
            Seu navegador não suporta o elemento de vídeo.
          </video>
          <a
            href={processedVideo}
            download="video_processado.mp4"
            className="mt-4 inline-block text-center px-4 py-2 bg-blue-600 w-2xl sm:w-7xl m-5 text-white rounded-lg shadow-md hover:bg-blue-700"
          >
            Baixar Vídeo Processado
          </a>
        </div>
      )}
    </div>
    </div>
  );
}
