import React, { useState, useEffect } from "react";
import { IoIosCloseCircle } from "react-icons/io";

export const Gallery = () => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);
  const backendIP = "localhost";
  const API_URL = `http://${backendIP}:3001`;


  useEffect(() => {
    fetch(`${API_URL}/api/gallery`)
      .then(res => res.json())
      .then(data => setFolders(data.folders))
      .catch(() => {});
  }, []);

  const handleFolderClick = folder => {
    setSelectedFolder(folder);
    const foundFolder = folders.find(f => f.name === folder);
    setFiles(foundFolder ? foundFolder.files : []);
  };

  const handleFileClick = file => {
    setSelectedFile(`/imagens/${selectedFolder}/${file}`);
  };

  const closeModal = () => {
    setSelectedFile(null);
  };

  const confirmDelete = file => {
    setFileToDelete(file);
  };

  const cancelDelete = () => {
    setFileToDelete(null);
  };

  const confirmDeleteCategory = folderName => {
    setFolderToDelete(folderName);
  };

  const cancelDeleteCategory = () => {
    setFolderToDelete(null);
  };

  const confirmBatchDeleted = () => {
    setConfirmBatchDelete(true);
  };

  const cancelBatchDelete = () => {
    setConfirmBatchDelete(false);
  };

  const handleBatchDelete = () => {
    if (!selectedFolder) return;
    fetch(`${API_URL}/api/delete-batch`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: selectedFolder, filenames: files }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFiles([]);
          setConfirmBatchDelete(false);
          window.location.reload();
        } else {
          alert("Erro ao excluir a pasta.");
        }
      })
      .catch(() => alert("Erro ao excluir a pasta."));
  };

  const handleDelete = () => {
    if (!fileToDelete) return;
    fetch(`${API_URL}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: selectedFolder, filename: fileToDelete }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFiles(files.filter(f => f !== fileToDelete));
          setFileToDelete(null);
          window.location.reload();
        } else {
          alert("Erro ao excluir o arquivo.");
        }
      })
      .catch(() => alert("Erro ao excluir o arquivo."));
  };

  const handleDeleteCategory = () => {
    if (!folderToDelete) return;
    fetch(`${API_URL}/api/delete-folder`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: folderToDelete }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFolders(folders.filter(f => f.name !== folderToDelete));
          if (selectedFolder === folderToDelete) {
            setSelectedFolder(null);
            setFiles([]);
          }
          setFolderToDelete(null);
          window.location.reload();
        } else {
          alert("Erro ao excluir a categoria.");
        }
      })
      .catch(() => alert("Erro ao excluir a categoria."));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gallery</h1>
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-1/4">
          <h2 className="text-lg font-semibold mb-2">Pastas</h2>
          {folders.map(folder => (
            <div key={folder.name} className="flex items-center mb-2 gap-2">
              <button
                onClick={() => handleFolderClick(folder.name)}
                className="flex-1 p-2 bg-gray-200 rounded hover:bg-gray-300 transition text-left"
              >
                {folder.name}
              </button>
            </div>
          ))}
        </div>
        <div className="w-full md:w-3/4">
          {selectedFolder ? (
            <>
              <div className="flex items-center mb-2 gap-4">
                <h2 className="text-lg font-semibold">Arquivos em {selectedFolder}</h2>
                {files.length > 0 && (
                  <button
                    onClick={confirmBatchDeleted}
                    className="bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600 transition"
                  >
                    Excluir todos
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {files.length > 0 ? (
                  files.map(file => (
                    <div
                      key={file}
                      className="relative p-2 border rounded bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
                    >
                      {/\.(jpg|jpeg|png)$/i.test(file) ? (
                        <img
                          src={`/imagens/${selectedFolder}/${file}`}
                          alt={file}
                          className="w-full h-[200px] md:h-[250px] object-cover rounded"
                          onClick={() => handleFileClick(file)}
                        />
                      ) : /\.(mp4|webm|mov)$/i.test(file) ? (
                        <video
                          src={`/imagens/${selectedFolder}/${file}`}
                          className="w-full h-[200px] md:h-[250px] object-cover rounded"
                          onClick={() => handleFileClick(file)}
                          onLoadedMetadata={e => (e.target.currentTime = 0)}
                          muted
                        />
                      ) : (
                        <p className="text-center">{file}</p>
                      )}
                      <button
                        onClick={() => confirmDelete(file)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full text-sm hover:bg-red-600 transition"
                      >
                        <IoIosCloseCircle className="text-2xl" />
                      </button>
                      <p className="text-center">{file}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Nenhum arquivo encontrado.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-500">Selecione uma pasta para ver os arquivos.</p>
          )}
        </div>
      </div>
      {selectedFile && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-75 flex justify-center items-center z-50"
          onClick={closeModal}
        >
          <button
            onClick={closeModal}
            className="absolute top-4 right-6 bg-red-500 text-white px-4 py-2 rounded-full text-lg hover:bg-red-600 transition"
          >
            <IoIosCloseCircle className="text-2xl" />
          </button>
          <div
            className="relative bg-white p-4 rounded-lg shadow-lg max-w-4xl max-h-[90vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            {/\.(jpg|jpeg|png)$/i.test(selectedFile) ? (
              <img src={selectedFile} alt="Visualização" className="max-w-full max-h-[80vh] rounded" />
            ) : (
              <video controls className="max-w-full max-h-[80vh] rounded">
                <source src={selectedFile} type="video/mp4" />
                Seu navegador não suporta vídeos.
              </video>
            )}
          </div>
        </div>
      )}
      {fileToDelete && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold">Confirmar Exclusão</h2>
            <p className="text-gray-700 my-3">Deseja realmente excluir este arquivo?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={cancelDelete}
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {folderToDelete && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold">Confirmar Exclusão</h2>
            <p className="text-gray-700 my-3">Deseja realmente excluir esta categoria?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={cancelDeleteCategory}
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCategory}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
      {confirmBatchDelete && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-semibold">Excluir Todos</h2>
            <p className="text-gray-700 my-3">Deseja realmente excluir todos os arquivos desta pasta?</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={cancelBatchDelete}
                className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleBatchDelete}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
