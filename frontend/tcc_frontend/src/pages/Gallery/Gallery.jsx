// Importações e utilitários
import React, { useState, useEffect } from "react"; // React + hooks de estado/efeito
import { IoIosCloseCircle } from "react-icons/io"; // Ícone (remover/fechar)
import getHostName from "../../../utils/getUrl"; // Função que retorna a URL base da API
import Header from "../../components/Header"; // Cabeçalho global
import axios from "axios"; // Cliente HTTP (promises)
import { FaSpinner } from "react-icons/fa"; // Ícone de loading (spinner)

// Componente principal da Galeria: lista pastas, gera miniaturas (via API), mostra modal e permite exclusões
export const Gallery = () => {
  // Estados da página
  const [folders, setFolders] = useState([]); // Lista de pastas retornada pela API
  const [selectedFolder, setSelectedFolder] = useState(null); // Nome da pasta atualmente selecionada
  const [files, setFiles] = useState([]); // Arquivos (nome/extensão) da pasta selecionada
  const [thumbnails, setThumbnails] = useState({}); // Mapa: filename -> blobURL (miniatura/preview)
  const [selectedFile, setSelectedFile] = useState(null); // blobURL atualmente aberto no modal
  const [selectedType, setSelectedType] = useState("image"); // Tipo do arquivo do modal ("image" | "video")
  const [fileToDelete, setFileToDelete] = useState(null); // Nome do arquivo a excluir (confirmação)
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false); // Flag para confirmar "excluir todos"
  const [loading, setLoading] = useState(false); // Indicador de carregamento (miniaturas)
  const [error, setError] = useState(""); // Mensagem simples de erro (exibição pontual)

  // Configuração base
  const API_URL = getHostName(); // Ex.: http://localhost:8000
  const token = localStorage.getItem("access_token") || ""; // JWT (se existir)

  // Efeito 1: busca lista de pastas ao montar (ou quando API_URL mudar)
  useEffect(() => {
    axios
      .get(`${API_URL}/gallery`) // GET /gallery => { folders: [{ name, files: [...] }, ...] }
      .then((res) => {
        setFolders(res.data.folders || []); // Salva pastas no estado
        console.log(res.data); // Log informativo (mantido)
      })
      .catch((err) => setError(String(err))); // Guarda erro (string simples)
  }, [API_URL]);

  // Efeito 2: quando uma pasta é escolhida OU a lista de arquivos dela muda,
  // gera as miniaturas (blob) chamando endpoints de decrypt da API
  useEffect(() => {
    if (!selectedFolder) return; // Sem pasta selecionada, não faz nada

    const thumbs = {}; // Mapa temporário de miniaturas
    setLoading(true); // Mostra loading enquanto busca blobs

    // Helper: faz POST para decrypt_image/decrypt_video e retorna blobURL
    const decrypt = (isVideo, filename) =>
      axios
        .post(
          `${API_URL}/${isVideo ? "decrypt_video" : "decrypt_image"}?mode=blob`, // Seleciona rota conforme tipo
          { folder: selectedFolder, filename }, // Corpo JSON
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            responseType: "blob", // Importante: queremos um Blob binário
          }
        )
        .then((res) => {
          thumbs[filename] = URL.createObjectURL(res.data); // Cria URL temporária para exibir
        });

    // Para cada arquivo, resolve se é vídeo (regex pela extensão) e decripta
    Promise.all(
      files.map((f) => decrypt(/\.(mp4|mov|webm)$/i.test(f.name), f.name))
    )
      .then(() => {
        setThumbnails(thumbs); // Salva todas as miniaturas geradas
      })
      .catch((err) => setError(String(err))) // Registra erro, se houver
      .finally(() => setLoading(false)); // Encerra loading em qualquer caso
  }, [selectedFolder, files, API_URL, token]);

  // Ao clicar numa pasta, popula os arquivos e limpa miniaturas antigas
  const handleFolderClick = (folder) => {
    setSelectedFolder(folder); // Define pasta atual
    const found = folders.find((f) => f.name === folder); // Busca metadados da pasta
    setFiles(found?.files || []); // Coloca arquivos (ou lista vazia)
    setThumbnails({}); // Limpa miniaturas anteriores (evita "fantasmas")
  };

  // Abre modal de visualização: define blob e tipo (imagem ou vídeo)
  const handleFileClick = (name) => {
    setSelectedFile(thumbnails[name]); // Define URL do arquivo
    setSelectedType(/\.(mp4|mov|webm)$/i.test(name) ? "video" : "image"); // Define tipo
  };

  // Fecha modal
  const closeModal = () => setSelectedFile(null);

  // Exclui apenas um arquivo (requer confirmação prévia via fileToDelete)
  const handleDelete = () => {
    axios
      .delete(`${API_URL}/delete`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data: { folder: selectedFolder, filename: fileToDelete }, // Corpo da requisição no axios.delete
      })
      .then(() => window.location.reload()) // Estratégia atual: recarregar a página
      .catch((err) => setError(String(err)));
  };

  // Exclui todos os arquivos da pasta selecionada
  const handleBatchDelete = () => {
    axios
      .delete(`${API_URL}/delete-batch`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        data: {
          folder: selectedFolder,
          filenames: files.map((f) => f.name), // Envia a lista de nomes ao backend
        },
      })
      .then(() => window.location.reload())
      .catch((err) => setError(String(err)));
  };

  return (
    <>
      <Header /> {/* Cabeçalho */}
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Gallery</h1> {/* Título */}

        {/* Layout principal: lista de pastas à esquerda, conteúdo à direita */}
        <div className="flex gap-6 flex-col items-center sm:items-baseline sm:flex-row">
          {/* Coluna esquerda: pastas disponíveis */}
          <div className="flex flex-col sm:w-1/4 ">
            {folders.map((f) => (
              <button
                key={f.name} // Nome da pasta como chave
                onClick={() => handleFolderClick(f.name)} // Define pasta atual
                className="w-screen sm:w-full p-5 sm:p-2 mb-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Coluna direita: conteúdo da pasta (miniaturas, ações) */}
          <div className="w-3/4">
            {selectedFolder && (
              <>
                {/* Cabeçalho da pasta + ações */}
                <div className="flex flex-col sm:flex-row items-center mb-4 gap-5">
                  <h2 className="text-lg font-semibold mr-4">{selectedFolder}</h2>
                  <button
                    onClick={() => setConfirmBatchDelete(true)} // Abre confirmação "excluir todos"
                    className="px-4 py-1 bg-red-500 text-white rounded"
                  >
                    Excluir todos
                  </button>
                  {/* Status: erro e loading */}
                  <div className="flex gap-2 items-center">
                    {error && <p className="text-red-500">Erro: {error}</p>} {/* Mensagem de erro */}
                    {loading && (
                      <>
                        <p>Carregando</p>
                        <FaSpinner className="animate-spin" />
                      </>
                    )}
                  </div>
                </div>

                {/* Grade de miniaturas dos arquivos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {files.map((f) => (
                    <div key={f.name} className="relative border rounded overflow-hidden">
                      {/* Se for imagem, usa <img>; se não, <video> */}
                      {thumbnails[f.name] && /\.(jpg|jpeg|png)$/i.test(f.name) ? (
                        <img
                          src={thumbnails[f.name]}
                          className="w-full h-32 object-cover cursor-pointer"
                          onClick={() => handleFileClick(f.name)} // Abre modal
                        />
                      ) : thumbnails[f.name] ? (
                        <video
                          src={thumbnails[f.name]}
                          className="w-full h-32 object-cover cursor-pointer"
                          onClick={() => handleFileClick(f.name)} // Abre modal
                          muted
                        />
                      ) : null}

                      {/* Nome do arquivo */}
                      <div className="p-1 text-center text-sm">{f.name}</div>

                      {/* Botão para marcar exclusão desse arquivo */}
                      <button
                        onClick={() => setFileToDelete(f.name)}
                        className="absolute top-1 right-1 text-red-500"
                        title="Excluir arquivo"
                      >
                        <IoIosCloseCircle size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modal de visualização (imagem/vídeo) */}
        {selectedFile && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
            onClick={closeModal} // Fecha ao clicar fora
          >
            {/* Botão de fechar (canto superior direito) */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-white text-3xl"
              aria-label="Fechar"
            >
              <IoIosCloseCircle />
            </button>

            {/* Conteúdo do modal (interação não fecha) */}
            <div className="bg-white p-4 rounded" onClick={(e) => e.stopPropagation()}>
              {selectedType === "image" ? (
                <img src={selectedFile} className="max-w-full max-h-[80vh]" />
              ) : (
                <video controls src={selectedFile} className="max-w-full max-h-[80vh]" />
              )}
            </div>
          </div>
        )}

        {/* Modal de confirmação (excluir um arquivo) */}
        {fileToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded">
              <p>Excluir {fileToDelete}?</p>
              <button
                onClick={handleDelete}
                className="px-2 py-1 bg-red-500 text-white rounded mr-2"
              >
                Sim
              </button>
              <button
                onClick={() => setFileToDelete(null)}
                className="px-2 py-1 bg-gray-300 rounded"
              >
                Não
              </button>
            </div>
          </div>
        )}

        {/* Modal de confirmação (excluir todos) */}
        {confirmBatchDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-4 rounded">
              <p>Excluir todos os arquivos?</p>
              <button
                onClick={handleBatchDelete}
                className="px-2 py-1 bg-red-500 text-white rounded mr-2"
              >
                Sim
              </button>
              <button
                onClick={() => setConfirmBatchDelete(false)}
                className="px-2 py-1 bg-gray-300 rounded"
              >
                Não
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

