
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import EntradaProduto from "./EntradaProduto.jsx";
import ImportarCadastroProduto from "./ImportarCadastroProduto.jsx";
import Estoque from "./Estoque.jsx";
import ProdutosCadastrados from "./ProdutosCadastrados.jsx";
import ImportarProdutos from "./ImportarProdutos.jsx";
import CadastroDinamico from "./CadastroDinamico.jsx";
import SaidaProduto from "./SaidaProduto.jsx";
import CadastroUsuario from './CadastroUsuario.jsx';
import HistoricoEntradas from "./HistoricoEntradas.jsx";
import HistoricoSaida from "./HistoricoSaida.jsx";
import PainelValidade from "./PainelValidade.jsx";
import Inventario from "./Inventario.jsx";
import HistoricoContagens from "./HistoricoContagens.jsx";
import EditarProduto from "./EditarProduto.jsx";
import TelaContagem from "./TelaContagem.jsx";

// ✅ Novos componentes da Loja
import EntradaProdutoLoja from "./EntradaProdutoLoja.jsx";
import EstoqueLoja from "./EstoqueLoja.jsx";
import ImportarEstoqueLoja from "./ImportarEstoqueLoja.jsx";
import SaidaProdutoLoja from "./SaidaProdutoLoja.jsx";
import PainelValidadeLoja from "./PainelValidadeLoja.jsx";
import HistoricoSaidaLoja from "./HistoricoSaidaLoja.jsx";

// ✅ Novo componente para movimentações galpão → loja
import MovimentacoesGalpaoLoja from "./MovimentacoesGalpaoLoja.jsx";

// ✅ Novos componentes para ajuste de estoque via planilha
import AjusteEstoqueLojaImportar from "./AjusteEstoqueLojaImportar.jsx";
import AjusteEstoqueLojaBaixar from "./AjusteEstoqueLojaBaixar.jsx";

// ✅ Novo componente de indicadores de movimentação
import IndicadoresMovimentacao from "./IndicadoresMovimentacao.jsx";

// ✅ Novo componente de saldo consolidado
import SaldoConsolidado from "./SaldoConsolidado.jsx";

// ✅ Novo componente de transferência de endereço
import TransferenciaEndereco from "./TransferenciaEndereco.jsx";

function CadastroProduto() {
  const location = useLocation();
  const eanRecebido = location.state?.ean || "";

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📝 Cadastro de Produto</h2>
      {eanRecebido && (
        <p><strong>EAN recebido:</strong> {eanRecebido}</p>
      )}
    </div>
  );
}

function PaginaNaoEncontrada() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>🚫 Página não encontrada</h2>
      <p>Verifique o endereço ou volte para o <a href="/dashboard">Dashboard</a>.</p>
    </div>
  );
}

// 🔐 Wrapper para redirecionar após login
function LoginWrapper() {
  const navigate = useNavigate();

  useEffect(() => {
    const usuarioAutenticado = localStorage.getItem("usuarioLogado");
    if (usuarioAutenticado) {
      navigate("/dashboard");
    }
  }, [navigate]);

  return <Login />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginWrapper />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/entrada-produto" element={<EntradaProduto />} />
        <Route path="/saida-produto" element={<SaidaProduto />} />
        <Route path="/importar-cadastro" element={<ImportarCadastroProduto />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/cadastro-produto" element={<CadastroProduto />} />
        <Route path="/cadastro-dinamico" element={<CadastroDinamico />} />
        <Route path="/produtos-cadastrados" element={<ProdutosCadastrados />} />
        <Route path="/editar-produto/:id" element={<EditarProduto />} />
        <Route path="/cadastrar-usuario" element={<CadastroUsuario />} />
        <Route path="/importar-produtos" element={<ImportarProdutos />} />
        <Route path="/importar-planilha" element={<ImportarProdutos />} />
        <Route path="/historico-entradas" element={<HistoricoEntradas />} />
        <Route path="/historico-saidas" element={<HistoricoSaida />} />
        <Route path="/painel-validade" element={<PainelValidade />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/historico-contagens" element={<HistoricoContagens />} />
        <Route path="/contagem" element={<TelaContagem />} />

        {/* ✅ Rotas exclusivas da Loja */}
        <Route path="/entrada-produto-loja" element={<EntradaProdutoLoja />} />
        <Route path="/saida-produto-loja" element={<SaidaProdutoLoja />} />
        <Route path="/estoque-loja" element={<EstoqueLoja />} />
        <Route path="/importar-estoque-loja" element={<ImportarEstoqueLoja />} />
        <Route path="/painel-validade-loja" element={<PainelValidadeLoja />} />
        <Route path="/historico-saidas-loja" element={<HistoricoSaidaLoja />} />

        {/* ✅ Nova rota para movimentações entre setores */}
        <Route path="/movimentacoes-galpao-loja" element={<MovimentacoesGalpaoLoja />} />

        {/* ✅ Novas rotas para ajuste de estoque via planilha */}
        <Route path="/ajuste-estoque-loja-importar" element={<AjusteEstoqueLojaImportar />} />
        <Route path="/ajuste-estoque-loja-baixar" element={<AjusteEstoqueLojaBaixar />} />

        {/* ✅ Nova rota para indicadores de movimentação */}
        <Route path="/indicadores-movimentacao" element={<IndicadoresMovimentacao />} />

        {/* ✅ Nova rota para saldo consolidado */}
        <Route path="/saldo-consolidado" element={<SaldoConsolidado />} />

        {/* ✅ Nova rota para transferência de endereço */}
        <Route path="/transferencia-endereco" element={<TransferenciaEndereco />} />

        <Route path="*" element={<PaginaNaoEncontrada />} />
      </Routes>
    </BrowserRouter>
  );
}