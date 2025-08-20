// src/ProdutosCadastrados.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const ProdutosCadastrados = () => {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 10;

  useEffect(() => {
    const buscarProdutos = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("produto")
        .select("*")
        .order("nome", { ascending: true });

      if (error) {
        console.error("Erro ao buscar produtos:", error);
      } else {
        setProdutos(data);
      }

      setLoading(false);
    };

    buscarProdutos();
  }, []);

  const produtosFiltrados = produtos.filter((produto) =>
    produto.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
  const produtosPaginados = produtosFiltrados.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina
  );

  const formatarPreco = (valor) =>
    Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📋 Produtos Cadastrados</h2>

      <input
        type="text"
        placeholder="🔍 Buscar por nome..."
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          setPagina(1);
        }}
        style={{
          marginBottom: "1rem",
          padding: "0.5rem",
          width: "100%",
          maxWidth: "400px",
        }}
      />

      {loading ? (
        <p>Carregando produtos...</p>
      ) : produtosFiltrados.length === 0 ? (
        <p>Nenhum produto encontrado.</p>
      ) : (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Categoria</th>
                <th style={thStyle}>Preço</th>
              </tr>
            </thead>
            <tbody>
              {produtosPaginados.map((produto) => (
                <tr key={produto.id}>
                  <td style={tdStyle}>{produto.id}</td>
                  <td style={tdStyle}>{produto.nome}</td>
                  <td style={tdStyle}>{produto.categoria}</td>
                  <td style={tdStyle}>{formatarPreco(produto.preco)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "1rem" }}>
            <button
              disabled={pagina === 1}
              onClick={() => setPagina(pagina - 1)}
              style={buttonStyle}
            >
              ◀ Anterior
            </button>
            <span style={{ margin: "0 1rem" }}>
              Página {pagina} de {totalPaginas}
            </span>
            <button
              disabled={pagina === totalPaginas}
              onClick={() => setPagina(pagina + 1)}
              style={buttonStyle}
            >
              Próxima ▶
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const thStyle = {
  borderBottom: "1px solid #ccc",
  padding: "0.5rem",
  textAlign: "left",
};

const tdStyle = {
  padding: "0.5rem",
  borderBottom: "1px solid #eee",
};

const buttonStyle = {
  padding: "0.5rem 1rem",
  margin: "0 0.5rem",
  cursor: "pointer",
};

export default ProdutosCadastrados;