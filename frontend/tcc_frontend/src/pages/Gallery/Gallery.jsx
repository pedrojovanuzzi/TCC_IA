import React, { useState, useEffect } from "react";

export const Gallery = () => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    fetch("http://localhost:3001/api/gallery") // Faz a requisição para o backend
      .then((res) => res.json())
      .then((data) => setFolders(data.folders))
      .catch((err) => console.error("Erro ao buscar pastas:", err));
  }, []);

  const handleFolderClick = (folder) => {
    setSelectedFolder(folder);
    const foundFolder = folders.find((f) => f.name === folder);
    setFiles(foundFolder ? foundFolder.files : []);
  };

  const handleFileClick = (file) => {
    setSelectedFile(`/imagens/${selectedFolder}/${file}`);
  };

  const closeModal = () => {
    setSelectedFile(null);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Gallery</h1>
      <div style={{ display: "flex", gap: "20px", marginTop: "10px" }}>
        {/* Lista de Pastas */}
        <div style={{ width: "25%" }}>
          <h2>Pastas</h2>
          {folders.map((folder) => (
            <button
              key={folder.name}
              onClick={() => handleFolderClick(folder.name)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px",
                marginTop: "5px",
                textAlign: "left",
                background: "#ddd",
                borderRadius: "5px",
                border: "none",
                cursor: "pointer",
              }}
            >
              {folder.name}
            </button>
          ))}
        </div>

        {/* Lista de Arquivos */}
        <div style={{ width: "75%" }}>
          {selectedFolder ? (
            <>
              <h2>Arquivos em {selectedFolder}</h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "10px",
                  marginTop: "10px",
                }}
              >
                {files.length > 0 ? (
                  files.map((file) => (
                    <div
                      key={file}
                      onClick={() => handleFileClick(file)}
                      style={{
                        cursor: "pointer",
                        padding: "10px",
                        textAlign: "center",
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                        background: "#f9f9f9",
                      }}
                    >
                      {/* Se for imagem, mostra preview */}
                      {file.endsWith(".jpg") ||
                      file.endsWith(".png") ||
                      file.endsWith(".jpeg") ? (
                        <img
                          src={`/imagens/${selectedFolder}/${file}`}
                          alt={file}
                          style={{ width: "100%", height: "auto", borderRadius: "5px" }}
                        />
                      ) : (
                        // Se for vídeo, mostra apenas o nome
                        <p>{file}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p>Nenhum arquivo encontrado.</p>
                )}
              </div>
            </>
          ) : (
            <p>Selecione uma pasta para ver os arquivos.</p>
          )}
        </div>
      </div>

      {/* Modal (Popup) */}
      {selectedFile && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={closeModal}
        >
          <div
            style={{
              position: "relative",
              background: "#fff",
              padding: "20px",
              borderRadius: "10px",
              maxWidth: "90%",
              maxHeight: "90%",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeModal}
              style={{
                position: "absolute",
                top: "10px",
                right: "10px",
                background: "red",
                color: "white",
                border: "none",
                padding: "5px 10px",
                cursor: "pointer",
                borderRadius: "5px",
              }}
            >
              Fechar
            </button>
            {/* Se for imagem, exibe */}
            {selectedFile.endsWith(".jpg") ||
            selectedFile.endsWith(".png") ||
            selectedFile.endsWith(".jpeg") ? (
              <img
                src={selectedFile}
                alt="Visualização"
                style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "5px" }}
              />
            ) : (
              // Se for vídeo, exibe o player
              <video
                controls
                style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "5px" }}
              >
                <source src={selectedFile} type="video/mp4" />
                Seu navegador não suporta vídeos.
              </video>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
