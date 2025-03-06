import React, { useRef, useState, useEffect } from "react";

export default function CamSahi() {
  const videoRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [frame, setFrame] = useState("");

  useEffect(() => {
    const backendIP = "localhost";
    const wsUrl = `ws://${backendIP}:3001/api/ws_sahi`;
  
    const w = new WebSocket(wsUrl);
    
    w.onopen = () => console.log("WebSocket conectado!");
    w.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.frame) setFrame(`data:image/jpeg;base64,${d.frame}`);
    };
    w.onerror = (e) => console.error("Erro no WebSocket:", e);
    w.onclose = () => console.log("WebSocket fechado.");
  
    setWs(w);
    return () => w.close();
  }, []);
  

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ 
      video: { width: { ideal: 1920 }, height: { ideal: 1080 } } // 1080p Full HD
    }).then((stream) => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    });
  }, []);
  
  

  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;
  
      const video = videoRef.current;
      const c = document.createElement("canvas");
  
      c.width = video.videoWidth;
      c.height = video.videoHeight;
  
      c.getContext("2d").drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const b64 = c.toDataURL("image/jpeg").split(",")[1];
  
      ws.send(JSON.stringify({ frame: b64 }));
    }, 500); // ajustado para 1 segundo conforme solicitado
  
    return () => clearInterval(interval);
  }, [ws]);
  

  return (
    <div className="flex justify-center items-center h-screen bg-gray-800" style={{ textAlign: "center" }}>
      {frame && <img src={frame} alt="processed" className="w-1/2" />}
      {!frame && <h1 className="text-3xl font-semibold text-gray-200">Video Ainda Não Iniciado</h1>}
      <video ref={videoRef} style={{ display: "none" }} autoPlay />
    </div>
  );
}
