import React, { useState, useEffect } from "react" // importa React e hooks de estado/efeito para controlar dados e ciclos de vida
import { IoIosCloseCircle } from "react-icons/io" // importa ícone de fechar (X) para botões de exclusão e modal
import getHostName from "../../../utils/getUrl" // função utilitária que retorna a URL base da API/backend
import Header from "../../components/Header" // componente de cabeçalho do app (barra superior)
import axios from "axios" // importa o axios // cliente HTTP para chamadas REST à API
import { FaSpinner } from "react-icons/fa"; // importa ícone de spinner para indicar carregamento

export const Gallery = () => { // exporta o componente funcional Gallery (galeria de imagens/vídeos)
  const [folders, setFolders] = useState([]) // estado com lista de pastas retornadas pela API
  const [selectedFolder, setSelectedFolder] = useState(null) // estado com a pasta atualmente selecionada
  const [files, setFiles] = useState([]) // estado com arquivos (nome/extensão) da pasta selecionada
  const [thumbnails, setThumbnails] = useState({}) // estado com URLs blob (miniaturas descriptografadas)
  const [selectedFile, setSelectedFile] = useState(null) // estado com o arquivo escolhido para pré-visualização no modal
  const [selectedType, setSelectedType] = useState("image") // estado com o tipo do arquivo selecionado (image|video)
  const [fileToDelete, setFileToDelete] = useState(null) // estado com nome do arquivo pendente de exclusão
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false) // estado para confirmação de exclusão em lote
  const [loading, setLoading] = useState(false); // estado de carregamento enquanto miniaturas são geradas/baixadas
  const [error, setError] = useState(''); // estado de erro para exibir mensagens de falha

  const API_URL = getHostName() // obtém a URL base do backend (ex.: http://localhost:3001/api)
  const token = localStorage.getItem("access_token") || "" // resgata token JWT salvo (ou string vazia se não houver)

  // Carrega as pastas da galeria
  useEffect(() => { // efeito que busca as pastas disponíveis na galeria ao montar o componente
    axios.get(`${API_URL}/gallery`) // requisita ao endpoint de listagem de pastas
      .then(res => { setFolders(res.data.folders || []), console.log(res.data); // atualiza estado com pastas retornadas e loga resposta
      }) // fim do then
      .catch(err => setError(err)) // em caso de erro, armazena o erro para exibir ao usuário
  }, [API_URL]) // reexecuta se a URL base mudar (raro)

  // Carrega as miniaturas dos arquivos quando muda a pasta selecionada
  useEffect(() => { // efeito que roda quando pasta/arquivos mudam para montar miniaturas descriptografadas
    if (!selectedFolder) return // se nenhuma pasta estiver selecionada, não faz nada
    const m = {} // objeto temporário para mapear filename -> blobURL
    setLoading(true); // ativa indicador de carregamento de miniaturas
    const decrypt = (isVideo, filename) => // função que requisita descriptografia, diferenciando imagem/vídeo
  axios.post( // faz POST para endpoints de descriptografia retornando blob
    `${API_URL}/${isVideo ? "decrypt_video" : "decrypt_image"}?mode=blob`, // escolhe endpoint conforme tipo e usa modo blob
    { folder: selectedFolder, filename }, // informa pasta e nome do arquivo
    {
      headers: {
        "Content-Type": "application/json", // declara JSON no corpo
        Authorization: `Bearer ${token}`, // envia token JWT para autorização
      },
      responseType: "blob" // 👈 sempre blob // resposta binária para gerar URL local
    }
  ).then(res => { // ao receber o blob
    m[filename] = URL.createObjectURL(res.data) // cria URL de objeto para pré-visualizar sem salvar em disco
  }) // fim do then


    Promise.all( // aguarda a descriptografia/criação de miniaturas de todos os arquivos
      files.map(f => decrypt(/\.(mp4|mov|webm)$/i.test(f.name), f.name)) // para cada arquivo, chama decrypt informando se é vídeo
    ).then(() => {setThumbnails(m), setLoading(false)}) // ao terminar todos, aplica map de miniaturas e encerra loading
  }, [selectedFolder, files, API_URL, token]) // roda quando muda a pasta, lista de arquivos, url ou token (para garantir consistência)

  const handleFolderClick = (folder) => { // handler ao clicar em uma pasta da lista lateral
    setSelectedFolder(folder) // define pasta selecionada
    const found = folders.find(f => f.name === folder) // localiza o objeto da pasta para extrair seus arquivos
    setFiles(found?.files || []) // atualiza estado de arquivos (ou lista vazia)
    setThumbnails({}) // limpa miniaturas anteriores para evitar exibição de dados obsoletos
  } // fim handleFolderClick

  const handleFileClick = (name) => { // handler para abrir o modal de pré-visualização de um arquivo
    setSelectedFile(thumbnails[name]) // define a URL blob correspondente ao arquivo
    setSelectedType(/\.(mp4|mov|webm)$/i.test(name) ? "video" : "image") // decide tipo com base na extensão
  } // fim handleFileClick

  const closeModal = () => setSelectedFile(null) // fecha o modal limpando o arquivo selecionado

  const handleDelete = () => { // handler para exclusão de um único arquivo
    axios.delete(`${API_URL}/delete`, { // chama endpoint de exclusão
      headers: {
        "Content-Type": "application/json", // declara JSON
        Authorization: `Bearer ${token}`, // envia token JWT
      },
      data: { folder: selectedFolder, filename: fileToDelete }, // envia no corpo a pasta e o arquivo a excluir
    }).then(() => window.location.reload()) // ao concluir, recarrega a página para refletir mudanças
      .catch(err => setError(err)) // se falhar, armazena erro para exibição
  } // fim handleDelete

  const handleBatchDelete = () => { // handler para exclusão em lote de todos os arquivos da pasta
    axios.delete(`${API_URL}/delete-batch`, { // chama endpoint de exclusão múltipla
      headers: {
        "Content-Type": "application/json", // declara JSON
        Authorization: `Bearer ${token}`, // envia token JWT
      },
      data: {
        folder: selectedFolder, // informa a pasta atual
        filenames: files.map(f => f.name), // lista todos os nomes de arquivo para exclusão
      },
    }).then(() => window.location.reload()) // recarrega a página após concluir
      .catch(err => setError(err)) // registra erro se houver falha
  } // fim handleBatchDelete

  return ( // início da renderização JSX do componente
    <> // fragmento React (sem criar nó extra)
      <Header /> // cabeçalho do aplicativo (navegação/logo)
      <div className="p-6"> // container principal com padding
        <h1 className="text-2xl font-bold mb-4">Gallery</h1> // título da página
        <div className="flex gap-6 flex-col items-center sm:items-baseline sm:flex-row"> // layout responsivo: coluna no mobile, linha no desktop
          <div className="flex flex-col sm:w-1/4 "> // coluna lateral com lista de pastas
            {folders.map(f => ( // itera sobre as pastas retornadas pela API
              <button
                key={f.name} // chave única baseada no nome da pasta
                onClick={() => handleFolderClick(f.name)} // ao clicar, seleciona a pasta e carrega arquivos
                className="w-screen sm:w-full p-5 sm:p-2 mb-2 bg-gray-200 rounded hover:bg-gray-300" // estilos do botão/lista
              >
                {f.name} // exibe o nome da pasta
              </button>
            ))} // fim do map de pastas
          </div>
          <div className="w-3/4"> // área principal para miniaturas e ações
            {selectedFolder && ( // renderiza conteúdo apenas se houver uma pasta selecionada
              <> // fragmento para agrupar cabeçalho + grid
                <div className="flex flex-col sm:flex-row items-center mb-4 gap-5"> // barra superior com título e ações
                  <h2 className="text-lg font-semibold mr-4"> // subtítulo com nome da pasta selecionada
                    {selectedFolder} // nome da pasta
                  </h2>
                  <button
                    onClick={() => setConfirmBatchDelete(true)} // abre modal de confirmação para apagar tudo
                    className="px-4 py-1 bg-red-500 text-white rounded" // botão de "Excluir todos"
                  >
                    Excluir todos // texto do botão
                  </button>
                   <div className="flex gap-2 items-center"> // área para mensagens de erro e loading
                                                     {error && <p className="text-red-500">Erro: {error}</p>} // exibe erro se existir
                  {loading && <><p>Carregando</p><FaSpinner className="animate-spin"></FaSpinner></>} // exibe spinner e texto enquanto carrega
                   </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4"> // grid de miniaturas (2 colunas no mobile, 4 no desktop)

                  {files.map(f => ( // itera sobre os arquivos da pasta selecionada
                    <div
                      key={f.name} // chave única por nome de arquivo
                      className="relative border rounded overflow-hidden" // cartão da miniatura com borda e cantos arredondados
                    >
                      {thumbnails[f.name] && /\.(jpg|jpeg|png)$/i.test(f.name) ? ( // se há thumbnail e extensão de imagem...
                        <img
                          src={thumbnails[f.name]} // usa blobURL da imagem descriptografada
                          className="w-full h-32 object-cover cursor-pointer" // miniatura cortada para caber no card
                          onClick={() => handleFileClick(f.name)} // abre modal ao clicar
                        />
                      ) : thumbnails[f.name] ? ( // senão, se há thumbnail mas é de vídeo...
                        <video
                          src={thumbnails[f.name]} // usa blobURL do vídeo descriptografado
                          className="w-full h-32 object-cover cursor-pointer" // miniatura de vídeo
                          onClick={() => handleFileClick(f.name)} // abre modal ao clicar
                          muted // silencia o vídeo na miniatura
                        />
                      ) : null} // se ainda não carregou thumbnail, não renderiza nada
                      <div className="p-1 text-center text-sm">{f.name}</div> // legenda com o nome do arquivo
                      <button
                        onClick={() => setFileToDelete(f.name)} // ao clicar no X, prepara exclusão do arquivo
                        className="absolute top-1 right-1 text-red-500" // posiciona botão de fechar no canto
                      >
                        <IoIosCloseCircle size={20} /> // ícone de fechar (excluir)
                      </button>
                    </div>
                  ))} // fim do map de arquivos
                </div>
              </>
            )} // fim do condicional de pasta selecionada
          </div>
        </div>

        {selectedFile && ( // se há arquivo selecionado, exibe modal de pré-visualização
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" // overlay escuro centralizado
            onClick={closeModal} // clicar fora fecha o modal
          >
            <button
              onClick={closeModal} // botão de fechar no canto superior direito
              className="absolute top-4 right-4 text-white text-3xl" // estilo do botão de fechar
            >
              <IoIosCloseCircle /> // ícone de fechar
            </button>
            <div
              className="bg-white p-4 rounded" // container branco do conteúdo do modal
              onClick={e => e.stopPropagation()} // evita fechar ao clicar dentro do modal
            >
              {selectedType === "image" ? ( // se o tipo for imagem...
                <img
                  src={selectedFile} // exibe imagem em tamanho máximo permitido
                  className="max-w-full max-h-[80vh]" // limita dimensões para caber na tela
                />
              ) : ( // senão, trata como vídeo
                <video
                  controls // exibe controles do player
                  src={selectedFile} // fonte do vídeo (blobURL)
                  className="max-w-full max-h-[80vh]" // limita dimensões do vídeo
                />
              )}
            </div>
          </div>
        )}

        {fileToDelete && ( // se há um arquivo marcado para excluir, mostra modal de confirmação
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"> // overlay translúcido centralizado
            <div className="bg-white p-4 rounded"> // caixa de diálogo
              <p>Excluir {fileToDelete}?</p> // pergunta de confirmação com nome do arquivo
              <button
                onClick={handleDelete} // confirma e executa exclusão
                className="px-2 py-1 bg-red-500 text-white rounded mr-2" // botão "Sim" estilizado
              >
                Sim // texto do botão de confirmação
              </button>
              <button
                onClick={() => setFileToDelete(null)} // cancela e fecha modal
                className="px-2 py-1 bg-gray-300 rounded" // botão "Não" estilizado
              >
                Não // texto do botão de cancelamento
              </button>
            </div>
          </div>
        )}

        {confirmBatchDelete && ( // se solicitou exclusão em lote, exibe modal de confirmação
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"> // overlay translúcido
            <div className="bg-white p-4 rounded"> // caixa de diálogo de confirmação
              <p>Excluir todos os arquivos?</p> // pergunta de confirmação
              <button
                onClick={handleBatchDelete} // confirma e executa exclusão em lote
                className="px-2 py-1 bg-red-500 text-white rounded mr-2" // botão "Sim" estilizado
              >
                Sim // confirma exclusão de todos
              </button>
              <button
                onClick={() => setConfirmBatchDelete(false)} // cancela e fecha modal
                className="px-2 py-1 bg-gray-300 rounded" // botão "Não" estilizado
              >
                Não // cancela exclusão em lote
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  ) // fim do retorno do componente
} // fim do componente Gallery
