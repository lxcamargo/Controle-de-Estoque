import React from "react";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const tipoUsuario = localStorage.getItem("tipoUsuario")?.toLowerCase();
  const isADM = tipoUsuario === "administrador";

  const abrirEmNovaAba = (rota) => {
    window.open(`${window.location.origin}${rota}`, "_blank");
  };

  const podeVerGalpao = ["administrador", "operador", "adm_galpao", "operador_junior"].includes(tipoUsuario);
  const podeVerLoja = ["administrador", "operador_loja", "adm_loja"].includes(tipoUsuario);
  const podeVerPainelGalpao = ["administrador", "operador", "adm_loja", "adm_galpao", "operador_junior"].includes(tipoUsuario);
  const podeVerPainelLoja = ["administrador", "operador_loja", "adm_loja", "adm_galpao"].includes(tipoUsuario);
  const bloquearEntradaSaidaGalpao = tipoUsuario === "operador_junior";

  return (
    <div className="overlay">
      <div className="dashboard-container">
        <h2 className="titulo-dashboard">📊 Você está no Dashboard!</h2>

        {/* SETOR GALPÃO */}
        <details open>
          <summary className="section-title">🏭 Setor Galpão</summary>

          {podeVerGalpao ? (
            <>
              <section className="dashboard-section">
                <h3>📦 Operações de Estoque</h3>
                <div className="button-grid">
                  {!bloquearEntradaSaidaGalpao && (
                    <>
                      <button onClick={() => abrirEmNovaAba("/entrada-produto")}>
                        <i className="fas fa-arrow-down"></i>
                        <span>Registrar Entrada</span>
                      </button>
                      <button onClick={() => abrirEmNovaAba("/saida-produto")}>
                        <i className="fas fa-arrow-up"></i>
                        <span>Registrar Saída</span>
                      </button>
                    </>
                  )}
                  <button onClick={() => abrirEmNovaAba("/estoque")}>
                    <i className="fas fa-boxes"></i>
                    <span>Visualizar Estoque</span>
                  </button>

                  {/* NOVO BOTÃO: TRANSFERÊNCIA DE ENDEREÇO */}
                  <button onClick={() => abrirEmNovaAba("/transferencia-endereco")}>
                    <i className="fas fa-exchange-alt"></i>
                    <span>Transferência de Endereço</span>
                  </button>

                  <button onClick={() => abrirEmNovaAba("/historico-entradas")}>
                    <i className="fas fa-history"></i>
                    <span>Histórico de Entradas</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/historico-saidas")}>
                    <i className="fas fa-share-square"></i>
                    <span>Histórico de Saídas</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/inventario")}>
                    <i className="fas fa-clipboard-list"></i>
                    <span>Tela de Inventário</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/contagem")}>
                    <i className="fas fa-calculator"></i>
                    <span>Tela de Contagem</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/historico-contagens")} className="btn-relatorio btn-azul">
                    <i className="fas fa-clipboard-check"></i>
                    <span>Histórico de Contagens</span>
                  </button>
                </div>
              </section>

              <section className="dashboard-section">
                <h3>📝 Cadastros</h3>
                <div className="button-grid">
                  <button onClick={() => abrirEmNovaAba("/cadastrar-usuario")}>
                    <i className="fas fa-user-plus"></i>
                    <span>Cadastrar Usuário</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/importar-planilha")}>
                    <i className="fas fa-file-import"></i>
                    <span>Importar Planilha</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/importar-cadastro")}>
                    <i className="fas fa-download"></i>
                    <span>Importar Cadastro</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/produtos-cadastrados")}>
                    <i className="fas fa-list"></i>
                    <span>Produtos Cadastrados</span>
                  </button>
                </div>
              </section>
            </>
          ) : (
            <p className="alert alert-danger">🚫 Você não tem permissão para acessar operações do galpão.</p>
          )}

          {podeVerPainelGalpao && (
            <section className="dashboard-section">
              <h3>📊 Relatórios</h3>
              <div className="button-grid">
                <button onClick={() => abrirEmNovaAba("/painel-validade")} className="btn-relatorio btn-verde">
                  <i className="fas fa-vial"></i>
                  <span>Painel de Validade - Galpão</span>
                </button>
                <button onClick={() => abrirEmNovaAba("/indicadores-movimentacao")} className="btn-relatorio btn-roxo">
                  <i className="fas fa-chart-line"></i>
                  <span>Indicadores de Movimentação</span>
                </button>
                {/* NOVO BOTÃO: SALDO CONSOLIDADO */}
                <button onClick={() => abrirEmNovaAba("/saldo-consolidado")} className="btn-relatorio btn-azul">
                  <i className="fas fa-balance-scale"></i>
                  <span>Saldo Consolidado</span>
                </button>
              </div>
            </section>
          )}
        </details>

        {/* SETOR LOJA */}
        <details>
          <summary className="section-title">🏬 Setor Loja</summary>

          {podeVerLoja ? (
            <>
              <section className="dashboard-section">
                <h3>🛒 Operações de Loja</h3>
                <div className="button-grid">
                  <button onClick={() => abrirEmNovaAba("/entrada-produto-loja")}>
                    <i className="fas fa-arrow-down"></i>
                    <span>Entrada de Produto - Loja</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/saida-produto-loja")}>
                    <i className="fas fa-arrow-up"></i>
                    <span>Saída de Produto - Loja</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/estoque-loja")}>
                    <i className="fas fa-box-open"></i>
                    <span>Estoque Loja</span>
                  </button>
                  <button onClick={() => abrirEmNovaAba("/importar-estoque-loja")}>
                    <i className="fas fa-file-upload"></i>
                    <span>Importar Estoque Loja</span>
                  </button>

                  <button onClick={() => abrirEmNovaAba("/historico-saidas-loja")} className="btn-relatorio btn-vermelho">
                    <i className="fas fa-history"></i>
                    <span>Histórico de Saídas - Loja</span>
                  </button>

                  <button onClick={() => abrirEmNovaAba("/movimentacoes-galpao-loja")} className="btn-relatorio btn-azul">
                    <i className="fas fa-exchange-alt"></i>
                    <span>Movimentações Galpão → Loja</span>
                  </button>

                  {/* ✅ Novo botão: Saldo Galpão Loja */}
                  <button onClick={() => abrirEmNovaAba("/saldo-galpao-loja")} className="btn-relatorio btn-azul">
                    <i className="fas fa-warehouse"></i>
                    <span>Saldo Galpão Loja</span>
                  </button>

                  {/* ✅ Novo botão: Ajustar Inventário da Loja */}
                  <button onClick={() => abrirEmNovaAba("/ajustar-inventario-loja")} className="btn-relatorio btn-verde">
                    <i className="fas fa-tools"></i>
                    <span>Ajustar Inventário - Loja</span>
                  </button>

                  {/* ✅ Novo botão: Contagem da Loja (mobile) */}
                  <button onClick={() => abrirEmNovaAba("/contagem-loja")} className="btn-relatorio btn-laranja">
                    <i className="fas fa-calculator"></i>
                    <span>Contagem - Loja</span>
                  </button>

                  {isADM && (
                    <>
                      <button onClick={() => abrirEmNovaAba("/ajuste-estoque-loja-baixar")}>
                        <i className="fas fa-arrow-circle-down"></i>
                                              <span>Realizar Baixa de Estoque</span>
                    </button>
                  </>
                )}
              </div>
            </section>
          </>
        ) : (
          <p className="alert alert-warning">🚫 Você não tem permissão para acessar operações da loja.</p>
        )}

        {podeVerPainelLoja && (
          <section className="dashboard-section">
            <h3>📊 Relatórios</h3>
            <div className="button-grid">
              <button onClick={() => abrirEmNovaAba("/painel-validade-loja")} className="btn-relatorio btn-laranja">
                <i className="fas fa-vial"></i>
                <span>Painel de Validade - Loja</span>
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