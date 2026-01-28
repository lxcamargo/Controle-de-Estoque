import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function EstoqueLoja() {
  const [estoque, setEstoque] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [erro, setErro] = useState(null);

  const [filtro, setFiltro] = useState({
    ean: "",
    descricao: "",
    marca: "",
    mesValidade: "",
    anoValidade: ""
  });

  // ✅ define o título da aba do navegador quando a tela abre
  useEffect(() => {
    document.title = "Estoque Loja";
  }, []);

  useEffect(() => {
    const carregarDados = async () => {
      const { data: dadosEstoque, error: erroEstoque } = await supabase
        .from("estoque_loja") // 👈 Tabela exclusiva da loja
        .select("*")
        .gt("quantidade", 0);

      const { data: dadosProdutos, error: erroProdutos } = await supabase
        .from("produto")
        .select("*");

      if (erroEstoque || erroProdutos) {
        setErro("Erro ao carregar dados do Supabase.");
        setEstoque([]);
        setProdutos([]);
      } else {
        setEstoque(dadosEstoque);
        setProdutos(dadosProdutos);
        setErro(null);
      }
    };

    carregarDados();
  }, []);

  const filtroSanitizado = {
    ean: filtro.ean.trim().toLowerCase(),
    descricao: filtro.descricao.trim().toLowerCase(),
    marca: filtro.marca.trim().toLowerCase(),
    mesValidade: filtro.mesValidade,
    anoValidade: filtro.anoValidade
  };

  const dadosCompletos = estoque
    .map(item => {
      const produto = produtos.find(p => p.id_produto === item.id_produto);
      const validadeDate = item.validade
        ? new Date(item.validade + "T00:00:00")
        : null;

      return {
        ean: produto?.ean || `EAN não cadastrado`,
        descricao: produto?.descricao || "Produto não cadastrado",
        marca: produto?.marca || "—",
        quantidade: Number(item.quantidade) || 0,
        validade: validadeDate
          ? validadeDate.toLocaleDateString("pt-BR")
          : "—",
        validadeRaw: validadeDate
      };
    })
    .filter(item => {
      const eanMatch = filtroSanitizado.ean
        ? item.ean.toLowerCase().includes(filtroSanitizado.ean)
        : true;
      const descricaoMatch = filtroSanitizado.descricao
        ? item.descricao.toLowerCase().includes(filtroSanitizado.descricao)
        : true;
      const marcaMatch = filtroSanitizado.marca
        ? item.marca.toLowerCase().includes(filtroSanitizado.marca)
        : true;

      const validadeMatch =
        filtroSanitizado.mesValidade || filtroSanitizado.anoValidade
          ? (() => {
              const data = item.validadeRaw;
              if (!data) return false;
              const mes = String(data.getMonth() + 1).padStart(2, "0");
              const ano = data.getFullYear(); // 👈 número
              const mesOk = filtroSanitizado.mesValidade
                ? mes === filtroSanitizado.mesValidade
                : true;
              const anoOk = filtroSanitizado.anoValidade
                ? ano === Number(filtroSanitizado.anoValidade) // 👈 comparação numérica
                : true;
              return mesOk && anoOk;
            })()
          : true;

      return eanMatch && descricaoMatch && marcaMatch && validadeMatch;
    })
    .sort((a, b) => b.quantidade - a.quantidade);

  const validadeEstilo = data => {
    if (!data) return {};
    const hoje = new Date();
    const diasRestantes = (data - hoje) / (1000 * 60 * 60 * 24);
    if (diasRestantes < 7) return { backgroundColor: "#ffe0e0" };
    if (diasRestantes < 30) return { backgroundColor: "#fff5cc" };
    return {};
  };

  const exportarParaExcel = () => {
    if (dadosCompletos.length === 0) {
      alert("Nenhum dado para exportar.");
      return;
    }

    const dadosFormatados = dadosCompletos.map(item => ({
      EAN: item.ean,
      Descrição: item.descricao,
      Marca: item.marca,
      Quantidade: item.quantidade,
      Validade: item.validade
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "EstoqueLoja");

    XLSX.writeFile(workbook, "estoque_loja.xlsx");
  };

  const anosDisponiveis = Array.from(
    new Set(
      estoque
        .map(item => item.validade)
        .filter(Boolean)
        .map(data => {
          const ano = new Date(data + "T00:00:00").getFullYear();
          return !isNaN(ano) ? ano : null;
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a - b);

  // ✅ Novos cálculos
  const saldoTotal = dadosCompletos.reduce((acc, item) => acc + item.quantidade, 0);
  const eansUnicos = new Set(dadosCompletos.map(item => item.ean)).size;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>🏬 Estoque Loja</h1>
      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {/* ✅ Cards de resumo */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{
          backgroundColor: "#f0f4f8",
          padding: "0.75rem 1.25rem",
          borderRadius: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          minWidth: "160px",
          textAlign: "center"
        }}>
          <h4 style={{ margin: 0 }}>📦 Saldo Total</h4>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#2e7d32", margin: 0 }}>
            {saldoTotal}
          </p>
        </div>
        <div style={{
          backgroundColor: "#f0f4f8",
          padding: "0.75rem 1.25rem",
          borderRadius: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          minWidth: "160px",
          textAlign: "center"
        }}>
          <h4 style={{ margin: 0 }}>🔢 EANs Únicos</h4>
          <p style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#2e7d32", margin: 0 }}>
            {eansUnicos}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Filtrar por EAN"
          value={filtro.ean}
          onChange={e => setFiltro({ ...filtro, ean: e.target.value })}
          style={{ marginRight: "1rem" }}
        />
        <input
          type="text"
          placeholder="Filtrar por descrição"
          value={filtro.descricao}
          onChange={e => setFiltro({ ...filtro, descricao: e.target.value })}
          style={{ marginRight: "1rem" }}
        />
        <input
          type="text"
          placeholder="Filtrar por marca"
          value={filtro.marca}
          onChange={e => setFiltro({ ...filtro, marca: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <select
          value={filtro.mesValidade}
          onChange={e => setFiltro({ ...filtro, mesValidade: e.target.value })}
          style={{ marginRight: "1rem" }}
        >
          <option value="">Filtrar por mês</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
              {new Date(0, i).toLocaleString("pt-BR", { month: "long" })}
            </option>
          ))}
        </select>

                <select
          value={filtro.anoValidade}
          onChange={e => setFiltro({ ...filtro, anoValidade: e.target.value })}
        >
          <option value="">Filtrar por ano</option>
          {anosDisponiveis.map(ano => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
      </div>

      <button onClick={exportarParaExcel} style={{ marginBottom: "1rem" }}>
        📤 Exportar para Excel
      </button>

      <p>
        🔎 Exibindo <strong>{dadosCompletos.length}</strong> produtos |
        📦 Saldo Total: <strong>{saldoTotal}</strong> |
        🔢 EANs Únicos: <strong>{eansUnicos}</strong>
      </p>

      {dadosCompletos.length > 0 ? (
        <table border="1" cellPadding="8" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>EAN</th>
              <th>Descrição</th>
              <th>Marca</th>
              <th>Quantidade</th>
              <th>Validade</th>
            </tr>
          </thead>
          <tbody>
            {dadosCompletos.map((item, index) => (
              <tr key={index}>
                <td>{item.ean}</td>
                <td>{item.descricao}</td>
                <td>{item.marca}</td>
                <td>{item.quantidade}</td>
                <td style={validadeEstilo(item.validadeRaw)}>{item.validade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Nenhum produto encontrado.</p>
      )}
    </div>
  );
}