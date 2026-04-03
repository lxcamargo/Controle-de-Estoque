import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import "./EstoqueConsolidado.css"; // ✅ import do CSS

const supabaseUrl = "https://hejiipyxvufhnzeyfhdd.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlamlpcHl4dnVmaG56ZXlmaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjQxNTAsImV4cCI6MjA2ODk0MDE1MH0.fq4G4b7lQktCRreV_CLem06221ZuOlY-miaVilcqfGE";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EstoqueConsolidado() {
  const [dados, setDados] = useState([]);
  const [totais, setTotais] = useState({ loja: 0, galpao: 0 });

  const [filtroEan, setFiltroEan] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroNome, setFiltroNome] = useState("");

  useEffect(() => {
    async function carregarDados() {
      const { data, error } = await supabase
        .from("saldo_galpao_loja")
        .select("ean, nome, marca, validade, saldo_loja, saldo_galpao");

      if (error) {
        console.error(error);
      } else {
        console.log("Dados recebidos:", data);
        setDados(data);
      }

      const { data: lojaData, error: lojaError } = await supabase
        .from("estoque_loja")
        .select("sum(quantidade) as total_loja");

      const { data: galpaoData, error: galpaoError } = await supabase
        .from("estoque_galpao")
        .select("sum(quantidade) as total_galpao");

      if (!lojaError && lojaData.length > 0 && !galpaoError && galpaoData.length > 0) {
        setTotais({
          loja: lojaData[0].total_loja || 0,
          galpao: galpaoData[0].total_galpao || 0,
        });
      }
    }
    carregarDados();
  }, []);

  const dadosFiltrados = dados.filter(item => {
    const eanMatch = !filtroEan || (item.ean && item.ean.toString().includes(filtroEan));
    const marcaMatch = !filtroMarca || (item.marca && item.marca.toLowerCase().includes(filtroMarca.toLowerCase()));
    const nomeMatch = !filtroNome || (item.nome && item.nome.toLowerCase().includes(filtroNome.toLowerCase()));
    return eanMatch && marcaMatch && nomeMatch;
  });

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      dadosFiltrados.map(item => ({
        EAN: item.ean,
        Nome: item.nome,
        Marca: item.marca,
        Validade: item.validade,
        "Saldo Loja": item.saldo_loja,
        "Saldo Galpão": item.saldo_galpao,
        "Saldo Total": (item.saldo_loja || 0) + (item.saldo_galpao || 0)
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Estoque Consolidado");
    XLSX.writeFile(wb, "saldo_galpao_loja.xlsx");
  };

  return (
    <div className="estoque-consolidado">
      <h1>📦 Saldo Galpão & Loja</h1>

      <div className="totais">
        <h3>Totais</h3>
        <p><strong>Total Loja:</strong> {totais.loja}</p>
        <p><strong>Total Galpão:</strong> {totais.galpao}</p>
        <p><strong>Total Geral:</strong> {totais.loja + totais.galpao}</p>
      </div>

      <div className="filtros">
        <input
          type="text"
          placeholder="Filtrar por EAN"
          value={filtroEan}
          onChange={e => setFiltroEan(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por Marca"
          value={filtroMarca}
          onChange={e => setFiltroMarca(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por Nome"
          value={filtroNome}
          onChange={e => setFiltroNome(e.target.value)}
        />
      </div>

      <button onClick={exportarExcel}>📤 Exportar para Excel</button>

      <table className="EstoqueConsolidado">
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
              <td>{(item.saldo_loja || 0) + (item.saldo_galpao || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}