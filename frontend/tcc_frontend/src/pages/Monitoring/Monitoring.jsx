import React, { useEffect, useState } from 'react'; // React e hooks de estado/efeito
import axios from 'axios'; // Cliente HTTP
import { useNavigate } from 'react-router-dom'; // Navegação programática
import getHostName from "../../../utils/getUrl"; // URL base da API
import Header from '../../components/Header'; // Cabeçalho

export const Monitoring = () => { // Página para cadastrar/editar/remover câmeras
  const [cameras, setCameras] = useState([]); // Lista de câmeras
  const [name, setName] = useState(''); // Campo do formulário: nome
  const [ip, setIp] = useState(''); // Campo do formulário: IP
  const [editingId, setEditingId] = useState(null); // ID em edição (null = criação)
  const navigate = useNavigate(); // Hook para navegação entre rotas
  const API_URL = getHostName(); // URL base da API
  const token = localStorage.getItem('access_token'); // Token JWT salvo no navegador

  const fetchCameras = async () => { // Busca a lista de câmeras no backend
    try {
      const response = await axios.get(`${API_URL}/cameras`); // GET /cameras
      setCameras(response.data); // Armazena a lista de câmeras
    } catch (error) {
      console.error('Erro ao buscar câmeras:', error); // Log de erro
    }
  };

  useEffect(() => { // Carrega câmeras ao montar a página
    fetchCameras(); // Chama a função acima
  }, []); // Executa uma vez na montagem

  const handleAddOrUpdateCamera = async () => { // Cria ou atualiza uma câmera
    if (!name || !ip) return; // Campos obrigatórios simples

    try {
      if (editingId !== null) { // Modo edição
        await axios.put(
          `${API_URL}/cameras/${editingId}`, // PUT /cameras/:id
          { name, ip }, // Corpo JSON
          {
            headers: {
              Authorization: `Bearer ${token}`, // Header de autenticação
            },
          }
        );
      } else { // Modo criação
        await axios.post(
          `${API_URL}/cameras`, // POST /cameras
          { name, ip },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }

      await fetchCameras(); // Recarrega a lista
      setName(''); // Limpa campo nome
      setIp(''); // Limpa campo IP
      setEditingId(null); // Sai do modo edição
    } catch (error) {
      console.error('Erro ao salvar câmera:', error); // Log de erro
    }
  };

  const handleDelete = async (id) => { // Remove uma câmera
    try {
      await axios.delete(
        `${API_URL}/cameras/${id}`, // DELETE /cameras/:id
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      await fetchCameras(); // Atualiza a lista após remover
    } catch (error) {
      console.error('Erro ao remover câmera:', error); // Log de erro
    }
  };

  const handleEdit = (camera) => { // Preenche o formulário para editar
    setName(camera.name);
    setIp(camera.ip);
    setEditingId(camera.id);
  };

  const handleView = (id) => { // Navega para a visualização da câmera
    navigate(`/monitoring/${id}`); // Abre página MonitoringCam
  };

  return (
    <>
      <Header></Header> {/* Cabeçalho global */}
      <div className="p-4 max-w-xl mx-auto"> {/* Container centralizado e estreito */}
        <h2 className="text-xl font-semibold mb-4">Gerenciar Câmeras</h2> {/* Título */}

        {/* Formulário de criação/edição */}
        <div className="flex flex-col gap-2 mb-4">
          <input
            className="border p-2 rounded" // Estilização básica
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

        {/* Lista de câmeras cadastradas */}
        <div className="space-y-3">
          {cameras.length === 0 ? (
            <p className="text-gray-500">Nenhuma câmera adicionada.</p>
          ) : (
            cameras.map(cam => (
              <div key={cam.id} className="border rounded p-5"> {/* Card de câmera */}
                <div>
                  <p className="font-semibold text-red-700">{cam.name}</p> {/* Nome da câmera */}
                  <p className="text-sm text-gray-600 break-all">{cam.ip}</p> {/* IP da câmera */}

                </div>
                <div className="flex gap-2"> {/* Ações */}
                  <button
                    className="text-blue-500 cursor-pointer p-3"
                    onClick={() => handleEdit(cam)}
                  >
                    Editar
                  </button>
                  <button
                    className="text-red-500 cursor-pointer p-3"
                    onClick={() => handleDelete(cam.id)}
                  >
                    Remover
                  </button>
                  <button
                    className="text-green-600 cursor-pointer p-3"
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
    </>
  );
};

