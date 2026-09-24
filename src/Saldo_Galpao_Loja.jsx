import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabaseUrl = "https://hejiipyxvufhnzeyfhdd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlamlpcHl4dnVmaG56ZXlmaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjQxNTAsImV4cCI6MjA2ODk0MDE1MH0.fq4G4b7lQktCRreV_CLem06221ZuOlY-miaVilcqfGE";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Nomes dos meses para o filtro de vencimento
const MESES = [
  { valor: "01", nome: "Janeiro" },
  { valor: "02", nome: "Fevereiro" },
  { valor: "03", nome: "Março" },
  { valor: "04", nome: "Abril" },
  { valor: "05", nome: "Maio" },
  { valor: "06", nome: "Junho" },
  { valor: "07", nome: "Julho" },
  { valor: "08", nome: "Agosto" },
  { valor: "09", nome: "Setembro" },
  { valor: "10", nome: "Outubro" },
  { valor: "11", nome: "Novembro" },
  { valor: "12", nome: "Dezembro" },
];

// ✅ Converte data "AAAA-MM-DD" (formato do banco) para "DD/MM/AAAA" (formato brasileiro), só para exibição
function formatarDataBR(validade) {
  if (!validade) return "";
  const partes = validade.split("-");
  if (partes.length !== 3) return validade;
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

// Estilos organizados para a tela (grid de filtros + tabela com linhas de grade)
const estilos = {
  filtrosContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "10px",
    marginBottom: "20px",
  },
  input: {
    padding: "6px 8px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  totaisBox: {
    border: "1px solid #ddd",
    borderRadius: "6px",
    padding: "15px 20px",
    marginBottom: "20px",
    backgroundColor: "#f9f9f9",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "10px",
  },
  th: {
    border: "1px solid #ccc",
    padding: "8px",
    backgroundColor: "#f0f0f0",
    textAlign: "left",
  },
  td: {
    border: "1px solid #ddd",
    padding: "8px",
  },
};

