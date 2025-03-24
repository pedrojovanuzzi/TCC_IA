import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

export const MonitoringCam = () => {
  const { id } = useParams();
  const [frame, setFrame] = useState<string | null>(null);

  useEffect(() => {
    const ip = decodeURIComponent(cam || '').replace(/\./g, '_');
    const ws = new WebSocket(`ws://localhost:3001/api/ws/${ip}`);

    ws.onopen = () => {
      console.log("✅ WebSocket conectado");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.erro) {
        console.error("Erro recebido:", data.erro);
        return;
      }
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
  }, [cam]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Câmera em tempo real com YOLO</h2>
      {frame ? (
        <img
          src={frame}
          alt="Stream"
          className="rounded border max-w-4xl w-full aspect-video object-contain"
        />
      ) : (
        <p>🔄 Carregando stream da câmera...</p>
      )}
    </div>
  );
};
