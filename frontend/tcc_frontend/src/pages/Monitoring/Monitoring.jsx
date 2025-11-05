import React, { useEffect, useState } from 'react'; // importa React e hooks para efeitos e estado
import axios from 'axios'; // importa cliente HTTP para chamadas à API
import { useNavigate } from 'react-router-dom'; // importa hook para navegação programática entre rotas
import getHostName from "../../../utils/getUrl"; // importa utilitário que retorna a URL base da API
import Header from '../../components/Header'; // importa o componente de cabeçalho

export const Monitoring = () => { // declara e exporta o componente de gerenciamento de câmeras
  const [cameras, setCameras] = useState([]); // estado com a lista de câmeras vinda do backend
  const [name, setName] = useState(''); // estado controlado do campo de nome da câmera
  const [ip, setIp] = useState(''); // estado controlado do campo de IP da câmera
  const [editingId, setEditingId] = useState(null); // estado que guarda o id da câmera em edição (ou null para criação)
  const navigate = useNavigate(); // obtém função para navegar para outras rotas
  const API_URL = getHostName(); // resolve a URL base da API (ex.: http://localhost:3001/api)
  const token = localStorage.getItem('access_token'); // recupera o token JWT do armazenamento local

  const fetchCameras = async () => { // função assíncrona para buscar a lista de câmeras no backend
    try { // tenta executar a requisição
      const url = getHostName(); // obtém novamente a URL base (não usada abaixo, mas mantém compatibilidade)
      const response = await axios.get(`${API_URL}/cameras`); // faz GET no endpoint de câmeras
      setCameras(response.data); // atualiza o estado com o array de câmeras retornado
    } catch (error) { // captura falhas da requisição
      console.error('Erro ao buscar câmeras:', error); // loga o erro no console
    } // fim try/catch
  }; // fim de fetchCameras

  useEffect(() => { // efeito que roda ao montar o componente
    fetchCameras(); // carrega a lista inicial de câmeras
  }, []); // dependência vazia: executa apenas uma vez

  const handleAddOrUpdateCamera = async () => { // cria ou atualiza uma câmera conforme o estado editingId
    if (!name || !ip) return; // valida: se nome ou ip estiverem vazios, sai sem fazer nada

    try { // tenta enviar ao backend
      if (editingId !== null) { // se há um id em edição, é atualização
        await axios.put( // chama PUT para atualizar a câmera existente
          `${API_URL}/cameras/${editingId}`, // endpoint com o id da câmera
          { name, ip }, // corpo com os campos a atualizar
          {
            headers: {
              Authorization: `Bearer ${token}`, // envia token JWT no header
            },
          }
        ); // fim do PUT
      } else { // caso contrário, é criação de nova câmera
        await axios.post( // chama POST para criar a câmera
          `${API_URL}/cameras`, // endpoint de criação
          { name, ip }, // corpo com os dados da nova câmera
          {
            headers: {
              Authorization: `Bearer ${token}`, // envia token JWT no header
            },
          }
        ); // fim do POST
      } // fim if/else

      await fetchCameras(); // recarrega a lista após salvar
      setName(''); // limpa campo de nome
      setIp(''); // limpa campo de IP
      setEditingId(null); // sai do modo de edição
    } catch (error) { // captura falhas no salvar
      console.error('Erro ao salvar câmera:', error); // loga o erro
    } // fim try/catch
  }; // fim de handleAddOrUpdateCamera

  const handleDelete = async (id) => { // remove uma câmera pelo id
    try { // tenta excluir no backend
      await axios.delete( // chama DELETE no endpoint da câmera
        `${API_URL}/cameras/${id}`, // endpoint com o id a remover
        {
          headers: {
            Authorization: `Bearer ${token}`, // envia token para autorização
          },
        }
      ); // fim do DELETE
      await fetchCameras(); // recarrega a lista após remover
    } catch (error) { // captura erros
      console.error('Erro ao remover câmera:', error); // loga o erro
    } // fim try/catch
  }; // fim de handleDelete

  const handleEdit = (camera) => { // entra no modo de edição preenchendo os campos com a câmera selecionada
    setName(camera.name); // preenche o campo de nome
    setIp(camera.ip); // preenche o campo de IP
    setEditingId(camera.id); // define o id que está sendo editado
  }; // fim de handleEdit

  const handleView = (id) => { // navega para a tela de visualização/monitoramento da câmera
    navigate(`/monitoring/${id}`); // muda a rota para a página de monitoramento da câmera indicada
  }; // fim de handleView

  return ( // começa a renderização do JSX
    <><Header></Header><div className="p-4 max-w-xl mx-auto"> // adiciona o cabeçalho e um container centralizado com padding
      <h2 className="text-xl font-semibold mb-4">Gerenciar Câmeras</h2> // título da página

      <div className="flex flex-col gap-2 mb-4"> // formulário simples de criação/edição
        <input
          className="border p-2 rounded" // estilos do input
          type="text" // tipo texto
          placeholder="Nome da câmera" // placeholder do campo nome
          value={name} // valor controlado do estado name
          onChange={e => setName(e.target.value)} /> // atualiza state ao digitar
        <input
          className="border p-2 rounded" // estilos do input
          type="text" // tipo texto
          placeholder="IP da câmera" // placeholder do campo IP
          value={ip} // valor controlado do estado ip
          onChange={e => setIp(e.target.value)} /> // atualiza state ao digitar
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded" // estilos do botão
          onClick={handleAddOrUpdateCamera} // ao clicar, cria/atualiza a câmera
        >
          {editingId !== null ? 'Atualizar Câmera' : 'Adicionar Câmera'} // texto do botão muda conforme modo de edição
        </button>
      </div>

      <div className="space-y-3"> // lista de câmeras com ações
        {cameras.length === 0 ? ( // se não existem câmeras cadastradas
          <p className="text-gray-500">Nenhuma câmera adicionada.</p> // mensagem de vazio
        ) : (
          cameras.map(cam => ( // mapeia e exibe cada câmera
            <div key={cam.id} className="border rounded p-5"> // card da câmera com borda e padding
              <div> // bloco de informações
                <p className="font-semibold text-red-700">{cam.name}</p> // mostra o nome em destaque
                <p className="text-sm text-gray-600 break-all">{cam.ip}</p> // mostra o IP (quebra linha se for grande)

              </div>
              <div className="flex gap-2"> // bloco de botões de ação
                <button
                  className="text-blue-500 cursor-pointer p-3" // estilos do botão editar
                  onClick={() => handleEdit(cam)} // aciona modo edição com os dados da câmera
                >
                  Editar
                </button>
                <button
                  className="text-red-500 cursor-pointer p-3" // estilos do botão remover
                  onClick={() => handleDelete(cam.id)} // exclui a câmera pelo id
                >
                  Remover
                </button>
                <button
                  className="text-green-600 cursor-pointer p-3" // estilos do botão visualizar
                  onClick={() => handleView(cam.id)} // navega para a visualização/monitoramento
                >
                  Visualizar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div></> // fecha o container principal e o fragmento com Header
  ); // fim do return do JSX
}; // fim do componente Monitoring
