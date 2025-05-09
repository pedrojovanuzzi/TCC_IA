import React, { useRef, useState } from "react";
import axios from "axios";
import img from "../../assets/imgs/video.png";

export default function Video() {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processedVideo, setProcessedVideo] = useState(null);
  const API_URL = `http://localhost:3001`;
  const token = localStorage.getItem("access_token");

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files[0]) handleUpload(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e) => {
    if (e.target.files[0]) handleUpload(e.target.files[0]);
  };

  const handleUpload = async (file) => {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);

    try {
      // 1) envia e criptografa
      const res = await axios.post(
        `${API_URL}/api/predict_video`,
        form,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const filename = res.data.video_url.split("/").pop();

      // 2) descriptografa antes de exibir
      const dec = await axios.post(
        `${API_URL}/api/decrypt_video`,
        { folder: "video_treinado", filename },
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // 3) cria URL de blob já descriptografado
      const url = URL.createObjectURL(dec.data);
      setProcessedVideo(url);
    } catch (err) {
      console.error("Erro:", err.response?.data || err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center p-6">
      <img src={img} className="w-16 mb-4" />
      <h1 className="font-semibold mb-6">
        {uploading
          ? "Processando vídeo..."
          : "Arraste ou clique para selecionar um vídeo"}
      </h1>
      <input
        type="file"
        ref={inputRef}
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div
        className={`w-2/4 p-12 border-2 border-dashed rounded-lg cursor-pointer text-center ${
          dragging ? "border-blue-500 bg-blue-100" : "border-gray-300"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="text-gray-600">
          {uploading
            ? "Processando..."
            : "Clique ou arraste um vídeo aqui"}
        </span>
      </div>

      {processedVideo && (
        <div className="mt-6 flex flex-col items-center">
          <h2 className="font-semibold mb-2">Vídeo Processado:</h2>
          <video
            controls
            src={processedVideo}
            className="w-2/3 rounded-lg shadow-md"
          />
          {/* <a
            href={processedVideo}
            download="video_processado.mp4"
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Baixar Vídeo
          </a> */}
        </div>
      )}
    </div>
  );
}
