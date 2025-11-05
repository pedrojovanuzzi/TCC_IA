import React, { useRef, useState } from "react";
import axios from "axios";
import img from "../../assets/imgs/video.png";
import getHostName from "../../../utils/getUrl";
import Header from "../../components/Header";

export default function Video() {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processedVideo, setProcessedVideo] = useState(null);
  const API_URL = getHostName();
  const token = localStorage.getItem("access_token");
  const CAMERA_NAME = "cam_video"; // 🔸 nome fixo da câmera

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
    form.append("camera_name", CAMERA_NAME); // ✅ envia o nome da câmera

    try {
      const res = await axios.post(`${API_URL}/predict_video`, form, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        responseType: "blob", // vídeo binário
      });

      const url = URL.createObjectURL(res.data);
      if (processedVideo) URL.revokeObjectURL(processedVideo);
      setProcessedVideo(url);
    } catch (err) {
      console.error("Erro:", err.response?.data || err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Header />
      <div className="flex flex-col items-center p-6">
        <img src={img} className="w-16 mb-4" alt="Vídeo" />
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
            {uploading ? <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-cyan-500"></div>
              </div> : "Clique ou arraste um vídeo aqui"}
          </span>
        </div>

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
