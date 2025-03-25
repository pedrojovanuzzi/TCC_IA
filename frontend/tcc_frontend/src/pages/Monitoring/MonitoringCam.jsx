import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

export const MonitoringCam = () => {
  const { id } = useParams();
  const [frame, setFrame] = useState(null);
  const [camera, setCamera] = useState(null);

  useEffect(() => {
    const fetchCamera = async () => {
      try {
        const response = await axios.get(`http://localhost:3001/api/cameras/${id}`);
        setCamera(response.data);
      } catch (error) {
        console.error("Erro ao buscar dados da câmera:", error);
      }
    };

    fetchCamera();
  }, [id]);

  useEffect(() => {
    if (!camera) return;

    const ws = new WebSocket(`ws://localhost:3001/api/ws/camera/${camera.id}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.frame) {
        setFrame(`data:image/jpeg;base64,${data.frame}`);
      }
    };

    ws.onerror = (error) => {
      console.error("Erro no WebSocket:", error);
    };

    return () => {
      ws.close();
    };
  }, [camera]);

  return (
    <div className="p-4 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold mb-4">Visualizando: {camera?.name || "..."}</h2>
      {frame ? (
        <img
          src={frame}
          alt="Frame da câmera"
          className="rounded border max-w-4xl w-full aspect-video object-contain"
        />
      ) : (
        <p>🔄 Carregando stream da câmera...</p>
      )}
    </div>
  );
};
