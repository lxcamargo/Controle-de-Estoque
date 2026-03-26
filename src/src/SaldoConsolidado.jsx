import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function SaldoConsolidado() {
  const [estoque, setEstoque] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [saldoWMS, setSaldoWMS] = useState([]);
  const [erro, setErro] = useState(null);

  const [filtroEAN, setFiltroEAN] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroStatus, setFiltroStatus] = useState(""); // ✅ novo filtro

  useEffect(() => {
    document.title = "Saldo Consolidado";
  }, []);

  useEffect(() => {
    const carregarDados = async () => {
      const { data: dadosEstoque, error: erroEstoque } = await supabase
        .from("estoque")
        .select("*")
        .gt("quantidade", 0);

      const { data: dadosProdutos, error: erroProdutos } = await supabase
        .from("produto")
        .select("*");

      const { data: dadosWMS, error: erroWMS } = await supabase
        .from("saldo_wms")
        .select("*");

      if (erroEstoque || erroProdutos || erroWMS) {
        setErro("Erro ao carregar dados.");
        setEstoque([]);
        setProdutos([]);
        setSaldoWMS([]);
      } else {
        setEstoque(dadosEstoque);
        setProdutos(dadosProdutos);
        setSaldoWMS(dadosWMS);
        setErro(null);
      }
    };

    carregarDados();
  }, []);

  const dadosAgrupados = Object.values(
    estoque.reduce((acc, item) => {
      const produto = produtos.find(p => p.id_produto === item.id_produto);
      const chave = produto?.ean || "—";

      if (!acc[chave]) {
        // ✅ corrigido: usar nomes de colunas em minúsculo
        const wms = saldoWMS.find(w => w.ean === chave);
        acc[chave] = {
          ean: chave,
          descricao: produto?.descricao || "—",
          marca: produto?.marca || "—",
          quantidade: 0,
          quantidadeWMS: wms?.quantidade || 0,
          status: ""
        };
      }

      acc[chave].quantidade += item.quantidade || 0;

      // ✅ Lógica do status
      if (acc[chave].quantidade > acc[chave].quantidadeWMS) {
        acc[chave].status = "Saldo WMS menor";
      } else if (acc[chave].quantidade < acc[chave].quantidadeWMS) {
        acc[chave].status = "Saldo WMS maior";
      } else {
        acc[chave].status = "Saldo OK";
      }

      return acc;
    }, {})
  );

  const dadosFiltrados = dadosAgrupados.filter(item =>
    item.ean.toLowerCase().includes(filtroEAN.toLowerCase()) &&
    item.marca.toLowerCase().includes(filtroMarca.toLowerCase()) &&
    item.descricao.toLowerCase().includes(filtroDescricao.toLowerCase()) &&
    (filtroStatus === "" || item.status === filtroStatus) // ✅ aplica filtro de status
  );

  const exportarParaExcel = () => {
    const dadosParaExportar = dadosFiltrados.map(item => ({
      EAN: item.ean,
      Descrição: item.descricao,
      Marca: item.marca,
      "Quantidade Estoque": item.quantidade,
      "Quantidade - WMS": item.quantidadeWMS,
      Status: item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Saldo Consolidado");

    XLSX.writeFile(workbook, "saldo-consolidado.xlsx");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📦 Saldo Consolidado</h2>

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
        {/* ✅ Lista suspensa para Status */}
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="Saldo OK">Saldo OK</option>
          <option value="Saldo WMS menor">Saldo WMS menor</option>
          <option value="Saldo WMS maior">Saldo WMS maior</option>
        </select>
        <button onClick={exportarParaExcel}>📥 Exportar</button>
      </div>

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
              <th>Quantidade - WMS</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dadosFiltrados.map((item, index) => (
              <tr key={index}>
                <td>{item.ean}</td>
                <td>{item.descricao}</td>
                <td>{item.marca}</td>
                <td>{item.quantidade}</td>
                <td>{item.quantidadeWMS}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}