import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function PainelValidadeLoja() {
  const [estoqueLoja, setEstoqueLoja] = useState([]);
  const [erro, setErro] = useState(null);

  const [filtroEAN, setFiltroEAN] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAno, setFiltroAno] = useState("");

  useEffect(() => {
    const carregarDados = async () => {
      const { data, error } = await supabase
        .from("estoque_loja")
        .select("*")
        .gt("quantidade", 0);

      if (error) {
        setErro("Erro ao carregar dados.");
        setEstoqueLoja([]);
      } else {
        setEstoqueLoja(data);
        setErro(null);
      }
    };

    carregarDados();
  }, []);

  const dadosOrdenados = estoqueLoja
    .map(item => {
      const validadeDate = item.validade
        ? new Date(item.validade + "T00:00:00")
        : null;

      return {
        ean: item.ean || "—",
        descricao: item.nome || "—",
        marca: item.marca || "—",
        quantidade: item.quantidade || 0,
        validade: validadeDate
          ? validadeDate.toLocaleDateString("pt-BR")
          : "—",
        validadeRaw: validadeDate
      };
    })
    .filter(item => item.validadeRaw)
    .sort((a, b) => a.validadeRaw - b.validadeRaw);

  const dadosFiltrados = dadosOrdenados.filter(item => {
    const validade = item.validadeRaw;
    const mes = validade?.getMonth() + 1;
    const ano = validade?.getFullYear();

    return (
      item.ean.toLowerCase().includes(filtroEAN.toLowerCase()) &&
      item.marca.toLowerCase().includes(filtroMarca.toLowerCase()) &&
      item.descricao.toLowerCase().includes(filtroDescricao.toLowerCase()) &&
      (filtroMes === "" || mes === parseInt(filtroMes)) &&
      (filtroAno === "" || ano === parseInt(filtroAno))
    );
  });

  const estiloValidadeFaixa = data => {
    if (!data) return {};
    const hoje = new Date();
    const dias = (data - hoje) / (1000 * 60 * 60 * 24);

    if (dias >= 30 && dias <= 90) return { backgroundColor: "#ffd6d6" };
    if (dias > 90 && dias <= 180) return { backgroundColor: "#fff3cc" };
    if (dias > 180) return { backgroundColor: "#d6f5d6" };
    return { backgroundColor: "#f2f2f2" };
  };

  const estiloBolinha = data => {
    if (!data) return { backgroundColor: "#cccccc" };
    const hoje = new Date();
    const dias = (data - hoje) / (1000 * 60 * 60 * 24);

    if (dias < 30) return { backgroundColor: "#b71c1c" };
    if (dias >= 30 && dias <= 90) return { backgroundColor: "#f44336" };
    if (dias > 90 && dias <= 180) return { backgroundColor: "#ff9800" };
    if (dias > 180) return { backgroundColor: "#4caf50" };
    return { backgroundColor: "#cccccc" };
  };

  const exportarParaExcel = () => {
    const dadosParaExportar = dadosFiltrados.map(item => ({
      EAN: item.ean,
      Descrição: item.descricao,
      Marca: item.marca,
      Quantidade: item.quantidade,
      Validade: item.validade
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Validades Loja");

    XLSX.writeFile(workbook, "painel-validade-loja.xlsx");
  };

  const anosDisponiveis = Array.from(
    new Set(
      estoqueLoja
        .map(item => item.validade)
        .filter(Boolean)
        .map(data => {
          const ano = new Date(data + "T00:00:00").getFullYear();
          return !isNaN(ano) ? ano : null;
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a - b);

  const saldoTotal = dadosFiltrados.reduce((acc, item) => acc + item.quantidade, 0);
  const eansUnicos = new Set(dadosFiltrados.map(item => item.ean)).size;

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🏬 Painel de Validade da Loja</h2>
      <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>
        Produtos ordenados por vencimento. Cores indicam faixas de atenção:
        <br />
        <span style={{ color: "#b71c1c" }}>🔴 Vencido ou &lt; 30 dias</span> |{" "}
        <span style={{ color: "#f44336" }}>🔴 30–90 dias</span> |{" "}
        <span style={{ color: "#ff9800" }}>🟠 91–180 dias</span> |{" "}
        <span style={{ color: "#4caf50" }}>🟢 +180 dias</span>
      </p>

      {/* 🧮 Cartões compactos com dados dinâmicos */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{
          backgroundColor: "#f0f4f8",
          padding: "0.75rem 1.25rem",
          borderRadius: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          minWidth: "160px",
          textAlign: "center"
        }}>
          <h4 style={{ margin: 0, fontSize: "1rem" }}>📦 Saldo Total</h4>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#2e7d32", margin: 0 }}>
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
          <h4 style={{ margin: 0, fontSize: "1rem" }}>🔢 EANs Únicos</h4>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#2e7d32", margin: 0 }}>
            {eansUnicos}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Filtrar por EAN"
          value={filtroEAN}
          onChange={e => setFiltroEAN(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por Marca"
          value={filtroMarca}
          onChange={e => setFiltroMarca(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por Descrição"
          value={filtroDescricao}
          onChange={e => setFiltroDescricao(e.target.value)}
        />
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
          <option value="">Mês</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {String(i + 1).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
          <option value="">Ano</option>
          {anosDisponiveis.map(ano => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
        <button
          onClick={exportarParaExcel}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          📥 Exportar para Excel
        </button>
      </div>

      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {dadosFiltrados.length === 0 ? (
        <p>Nenhum produto encontrado com os filtros aplicados.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f0f0f0" }}>
            <tr>
              <th>EAN</th>
              <th>Descrição</th>
              <th>Marca</th>
              <th>Quantidade</th>
              <th>Validade</th>
            </tr>
          </thead>
          <tbody>
            {dadosFiltrados.map((item, index) => (
              <tr key={index} style={estiloValidadeFaixa(item.validadeRaw)}>
                <td>{item.ean}</td>
                <td style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      ...estiloBolinha(item.validadeRaw)
                    }}
                  ></div>
                  {item.descricao}
                </td>
                <td>{item.marca}</td>
                <td>{item.quantidade}</td>
                <td>{item.validade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
