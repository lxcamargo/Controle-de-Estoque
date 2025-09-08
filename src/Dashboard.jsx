import React from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();

  const abrirEmNovaAba = (rota) => {
    window.open(`${window.location.origin}${rota}`, "_blank");
  };

  const estiloBotaoRelatorio = {
    fontWeight: "bold",
    padding: "0.75rem 1.25rem",
    borderRadius: "6px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    border: "2px solid",
  };

  return (
    <div className="dashboard-container">
      <h2>📊 Você está no Dashboard!</h2>

      <section className="dashboard-section">
        <h3>📦 Operações de Estoque</h3>
        <div className="button-grid">
          <button onClick={() => abrirEmNovaAba("/entrada-produto")}>🆕 Registrar Entrada</button>
          <button onClick={() => abrirEmNovaAba("/saida-produto")}>📤 Registrar Saída</button>
          <button onClick={() => abrirEmNovaAba("/estoque")}>📦 Visualizar Estoque</button>
          <button onClick={() => abrirEmNovaAba("/historico-entradas")}>📜 Histórico de Entradas</button>
          <button onClick={() => abrirEmNovaAba("/historico-saidas")}>📤 Histórico de Saídas</button>
          <button onClick={() => abrirEmNovaAba("/inventario")}>🧾 Tela de Inventário</button>
          <button onClick={() => abrirEmNovaAba("/contagem")}>📲 Tela de Contagem</button> {/* ✅ NOVO BOTÃO */}
        </div>
      </section>

      <section className="dashboard-section">
        <h3>📝 Cadastros</h3>
        <div className="button-grid">
          <button onClick={() => abrirEmNovaAba("/cadastrar-usuario")}>👤 Cadastrar Usuário</button>
          <button onClick={() => abrirEmNovaAba("/importar-planilha")}>📄 Importar Planilha</button>
          <button onClick={() => abrirEmNovaAba("/importar-cadastro")}>📥 Importar Cadastro</button>
          <button onClick={() => abrirEmNovaAba("/produtos-cadastrados")}>📋 Produtos Cadastrados</button> {/* ✅ NOVO BOTÃO */}
        </div>
      </section>

      <section className="dashboard-section">
        <h3>📊 Relatórios</h3>
        <div className="button-grid">
          <button
            onClick={() => abrirEmNovaAba("/painel-validade")}
            style={{
              ...estiloBotaoRelatorio,
              backgroundColor: "#c8e6c9",
              borderColor: "#388e3c",
              color: "#1b5e20"
            }}
          >
            🧪 Painel de Validade
          </button>
          <button
            onClick={() => abrirEmNovaAba("/historico-contagens")}
            style={{
              ...estiloBotaoRelatorio,
              backgroundColor: "#bbdefb",
              borderColor: "#1976d2",
              color: "#0d47a1"
            }}
          >
            📋 Histórico de Contagens
          </button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;