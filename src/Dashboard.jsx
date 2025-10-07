import React from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const tipoUsuario = localStorage.getItem("tipoUsuario")?.toLowerCase();

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

  const podeVerGalpao = ["administrador", "operador", "adm_galpao", "operador_junior"].includes(tipoUsuario);
  const podeVerLoja = ["administrador", "operador_loja", "adm_loja"].includes(tipoUsuario);
  const podeVerPainelGalpao = ["administrador", "operador", "adm_loja", "adm_galpao", "operador_junior"].includes(tipoUsuario);
  const podeVerPainelLoja = ["administrador", "operador_loja", "adm_loja", "adm_galpao"].includes(tipoUsuario);

  const bloquearEntradaSaidaGalpao = tipoUsuario === "operador_junior";

  return (
    <div className="overlay">
      <div className="dashboard-container">
        <h2>📊 Você está no Dashboard!</h2>

        {/* Setor Galpão */}
        <details open>
          <summary style={{ fontSize: "1.2rem", fontWeight: "bold", marginBottom: "1rem" }}>
            🏭 Setor Galpão
          </summary>

          {podeVerGalpao ? (
            <>
              <section className="dashboard-section">
                <h3>📦 Operações de Estoque</h3>
                <div className="button-grid">
                  {!bloquearEntradaSaidaGalpao && (
                    <>
                      <button onClick={() => abrirEmNovaAba("/entrada-produto")}>🆕 Registrar Entrada</button>
                      <button onClick={() => abrirEmNovaAba("/saida-produto")}>📤 Registrar Saída</button>
                    </>
                  )}
                  <button onClick={() => abrirEmNovaAba("/estoque")}>📦 Visualizar Estoque</button>
                  <button onClick={() => abrirEmNovaAba("/historico-entradas")}>📜 Histórico de Entradas</button>
                  <button onClick={() => abrirEmNovaAba("/historico-saidas")}>📤 Histórico de Saídas</button>
                  <button onClick={() => abrirEmNovaAba("/inventario")}>🧾 Tela de Inventário</button>
                  <button onClick={() => abrirEmNovaAba("/contagem")}>📲 Tela de Contagem</button>
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

              <section className="dashboard-section">
                <h3>📝 Cadastros</h3>
                <div className="button-grid">
                  <button onClick={() => abrirEmNovaAba("/cadastrar-usuario")}>👤 Cadastrar Usuário</button>
                  <button onClick={() => abrirEmNovaAba("/importar-planilha")}>📄 Importar Planilha</button>
                  <button onClick={() => abrirEmNovaAba("/importar-cadastro")}>📥 Importar Cadastro</button>
                  <button onClick={() => abrirEmNovaAba("/produtos-cadastrados")}>📋 Produtos Cadastrados</button>
                </div>
              </section>
            </>
          ) : (
            <p style={{ padding: "1rem", backgroundColor: "#f8d7da", border: "1px solid #f5c6cb", borderRadius: "6px" }}>
              🚫 Você não tem permissão para acessar operações do galpão.
            </p>
          )}

          {/* Painel de Validade do Galpão */}
          {podeVerPainelGalpao && (
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
                  🧪 Painel de Validade - Galpão
                </button>
              </div>
            </section>
          )}
        </details>

        {/* Setor Loja */}
        <details>
          <summary style={{ fontSize: "1.2rem", fontWeight: "bold", marginTop: "2rem", marginBottom: "1rem" }}>
            🏬 Setor Loja
          </summary>

          {podeVerLoja ? (
            <>
              <section className="dashboard-section">
                <h3>🛒 Operações de Loja</h3>
                <div className="button-grid">
                  <button onClick={() => abrirEmNovaAba("/entrada-produto-loja")}>
                    🆕 Entrada de Produto - Loja
                  </button>
                  <button onClick={() => abrirEmNovaAba("/saida-produto-loja")}>
                    📤 Saída de Produto - Loja
                  </button>
                  <button onClick={() => abrirEmNovaAba("/estoque-loja")}>
                    📦 Estoque Loja
                  </button>
                  <button onClick={() => abrirEmNovaAba("/importar-estoque-loja")}>
                    📄 Importar Estoque Loja
                  </button>
                  <button
                    onClick={() => abrirEmNovaAba("/historico-saidas-loja")}
                    style={{
                      ...estiloBotaoRelatorio,
                      backgroundColor: "#ffe0e0",
                      borderColor: "#d32f2f",
                      color: "#b71c1c"
                    }}
                  >
                    📤 Histórico de Saídas - Loja
                  </button>
                  <button
                    onClick={() => abrirEmNovaAba("/movimentacoes-galpao-loja")}
                    style={{
                      ...estiloBotaoRelatorio,
                      backgroundColor: "#e3f2fd",
                      borderColor: "#42a5f5",
                      color: "#1565c0"
                    }}
                  >
                    🔄 Movimentações Galpão → Loja
                  </button>
                </div>
              </section>
            </>
          ) : (
            <p style={{ padding: "1rem", backgroundColor: "#fff3cd", border: "1px solid #ffeeba", borderRadius: "6px" }}>
              🚫 Você não tem permissão para acessar operações da loja.
            </p>
          )}

          {/* Painel de Validade da Loja */}
          {podeVerPainelLoja && (
            <section className="dashboard-section">
              <h3>📊 Relatórios</h3>
              <div className="button-grid">
                <button
                  onClick={() => abrirEmNovaAba("/painel-validade-loja")}
                  style={{
                    ...estiloBotaoRelatorio,
                    backgroundColor: "#ffe0b2",
                    borderColor: "#fb8c00",
                    color: "#e65100"
                  }}
                >
                  🧪 Painel de Validade - Loja
                </button>
              </div>
            </section>
          )}
        </details>
      </div>
    </div>
  );
};

export default Dashboard;