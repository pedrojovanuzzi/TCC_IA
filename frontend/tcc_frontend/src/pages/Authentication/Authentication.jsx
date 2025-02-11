import { useState } from "react";

const PASSWORD = process.env.REACT_APP_PASS; // Defina sua senha fixa

export default function Authentication({ onLogin }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    if (input === PASSWORD) {
      localStorage.setItem("auth", "true"); // Salva no LocalStorage
      onLogin();
    } else {
      setError("Senha incorreta!");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="p-6 bg-white shadow-md rounded-md">
        <h2 className="text-lg font-bold mb-4">Digite a senha para acessar</h2>
        <input
          type="password"
          className="border p-2 w-full"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white p-2 mt-2 w-full"
          onClick={handleLogin}
        >
          Entrar
        </button>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}
