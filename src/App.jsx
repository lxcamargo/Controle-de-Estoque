
import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Login from "./Login.jsx";
import Dashboard from "./Dashboard.jsx";
import EntradaProduto from "./EntradaProduto.jsx";
import ImportarCadastroProduto from "./ImportarCadastroProduto.jsx";
import Estoque from "./Estoque.jsx";
import ProdutosCadastrados from "./ProdutosCadastrados.jsx";
import ImportarProdutos from "./ImportarProdutos.jsx";
import CadastroDinamico from "./CadastroDinamico.jsx";
import SaidaProduto from "./SaidaProduto.jsx";
import CadastroUsuario from "./CadastroUsuario.jsx";
import HistoricoEntradas from "./HistoricoEntradas.jsx";
import HistoricoSaida from "./HistoricoSaida.jsx"; // ✅ caminho corrigido
import PainelValidade from "./PainelValidade";

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/entrada-produto" element={<EntradaProduto />} />
        <Route path="/saida-produto" element={<SaidaProduto />} />
        <Route path="/importar-cadastro" element={<ImportarCadastroProduto />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/cadastro-produto" element={<CadastroProduto />} />
        <Route path="/cadastro-dinamico" element={<CadastroDinamico />} />
        <Route path="/produtos-cadastrados" element={<ProdutosCadastrados />} />
        <Route path="/cadastrar-usuario" element={<CadastroUsuario />} />
        <Route path="/importar-produtos" element={<ImportarProdutos />} />
        <Route path="/importar-planilha" element={<ImportarProdutos />} />
        <Route path="/historico-entradas" element={<HistoricoEntradas />} />
        <Route path="/historico-saidas" element={<HistoricoSaida />} /> {/* ✅ rota funcionando */}
        <Route path="*" element={<PaginaNaoEncontrada />} />
        <Route path="/painel-validade" element={<PainelValidade />} />
      </Routes>
    </BrowserRouter>
  );
}