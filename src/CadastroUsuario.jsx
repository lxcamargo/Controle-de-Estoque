import React, { useState } from "react";
import "./CadastroUsuario.css"; // opcional para estilos externos

function CadastroUsuario() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [sucesso, setSucesso] = useState(null); // true ou false

  const emailValido = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem("");
    setSucesso(null);

    // Validações básicas
    if (!nome || !email || !senha) {
      setMensagem("Todos os campos são obrigatórios.");
      setSucesso(false);
      return;
    }

    if (!emailValido(email)) {
      setMensagem("E-mail inválido.");
      setSucesso(false);
      return;
    }

    if (senha.length < 6) {
      setMensagem("A senha deve ter pelo menos 6 caracteres.");
      setSucesso(false);
      return;
    }

    try {
      const response = await fetch("http://127.0.0.1:8002/cadastrar-usuario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      const data = await response.json();
      console.log("Resposta da API:", data); // 🔍 Log para debugging

      if (response.ok) {
        setMensagem(data.mensagem || "✅ Usuário cadastrado com sucesso!");
        setSucesso(true);
        setNome("");
        setEmail("");
        setSenha("");
      } else {
        const erroDetalhado =
          data.detail ||
          data.mensagem ||
          "Erro ao cadastrar usuário. Verifique os dados e tente novamente.";
        setMensagem(`❌ ${erroDetalhado}`);
        setSucesso(false);
      }
    } catch (err) {
      console.error("Erro de conexão:", err);
      setMensagem("❌ Erro de conexão com o servidor.");
      setSucesso(false);
    }
  };

  return (
    <div className="cadastro-container">
      <h2>👤 Cadastrar Novo Usuário</h2>
      <form onSubmit={handleSubmit} className="cadastro-form">
        <label>
          Nome:
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label>
          Senha:
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </label>

        <button type="submit">Cadastrar</button>
      </form>

      {mensagem && (
        <p style={{ marginTop: "1rem", color: sucesso ? "green" : "red" }}>
          {mensagem}
        </p>
      )}
    </div>
  );
}

export default CadastroUsuario;