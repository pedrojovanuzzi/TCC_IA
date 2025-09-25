import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import getHostName from "../../../utils/getUrl";

export const MonitoringCam = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [frame, setFrame] = useState(null); // string | null
  const [camera, setCamera] = useState(null);
  const closedRef = useRef(false); // evita setState após unmount
  const alertedRef = useRef(false); // evita múltiplos alerts
  const API_URL = getHostName();
  // Busca metadados da câmera
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const response = await axios.get(`${API_URL}/cameras/${id}`);
        if (!cancel) setCamera(response.data);
      } catch (error) {
        console.error("Erro ao buscar dados da câmera:", error);
        if (!cancel && !alertedRef.current) {
          alertedRef.current = true;
          alert("Não foi possível carregar os dados da câmera.");
          navigate(-1);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [id, navigate]);

  // WebSocket
  useEffect(() => {
    if (!camera) return;
    const url = `${API_URL}/ws/camera/${camera.id}`;
    const ws = new WebSocket(url);

    closedRef.current = false;

    ws.onopen = () => {
      // opcional: mostrar que conectou
      // console.log("WS conectado!");
    };

    ws.onmessage = (event) => {
      if (closedRef.current) return;

      try {
        const data = JSON.parse(event.data);

        // Mensagens de erro vindas do backend
        if (data.erro) {
          if (!alertedRef.current) {
            alertedRef.current = true;

            // mensagens comuns que você mandou do backend:
            // "não encontrada", "não conectou", "timeout_stream", "conexao_encerrada"
            const msg =
              data.mensagem ||
              (data.erro === "não encontrada"
                ? "Câmera não encontrada."
                : data.erro === "não conectou"
                ? "Não foi possível conectar à câmera."
                : data.erro === "timeout_stream"
                ? "Tempo de leitura esgotado (stream ficou sem frames)."
                : data.erro === "conexao_encerrada"
                ? "A conexão com o servidor foi encerrada."
                : `Erro: ${data.erro}`);

            alert(msg);
          }
          // Volta para a página anterior
          navigate(-1);
          return;
        }

        // Frame válido
        if (data.frame) {
          setFrame(`data:image/jpeg;base64,${data.frame}`);
        }
      } catch (e) {
        console.error("Falha ao parsear mensagem WS:", e);
      }
    };

    ws.onerror = (error) => {
      console.error("Erro no WebSocket:", error);
      if (!alertedRef.current) {
        alertedRef.current = true;
        alert("Ocorreu um erro na conexão com o servidor.");
      }
      navigate(-1);
    };

    // Se o WS fechar sem avisar, garante voltar
    ws.onclose = () => {
      if (closedRef.current) return; // já estamos desmontando
      if (!alertedRef.current) {
        alertedRef.current = true;
        alert("Conexão encerrada.");
      }
      navigate(-1);
    };

    // Cleanup
    return () => {
      closedRef.current = true;
      try {
        ws.close();
      } catch {}
    };
  }, [camera, navigate]);

  return (
    <div className="p-4 flex flex-col items-center justify-center">
      <h2 className="text-xl font-bold mb-4">
        Visualizando: {camera?.name || "..."}
      </h2>

      {frame ? (
        <img
          src={frame}
          alt="Frame da câmera"
          className="rounded border max-w-6xl w-full h-auto"
        />
      ) : (
        <p>🔄 Carregando stream da câmera...</p>
      )}
    </div>
  );
};
