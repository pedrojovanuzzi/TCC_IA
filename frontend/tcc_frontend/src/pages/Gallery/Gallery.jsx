import React, { useState, useEffect } from "react"
import { IoIosCloseCircle } from "react-icons/io"

export const Gallery = () => {
  const [folders, setFolders] = useState([])
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [files, setFiles] = useState([])
  const [thumbnails, setThumbnails] = useState({})
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedType, setSelectedType] = useState("image")
  const [fileToDelete, setFileToDelete] = useState(null)
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false)

  const API = "http://localhost:3001/api"
  const token = localStorage.getItem("access_token") || ""

  useEffect(() => {
    fetch(`${API}/gallery`)
      .then(r => r.json())
      .then(d => setFolders(d.folders || []))
  }, [])

  useEffect(() => {
    if (!selectedFolder) return
    const m = {}
    const decrypt = (isVideo, filename) =>
      fetch(`${API}/${isVideo ? "decrypt_video" : "decrypt_image"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ folder: selectedFolder, filename }),
      })
        .then(res => (isVideo ? res.blob() : res.json()))
        .then(data => {
          m[filename] = isVideo
            ? URL.createObjectURL(data)
            : `data:image/jpeg;base64,${data.frame}`
        })

    Promise.all(
      files.map(f =>
        decrypt(/\.(mp4|mov|webm)$/i.test(f.name), f.name)
      )
    ).then(() => setThumbnails(m))
  }, [selectedFolder, files])

  const handleFolderClick = folder => {
    setSelectedFolder(folder)
    const found = folders.find(f => f.name === folder)
    setFiles(found?.files || [])
    setThumbnails({})
  }

  const handleFileClick = name => {
    setSelectedFile(thumbnails[name])
    setSelectedType(/\.(mp4|mov|webm)$/i.test(name) ? "video" : "image")
  }

  const closeModal = () => setSelectedFile(null)

  const handleDelete = () => {
    fetch(`${API}/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ folder: selectedFolder, filename: fileToDelete }),
    }).then(() => window.location.reload())
  }

  const handleBatchDelete = () => {
    fetch(`${API}/delete-batch`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        folder: selectedFolder,
        filenames: files.map(f => f.name),
      }),
    }).then(() => window.location.reload())
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Gallery</h1>
      <div className="flex gap-6">
        <div className="w-1/4">
          {folders.map(f => (
            <button
              key={f.name}
              onClick={() => handleFolderClick(f.name)}
              className="w-full p-2 mb-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="w-3/4">
          {selectedFolder && (
            <>
              <div className="flex items-center mb-4">
                <h2 className="text-lg font-semibold mr-4">
                  {selectedFolder}
                </h2>
                <button
                  onClick={() => setConfirmBatchDelete(true)}
                  className="px-4 py-1 bg-red-500 text-white rounded"
                >
                  Excluir todos
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {files.map(f => (
                  <div
                    key={f.name}
                    className="relative border rounded overflow-hidden"
                  >
                    {thumbnails[f.name] && /\.(jpg|jpeg|png)$/i.test(f.name) ? (
                      <img
                        src={thumbnails[f.name]}
                        className="w-full h-32 object-cover cursor-pointer"
                        onClick={() => handleFileClick(f.name)}
                      />
                    ) : thumbnails[f.name] ? (
                      <video
                        src={thumbnails[f.name]}
                        className="w-full h-32 object-cover cursor-pointer"
                        onClick={() => handleFileClick(f.name)}
                        muted
                      />
                    ) : null}
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

      {selectedFile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 text-white text-3xl"
          >
            <IoIosCloseCircle />
          </button>
          <div
            className="bg-white p-4 rounded"
            onClick={e => e.stopPropagation()}
          >
            {selectedType === "image" ? (
              <img
                src={selectedFile}
                className="max-w-full max-h-[80vh]"
              />
            ) : (
              <video
                controls
                src={selectedFile}
                className="max-w-full max-h-[80vh]"
              />
            )}
          </div>
        </div>
      )}

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
  )
}
