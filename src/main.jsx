import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";   // ✅ importa com extensão correta
import "./index.css";

// Ponto de entrada da aplicação React
const rootElement = document.getElementById("root");

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Elemento #root não encontrado. Verifique seu index.html.");
}