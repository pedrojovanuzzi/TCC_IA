import React, { useRef, useState, useEffect } from "react";
import getHostNameSocket from "../../../utils/getUrlSocket";
import Header from '../../components/Header';

export default function Cam() {
  const videoRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [frame, setFrame] = useState("");
  const API_URL = getHostNameSocket();
  useEffect(() => {
    const wsUrl = `${API_URL}/ws`;

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
    let streamA;

    navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamA = stream;
    });

    return () => {
      if(streamA){
        streamA.getTracks().forEach(track => track.stop());
      }
    }

  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!videoRef.current || !ws || ws.readyState !== WebSocket.OPEN) return;
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = 420;
      c.getContext("2d").drawImage(videoRef.current, 0, 0, 640, 420);

      const b64 = c.toDataURL("image/jpeg").split(",")[1];
      ws.send(JSON.stringify({ frame: b64 }));
    }, 50);
    return () => clearInterval(interval);
  }, [ws]);

  return (
    <><Header /><div
      className="flex justify-center items-center h-screen bg-gray-200"
      style={{ textAlign: "center" }}
    >
      {frame && <img src={frame} alt="processed" className="mb-10 h-64 sm:w-1/2 sm:h-auto" />}
      {!frame && (
        <h1 className="text-3xl font-semibold text-gray-200">
          Video Ainda Não Iniciado
        </h1>
      )}
      <video ref={videoRef} style={{ display: "none" }} autoPlay />
    </div></>
  );
}
