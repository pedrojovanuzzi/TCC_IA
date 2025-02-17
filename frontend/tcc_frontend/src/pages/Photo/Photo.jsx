import React, { useRef, useState } from 'react';

export default function Photo() {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);

    if (event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];

      if (inputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        inputRef.current.files = dataTransfer.files;
      }
    }
  };

  return (
    <div className="h-screen flex justify-center items-center flex-col">
      <h1 className="font-semibold mb-10">
        Arraste a Foto que deseja ou clique para selecionar uma
      </h1>

      <input type="file" ref={inputRef} className="hidden" />

      <div
        className={`relative cursor-pointer block w-1/4 rounded-lg border-2 border-dashed ${
          dragging ? 'border-blue-500 bg-blue-100' : 'border-gray-300'
        } p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg
          fill="none"
          stroke="currentColor"
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="mx-auto size-12 text-gray-400"
        >
          <path
            d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="mt-2 block text-sm font-semibold text-gray-900">
          Selecione ou arraste uma Foto aqui
        </span>
      </div>
    </div>
  );
}
