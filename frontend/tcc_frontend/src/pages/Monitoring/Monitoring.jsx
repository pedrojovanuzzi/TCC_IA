import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const Monitoring = () => {
  const [cameras, setCameras] = useState([]);
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [editingId, setEditingId] = useState(null);
  const navigate = useNavigate();
  // 🔄 Buscar lista de câmeras do backend
  const fetchCameras = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/cameras');
      setCameras(response.data);
    } catch (error) {
      console.error('Erro ao buscar câmeras:', error);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  const handleAddOrUpdateCamera = async () => {
    if (!name || !ip) return;

    try {
      if (editingId !== null) {
        await axios.put(`http://localhost:3001/api/cameras/${editingId}`, { name, ip });
      } else {
        await axios.post('http://localhost:3001/api/cameras', { name, ip });
      }
      await fetchCameras(); // Atualiza lista após salvar
      setName('');
      setIp('');
      setEditingId(null);
    } catch (error) {
      console.error('Erro ao salvar câmera:', error);
    }
  };
  
  const handleView = (id) => {
    navigate(`/monitoring/${id}`);
  };
  

  const handleEdit = (camera) => {
    setName(camera.name);
    setIp(camera.ip);
    setEditingId(camera.id);
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`http://localhost:3001/api/cameras/${id}`);
      await fetchCameras();
    } catch (error) {
      console.error('Erro ao remover câmera:', error);
    }
  };

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Gerenciar Câmeras</h2>

      <div className="flex flex-col gap-2 mb-4">
        <input
          className="border p-2 rounded"
          type="text"
          placeholder="Nome da câmera"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <input
          className="border p-2 rounded"
          type="text"
          placeholder="IP da câmera"
          value={ip}
          onChange={e => setIp(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleAddOrUpdateCamera}
        >
          {editingId !== null ? 'Atualizar Câmera' : 'Adicionar Câmera'}
        </button>
      </div>

      <div className="space-y-3">
        {cameras.length === 0 ? (
          <p className="text-gray-500">Nenhuma câmera adicionada.</p>
        ) : (
          cameras.map(cam => (
            <div
              key={cam.id}
              className="flex items-center justify-between border p-2 rounded"
            >
              <div>
                <p className="font-semibold">{cam.name}</p>
                <p className="text-sm text-gray-600">{cam.ip}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="text-blue-500"
                  onClick={() => handleEdit(cam)}
                >
                  Editar
                </button>
                <button
                  className="text-red-500"
                  onClick={() => handleDelete(cam.id)}
                >
                  Remover
                </button>
                <button
                className="text-green-600"
                onClick={() => handleView(cam.id)}
                >
                Visualizar
                </button>

              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
