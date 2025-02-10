// Remova as duplas atribuições. Cada evento (onopen, onmessage, etc.) deve ser definido apenas 1 vez.
// O código abaixo sobrescrevia onmessage e onclose, então nunca executava o JSON.parse que atualiza o estado:

import React, { useState, useEffect } from "react";

const App = () => {
  const [image, setImage] = useState("");
  const [detections, setDetections] = useState([]);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:3001/ws");

    ws.onopen = () => console.log("WS aberto");

    ws.onmessage = (event) => {
      console.log("Recebido:", event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.frame) setImage(`data:image/jpeg;base64,${data.frame}`);
        if (data.detections) setDetections(data.detections);
      } catch (err) {
        console.error("Erro ao parsear JSON:", err);
      }
    };

    ws.onerror = (e) => console.error("Erro:", e);
    ws.onclose = () => console.log("WS fechado");

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Detecção de EPI com YOLOv8</h1>
      {image && (
        <img
          src={image}
          alt="Webcam"
          style={{ width: "640px", border: "2px solid black" }}
        />
      )}
      <div>
        <h2>Detecções:</h2>
        <ul>
          {detections.map((det, i) => (
            <li key={i}>
              {det.class} - Confiança: {Math.round(det.confidence * 100)}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
