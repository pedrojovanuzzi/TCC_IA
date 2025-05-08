import React, { useState, useEffect } from "react"
import { IoIosCloseCircle } from "react-icons/io"

export const Gallery = () => {
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [files, setFiles] = useState([])
  const [thumbnails, setThumbnails] = useState({})        // map filename → dataURL
  const [selectedFile, setSelectedFile] = useState(null)
  const [decryptedFrame, setDecryptedFrame] = useState(null)
  const [fileToDelete, setFileToDelete] = useState(null)
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)

  const API_URL = "http://localhost:3001"
  const token   = localStorage.getItem("access_token")

  useEffect(() => {
    fetch(`${API_URL}/api/gallery`)
      .then(r => r.json())
      .then(d => setFolders(d.folders || []))
  }, [])

  useEffect(() => {
    if (!selectedFolder) return
    const imgs = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f.name))
    const newMap = {}
    Promise.all(imgs.map(f =>
      fetch(`${API_URL}/api/decrypt_image`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ folder: selectedFolder, filename: f.name })
      })
        .then(r => r.json())
        .then(d => {
          newMap[f.name] = `data:image/jpeg;base64,${d.frame}`
        })
    ))
    .then(() => setThumbnails(newMap))
  }, [selectedFolder, files])

  const handleFolderClick = folder => {
    setSelectedFolder(folder)
    const found = folders.find(f => f.name === folder)
    setFiles(found?.files || [])
    setThumbnails({})
  }

  const handleFileClick = fileName => {
    if (/\.(jpg|jpeg|png)$/i.test(fileName)) {
      setDecryptedFrame(thumbnails[fileName])
      setSelectedFile("image")
    } else {
      setSelectedFile(`${API_URL}/imagens/${selectedFolder}/${fileName}`)
    }
  }

  const closeModal = () => {
    setSelectedFile(null)
    setDecryptedFrame(null)
  }

  const handleBatchDelete = () => {
    if (!selectedFolder) return
    fetch(`${API_URL}/api/delete-batch`, {
      method: "DELETE",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ folder: selectedFolder, filenames: files.map(f => f.name) })
    })
      .then(r => r.json())
      .then(d => d.success && window.location.reload())
  }

  const handleDelete = () => {
    if (!fileToDelete) return
    fetch(`${API_URL}/api/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ folder: selectedFolder, filename: fileToDelete })
    })
      .then(r => r.json())
      .then(d => d.success && window.location.reload())
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gallery</h1>
      <div className="flex gap-6">
        {/* Pastas */}
        <div className="w-1/4">
          {folders.map(f => (
            <button
              key={f.name}
              onClick={() => handleFolderClick(f.name)}
              className="block w-full p-2 mb-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              {f.name}
            </button>
          ))}
        </div>
        {/* Thumbnails */}
        <div className="w-3/4">
          {selectedFolder && (
            <>
              <div className="flex items-center mb-4">
                <h2 className="text-lg font-semibold mr-4">{selectedFolder}</h2>
                {files.length > 0 && (
                  <button
                    onClick={() => setConfirmBatchDelete(true)}
                    className="px-4 py-1 bg-red-500 text-white rounded"
                  >
                    Excluir todos
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {files.map(f => (
                  <div key={f.name} className="relative border rounded overflow-hidden">
                    {thumbnails[f.name] ? (
                      <img
                        src={thumbnails[f.name]}
                        alt={f.name}
                        className="w-full h-32 object-cover cursor-pointer"
                        onClick={() => handleFileClick(f.name)}
                      />
                    ) : /\.(mp4|webm|mov)$/i.test(f.name) ? (
                      <video
                        src={`/imagens/${selectedFolder}/${f.name}`}
                        className="w-full h-32 object-cover cursor-pointer"
                        onClick={() => handleFileClick(f.name)}
                        muted
                      />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                        <span className="text-sm">{f.name}</span>
                      </div>
                    )}
                    <div className="p-1 text-center text-sm">{f.name}</div>
                    <button
                      onClick={() => setFileToDelete(f.name)}
                      className="absolute top-1 right-1 text-red-500"
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

      {/* Modal de visualização */}
      {selectedFile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <button onClick={closeModal} className="absolute top-4 right-4 text-white">
            <IoIosCloseCircle size={32} />
          </button>
          <div className="bg-white p-4 rounded">
            {selectedFile === "image" ? (
              <img src={decryptedFrame} className="max-w-full max-h-[80vh]" />
            ) : (
              <video controls className="max-w-full max-h-[80vh]">
                <source src={selectedFile} type="video/mp4" />
              </video>
            )}
          </div>
        </div>
      )}

      {/* Confirmar exclusão simples */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded">
            <p>Excluir {fileToDelete}?</p>
            <button onClick={handleDelete} className="px-2 py-1 bg-red-500 text-white rounded mr-2">
              Sim
            </button>
            <button onClick={() => setFileToDelete(null)} className="px-2 py-1 bg-gray-300 rounded">
              Não
            </button>
          </div>
        </div>
      )}

      {/* Confirmar batch delete */}
      {confirmBatchDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded">
            <p>Excluir todos os arquivos?</p>
            <button onClick={handleBatchDelete} className="px-2 py-1 bg-red-500 text-white rounded mr-2">
              Sim
            </button>
            <button onClick={() => setConfirmBatchDelete(false)} className="px-2 py-1 bg-gray-300 rounded">
              Não
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
