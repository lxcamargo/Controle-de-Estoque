import React, { useState } from "react";

export default function ImportarProdutos() {
  const [arquivo, setArquivo] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [erros, setErros] = useState([]);

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!arquivo) {
      setMensagem("⚠️ Selecione um arquivo para importar.");
      return;
    }

    const formData = new FormData();
    formData.append("file", arquivo);

    try {
      const response = await fetch("http://127.0.0.1:8002/importar-planilha", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.erro) {
        setMensagem(`❌ Erro: ${data.erro}`);
        setErros([]);
      } else {
        setMensagem(`✅ ${data.mensagem} (${data.registros_importados} registros)`);
        setErros(data.erros || []);
      }
    } catch (error) {
      setMensagem("❌ Falha ao conectar com o servidor.");
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>📥 Importar Planilha de Produtos</h1>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => setArquivo(e.target.files[0])}
          style={{ marginBottom: "1rem" }}
        />
        <br />
        <button
          type="submit"
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            marginTop: "1rem",
          }}
        >
          Importar
        </button>
      </form>
      {mensagem && (
        <p style={{ marginTop: "1rem", fontWeight: "bold" }}>{mensagem}</p>
      )}
      {erros.length > 0 && (
        <div style={{ marginTop: "1rem", color: "darkred" }}>
          <h3>Erros encontrados:</h3>
          <ul>
            {erros.map((erro, index) => (
              <li key={index}>{erro}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}