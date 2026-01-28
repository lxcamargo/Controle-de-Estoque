import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx"; // ✅ Biblioteca para exportar Excel

const ProdutosCadastrados = () => {
  const location = useLocation();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const itensPorPagina = 10;

  // ✅ Define o título da aba do navegador
  useEffect(() => {
    document.title = "Produtos Cadastrados";
  }, []);

  useEffect(() => {
    const buscarProdutos = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("produto")
        .select("*")
        .order("descricao", { ascending: true });

      if (error) {
        console.error("Erro ao buscar produtos:", error);
      } else {
        setProdutos(data);
      }

      setLoading(false);
    };

    buscarProdutos();

    if (location.state?.atualizar) {
      buscarProdutos();
      window.history.replaceState({}, document.title);
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        buscarProdutos();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [location.state]);

  const produtosFiltrados = produtos.filter((produto) =>
    produto.ean?.toString().includes(busca)
  );

  const totalPaginas = Math.ceil(produtosFiltrados.length / itensPorPagina);
  const produtosPaginados = produtosFiltrados.slice(
    (pagina - 1) * itensPorPagina,
    pagina * itensPorPagina
  );

  const irParaEdicao = (id_produto) => {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id_produto);
    if (isUUID) {
      window.location.href = `/editar-produto/${id_produto}`;
    } else {
      alert("ID do produto inválido ou malformado.");
    }
  };

  const exportarParaExcel = () => {
    const dadosExportacao = produtosFiltrados.map((produto) => ({
      EAN: produto.ean,
      Descrição: produto.descricao,
      Marca: produto.marca,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");

    XLSX.writeFile(workbook, "produtos_cadastrados.xlsx");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📋 Produtos Cadastrados</h2>

      <input
        type="text"
        placeholder="🔍 Buscar por EAN..."
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

      <button
        onClick={exportarParaExcel}
        style={{
          ...buttonStyle,
          backgroundColor: "#4CAF50",
          color: "white",
          marginBottom: "1rem",
        }}
      >
        📤 Exportar para Excel
      </button>

      {loading ? (
        <p>Carregando produtos...</p>
      ) : produtosFiltrados.length === 0 ? (
        <p>Nenhum produto encontrado.</p>
      ) : (
        <>
          <table style={tabelaStyle}>
            <thead>
              <tr>
                <th style={celulaStyle}>EAN</th>
                <th style={celulaStyle}>Descrição</th>
                <th style={celulaStyle}>Marca</th>
                <th style={celulaStyle}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtosPaginados.map((produto) => (
                <tr key={produto.ean}>
                  <td style={celulaStyle}>{produto.ean}</td>
                  <td style={celulaStyle}>{produto.descricao}</td>
                  <td style={celulaStyle}>{produto.marca}</td>
                  <td style={celulaStyle}>
                    <button
                      onClick={() => irParaEdicao(produto.id_produto)}
                      style={{
                        ...buttonStyle,
                        backgroundColor: "#f0f0f0",
                        border: "1px solid #ccc",
                      }}
                    >
                      Editar
                    </button>
                  </td>
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

const tabelaStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "1rem",
  fontSize: "1rem",
};

const celulaStyle = {
  border: "1px solid #ccc",
  padding: "0.75rem",
  textAlign: "left",
};

const buttonStyle = {
  padding: "0.5rem 1rem",
  margin: "0 0.5rem",
  cursor: "pointer",
};

export default ProdutosCadastrados;
