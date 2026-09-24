import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import "./SaldoGalpaoLoja.css";


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

export default function SaldoGalpaoLoja() {
  const [dados, setDados] = useState([]);
  const [totais, setTotais] = useState({ loja: 0, galpao: 0 });
  const [filtroEan, setFiltroEan] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroNome, setFiltroNome] = useState("");

  // ✅ Novos filtros: saldo (mín/máx) e mês/ano de vencimento
  const [filtroSaldoLojaMin, setFiltroSaldoLojaMin] = useState("");
  const [filtroSaldoLojaMax, setFiltroSaldoLojaMax] = useState("");
  const [filtroSaldoGalpaoMin, setFiltroSaldoGalpaoMin] = useState("");
  const [filtroSaldoGalpaoMax, setFiltroSaldoGalpaoMax] = useState("");
  const [filtroMesVencimento, setFiltroMesVencimento] = useState("");
  const [filtroAnoVencimento, setFiltroAnoVencimento] = useState("");

  useEffect(() => {
    async function carregarDados() {
      // Consulta principal da view
      const { data, error } = await supabase
        .from("saldo_galpao_loja")
        .select("ean, nome, marca, validade, saldo_loja, saldo_galpao, saldo_total");

      if (error) {
        console.error(error);
      } else {
        console.log("Dados recebidos:", data);
        setDados(data);
      }

      // Totais calculados pela própria view
      const { data: totaisData, error: totaisError } = await supabase
        .from("saldo_galpao_loja")
        .select("sum(saldo_loja) as total_loja, sum(saldo_galpao) as total_galpao");

      if (!totaisError && totaisData.length > 0) {
        setTotais({
          loja: totaisData[0].total_loja || 0,
          galpao: totaisData[0].total_galpao || 0,
        });
      }
    }
    carregarDados();
  }, []);

  const dadosFiltrados = dados.filter(item => {
    const eanMatch = !filtroEan || (item.ean && item.ean.toString().includes(filtroEan));
    const marcaMatch = !filtroMarca || (item.marca && item.marca.toLowerCase().includes(filtroMarca.toLowerCase()));
    const nomeMatch = !filtroNome || (item.nome && item.nome.toLowerCase().includes(filtroNome.toLowerCase()));

    // ✅ Filtro por saldo, separado para Loja e Galpão (mín e/ou máx são opcionais)
    const saldoLojaMinMatch = filtroSaldoLojaMin === "" || (item.saldo_loja ?? 0) >= parseFloat(filtroSaldoLojaMin);
    const saldoLojaMaxMatch = filtroSaldoLojaMax === "" || (item.saldo_loja ?? 0) <= parseFloat(filtroSaldoLojaMax);
    const saldoGalpaoMinMatch = filtroSaldoGalpaoMin === "" || (item.saldo_galpao ?? 0) >= parseFloat(filtroSaldoGalpaoMin);
    const saldoGalpaoMaxMatch = filtroSaldoGalpaoMax === "" || (item.saldo_galpao ?? 0) <= parseFloat(filtroSaldoGalpaoMax);

    // ✅ Filtro por mês/ano de vencimento (validade no formato AAAA-MM-DD)
    const [anoValidade, mesValidade] = (item.validade || "").split("-");
    const mesMatch = !filtroMesVencimento || mesValidade === filtroMesVencimento;
    const anoMatch = !filtroAnoVencimento || anoValidade === filtroAnoVencimento;

    return eanMatch && marcaMatch && nomeMatch
      && saldoLojaMinMatch && saldoLojaMaxMatch
      && saldoGalpaoMinMatch && saldoGalpaoMaxMatch
      && mesMatch && anoMatch;
  });

  // ✅ Totais recalculados com base nos itens filtrados, exibidos no topo
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
        Validade: item.validade,
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

      <div style={{ marginBottom: "20px" }}>
        <h3>Totais Gerais</h3>
        <p><strong>Total Loja:</strong> {totais.loja}</p>
        <p><strong>Total Galpão:</strong> {totais.galpao}</p>
        <p><strong>Total Geral:</strong> {totais.loja + totais.galpao}</p>
      </div>

      {/* ✅ Totais dos itens filtrados na tela */}
      <div style={{ marginBottom: "20px" }}>
        <h3>Totais Filtrados</h3>
        <p><strong>Total Loja:</strong> {totaisFiltrados.loja}</p>
        <p><strong>Total Galpão:</strong> {totaisFiltrados.galpao}</p>
        <p><strong>Total Geral:</strong> {totaisFiltrados.total}</p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Filtrar por EAN"
          value={filtroEan}
          onChange={e => setFiltroEan(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="text"
          placeholder="Filtrar por Marca"
          value={filtroMarca}
          onChange={e => setFiltroMarca(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="text"
          placeholder="Filtrar por Nome"
          value={filtroNome}
          onChange={e => setFiltroNome(e.target.value)}
          style={{ marginRight: "10px" }}
        />
        <input
          type="number"
          placeholder="Saldo Loja mínimo"
          value={filtroSaldoLojaMin}
          onChange={e => setFiltroSaldoLojaMin(e.target.value)}
          style={{ marginRight: "10px", width: "130px" }}
        />
        <input
          type="number"
          placeholder="Saldo Loja máximo"
          value={filtroSaldoLojaMax}
          onChange={e => setFiltroSaldoLojaMax(e.target.value)}
          style={{ marginRight: "10px", width: "130px" }}
        />
        <input
          type="number"
          placeholder="Saldo Galpão mínimo"
          value={filtroSaldoGalpaoMin}
          onChange={e => setFiltroSaldoGalpaoMin(e.target.value)}
          style={{ marginRight: "10px", width: "140px" }}
        />
        <input
          type="number"
          placeholder="Saldo Galpão máximo"
          value={filtroSaldoGalpaoMax}
          onChange={e => setFiltroSaldoGalpaoMax(e.target.value)}
          style={{ marginRight: "10px", width: "140px" }}
        />
        <select
          value={filtroMesVencimento}
          onChange={e => setFiltroMesVencimento(e.target.value)}
          style={{ marginRight: "10px" }}
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
          style={{ width: "140px" }}
        />
      </div>

      <button onClick={exportarExcel}>Exportar para Excel</button>

      <table className="SaldoGalpaoLoja" style={{ marginTop: "20px" }}>
        <thead>
          <tr>
            <th>EAN</th>
            <th>Nome</th>
            <th>Marca</th>
            <th>Validade</th>
            <th>Saldo Loja</th>
            <th>Saldo Galpão</th>
            <th>Saldo Total</th>
          </tr>
        </thead>
        <tbody>
          {dadosFiltrados.map((item, idx) => (
            <tr key={idx}>
              <td>{item.ean}</td>
              <td>{item.nome}</td>
              <td>{item.marca}</td>
              <td className="validade">{item.validade}</td>
              <td>{item.saldo_loja}</td>
              <td>{item.saldo_galpao}</td>
              <td>{item.saldo_total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
