import React, { useRef, useState, useEffect } from "react";
import ProtectedPage from "../../components/ProtectedPage";

export default function Cam() {
  const videoRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [frame, setFrame] = useState("");

  useEffect(() => {
    const w = new WebSocket("ws://localhost:3001/ws");
    w.onopen = () => console.log("WS aberto");
    w.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.frame) setFrame(`data:image/jpeg;base64,${d.frame}`);
    };
    w.onerror = (e) => console.log("WS erro:", e);
    w.onclose = () => console.log("WS fechado");
    setWs(w);
    return () => w.close();
  }, []);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) videoRef.current.srcObject = stream;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 480;
      c.getContext("2d").drawImage(videoRef.current, 0, 0, 640, 480);
      const b64 = c.toDataURL("image/jpeg").split(",")[1];
      ws.send(JSON.stringify({ frame: b64 }));
    }, 50);
    return () => clearInterval(interval);
  }, [ws]);

  return (
    <ProtectedPage>
    <div className="flex justify-center items-center h-screen bg-gray-800" style={{ textAlign: "center" }}>
      {frame && <img src={frame} alt="processed" style={{ width: "1920px" }} />}
      {!frame && <h1 className="text-3xl font-semibold text-gray-200">Video Ainda Não Iniciado</h1>}
      <video ref={videoRef} style={{ display: "none" }} autoPlay />
    </div>
    </ProtectedPage>
  );
}
