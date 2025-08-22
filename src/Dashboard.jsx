import React from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();

  const abrirEmNovaAba = (rota) => {
    window.open(`${window.location.origin}${rota}`, "_blank");
  };

  return (
    <div className="dashboard-container">
      <h2>📊 Você está no Dashboard!</h2>

      <section className="dashboard-section">
        <h3>📦 Operações de Estoque</h3>
        <div className="button-grid">
          <button onClick={() => abrirEmNovaAba("/entrada-produto")}>🆕 Registrar Entrada</button>
          <button onClick={() => abrirEmNovaAba("/saida-produto")}>📤 Registrar Saída</button>
          <button onClick={() => abrirEmNovaAba("/consultar-estoque")}>🔍 Consultar Estoque</button>
          <button onClick={() => abrirEmNovaAba("/estoque")}>📦 Visualizar Estoque</button>
          <button onClick={() => abrirEmNovaAba("/historico-produtos")}>📜 Histórico de Produtos</button>
          <button onClick={() => abrirEmNovaAba("/historico-entradas")}>📜 Histórico de Entradas</button>
          <button onClick={() => abrirEmNovaAba("/historico-saidas")}>📤 Histórico de Saídas</button>
        </div>
      </section>

      <section className="dashboard-section">
        <h3>📝 Cadastros</h3>
        <div className="button-grid">
          <button onClick={() => abrirEmNovaAba("/cadastrar-usuario")}>👤 Cadastrar Usuário</button>
          <button onClick={() => abrirEmNovaAba("/importar-planilha")}>📄 Importar Planilha</button>
          <button onClick={() => abrirEmNovaAba("/importar-cadastro")}>📥 Importar Cadastro</button>
          <button onClick={() => abrirEmNovaAba("/cadastro-produto")}>➕ Novo Produto</button>
          <button onClick={() => abrirEmNovaAba("/produtos-cadastrados")}>📋 Produtos Cadastrados</button>
        </div>
      </section>

      <section className="dashboard-section">
        <h3>📊 Relatórios</h3>
        <div className="button-grid">
          <button onClick={() => abrirEmNovaAba("/exportar-relatorio")}>📈 Exportar Relatório</button>

          {/* ✅ Botão destacado para o Painel de Validade */}
          <button
            onClick={() => abrirEmNovaAba("/painel-validade")}
            style={{
              backgroundColor: "#c8e6c9",
              border: "2px solid #388e3c",
              color: "#1b5e20",
              fontWeight: "bold",
              padding: "0.75rem 1.25rem",
              borderRadius: "6px",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
            }}
          >
            🧪 Painel de Validade
          </button>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;