export default function SaldoGalpaoLoja() {
  const [dados, setDados] = useState([]);
  const [filtroEan, setFiltroEan] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroNome, setFiltroNome] = useState("");

  // Filtros de saldo (mín/máx) e mês/ano de vencimento
  const [filtroSaldoLojaMin, setFiltroSaldoLojaMin] = useState("");
  const [filtroSaldoLojaMax, setFiltroSaldoLojaMax] = useState("");
  const [filtroSaldoGalpaoMin, setFiltroSaldoGalpaoMin] = useState("");
  const [filtroSaldoGalpaoMax, setFiltroSaldoGalpaoMax] = useState("");
  const [filtroMesVencimento, setFiltroMesVencimento] = useState("");
  const [filtroAnoVencimento, setFiltroAnoVencimento] = useState("");

  useEffect(() => {
    async function carregarDados() {
      const { data, error } = await supabase
        .from("saldo_galpao_loja")
        .select("ean, nome, marca, validade, saldo_loja, saldo_galpao, saldo_total");

      if (error) {
        console.error(error);
      } else {
        setDados(data);
      }
    }
    carregarDados();
  }, []);

  // ✅ Soma o saldo_loja de TODAS as validades de cada EAN, para o filtro de saldo mínimo/máximo da Loja
  // considerar o produto como um todo, e não apenas a linha/validade específica.
  const totalLojaPorEan = dados.reduce((acc, item) => {
    acc[item.ean] = (acc[item.ean] || 0) + (item.saldo_loja || 0);
    return acc;
  }, {});

  const dadosFiltrados = dados.filter(item => {
    const eanMatch = !filtroEan || (item.ean && item.ean.toString().includes(filtroEan));
    const marcaMatch = !filtroMarca || (item.marca && item.marca.toLowerCase().includes(filtroMarca.toLowerCase()));
    const nomeMatch = !filtroNome || (item.nome && item.nome.toLowerCase().includes(filtroNome.toLowerCase()));

    const totalLojaDoProduto = totalLojaPorEan[item.ean] || 0;
    const saldoLojaMinMatch = filtroSaldoLojaMin === "" || totalLojaDoProduto >= parseFloat(filtroSaldoLojaMin);
    const saldoLojaMaxMatch = filtroSaldoLojaMax === "" || totalLojaDoProduto <= parseFloat(filtroSaldoLojaMax);
    const saldoGalpaoMinMatch = filtroSaldoGalpaoMin === "" || (item.saldo_galpao ?? 0) >= parseFloat(filtroSaldoGalpaoMin);
    const saldoGalpaoMaxMatch = filtroSaldoGalpaoMax === "" || (item.saldo_galpao ?? 0) <= parseFloat(filtroSaldoGalpaoMax);

    // Filtro por mês/ano de vencimento (validade no formato AAAA-MM-DD vindo do banco)
    const [anoValidade, mesValidade] = (item.validade || "").split("-");
    const mesMatch = !filtroMesVencimento || mesValidade === filtroMesVencimento;
    const anoMatch = !filtroAnoVencimento || anoValidade === filtroAnoVencimento;

    return eanMatch && marcaMatch && nomeMatch
      && saldoLojaMinMatch && saldoLojaMaxMatch
      && saldoGalpaoMinMatch && saldoGalpaoMaxMatch
      && mesMatch && anoMatch;
  });

  const totaisFiltrados = dadosFiltrados.reduce(
    (acc, item) => {
      acc.loja += item.saldo_loja || 0;
      acc.galpao += item.saldo_galpao || 0;
      acc.total += item.saldo_total || 0;
      return acc;
    },
    { loja: 0, galpao: 0, total: 0 }
  );

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      dadosFiltrados.map(item => ({
        EAN: item.ean,
        Nome: item.nome,
        Marca: item.marca,
        Validade: formatarDataBR(item.validade),
        "Saldo Loja": item.saldo_loja,
        "Saldo Galpão": item.saldo_galpao,
        "Saldo Total": item.saldo_total
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Saldo Galpão & Loja");
    XLSX.writeFile(wb, "saldo_galpao_loja.xlsx");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Saldo Galpão & Loja</h1>

      <div style={estilos.totaisBox}>
        <h3 style={{ marginTop: 0 }}>Totais</h3>
        <p><strong>Total Loja:</strong> {totaisFiltrados.loja}</p>
        <p><strong>Total Galpão:</strong> {totaisFiltrados.galpao}</p>
        <p><strong>Total Geral:</strong> {totaisFiltrados.total}</p>
      </div>

      <div style={estilos.filtrosContainer}>
        <input
          type="text"
          placeholder="Filtrar por EAN"
          value={filtroEan}
          onChange={e => setFiltroEan(e.target.value)}
          style={estilos.input}
        />
        <input
          type="text"
          placeholder="Filtrar por Marca"
          value={filtroMarca}
          onChange={e => setFiltroMarca(e.target.value)}
          style={estilos.input}
        />
        <input
          type="text"
          placeholder="Filtrar por Nome"
          value={filtroNome}
          onChange={e => setFiltroNome(e.target.value)}
          style={estilos.input}
        />
        <input
          type="number"
          placeholder="Saldo Loja mínimo (total do produto)"
          value={filtroSaldoLojaMin}
          onChange={e => setFiltroSaldoLojaMin(e.target.value)}
          style={estilos.input}
        />
        <input
          type="number"
          placeholder="Saldo Loja máximo (total do produto)"
          value={filtroSaldoLojaMax}
          onChange={e => setFiltroSaldoLojaMax(e.target.value)}
          style={estilos.input}
        />
        <input
          type="number"
          placeholder="Saldo Galpão mínimo"
          value={filtroSaldoGalpaoMin}
          onChange={e => setFiltroSaldoGalpaoMin(e.target.value)}
          style={estilos.input}
        />
        <input
          type="number"
          placeholder="Saldo Galpão máximo"
          value={filtroSaldoGalpaoMax}
          onChange={e => setFiltroSaldoGalpaoMax(e.target.value)}
          style={estilos.input}
        />
        <select
          value={filtroMesVencimento}
          onChange={e => setFiltroMesVencimento(e.target.value)}
          style={estilos.input}
        >
          <option value="">Mês de vencimento</option>
          {MESES.map(mes => (
            <option key={mes.valor} value={mes.valor}>{mes.nome}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Ano de vencimento"
          value={filtroAnoVencimento}
          onChange={e => setFiltroAnoVencimento(e.target.value)}
          style={estilos.input}
        />
      </div>

      <button onClick={exportarExcel} style={{ marginBottom: "15px" }}>Exportar para Excel</button>

      <table style={estilos.table}>
        <thead>
          <tr>
            <th style={estilos.th}>EAN</th>
            <th style={estilos.th}>Nome</th>
            <th style={estilos.th}>Marca</th>
            <th style={estilos.th}>Validade</th>
            <th style={estilos.th}>Saldo Loja</th>
            <th style={estilos.th}>Saldo Galpão</th>
            <th style={estilos.th}>Saldo Total</th>
          </tr>
        </thead>
        <tbody>
          {dadosFiltrados.map((item, idx) => (
            <tr key={idx}>
              <td style={estilos.td}>{item.ean}</td>
              <td style={estilos.td}>{item.nome}</td>
              <td style={estilos.td}>{item.marca}</td>
              <td style={estilos.td}>{formatarDataBR(item.validade)}</td>
              <td style={estilos.td}>{item.saldo_loja}</td>
              <td style={estilos.td}>{item.saldo_galpao}</td>
              <td style={estilos.td}>{item.saldo_total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
