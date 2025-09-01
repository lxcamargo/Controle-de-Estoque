import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function HistoricoEntradas() {
  const [entradas, setEntradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [eanFiltro, setEanFiltro] = useState("");

  // 🔄 Carrega tudo inicialmente
  useEffect(() => {
    carregarDados();
  }, []);

  // 🔍 Recarrega ao mudar o EAN
  useEffect(() => {
    const delayBusca = setTimeout(() => {
      carregarDados(eanFiltro);
    }, 300); // pequeno delay para evitar múltiplas chamadas

    return () => clearTimeout(delayBusca);
  }, [eanFiltro]);

  const carregarDados = async (ean = "") => {
    setLoading(true);
    try {
      let query = supabase
        .from("entrada_historico_completo")
        .select("*")
        .order("data_entrada", { ascending: false });

      if (ean.trim() !== "") {
        query = query.eq("ean", ean.trim());
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntradas(data || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      setErro("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  const exportarHistoricoParaExcel = () => {
    if (!entradas || entradas.length === 0) {
      alert("Nenhum histórico de entrada para exportar.");
      return;
    }

    const dadosFormatados = entradas.map((item) => ({
      EAN: item.ean,
      Descrição: item.descricao,
      Marca: item.marca,
      Validade: item.validade
        ? new Date(item.validade + "T00:00:00").toLocaleDateString("pt-BR")
        : "—",
      "Data Entrada": item.data_entrada
        ? new Date(item.data_entrada).toLocaleString("pt-BR")
        : "—",
      Quantidade: item.quantidade,
      Lote: item.lote || "—",
      Usuário: item.usuario_email
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HistoricoEntradas");

    XLSX.writeFile(workbook, "historico_entradas.xlsx");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📋 Histórico de Entradas</h2>

      {/* 🔍 Campo de filtro por EAN */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Filtrar por EAN"
          value={eanFiltro}
          onChange={(e) => setEanFiltro(e.target.value)}
          style={{ padding: "0.5rem", width: "300px" }}
        />
      </div>

      {loading && <p>Carregando dados...</p>}
      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {!loading && !erro && entradas.length === 0 && (
        <p>Nenhuma entrada registrada até o momento.</p>
      )}

      {!loading && !erro && entradas.length > 0 && (
        <>
          <button onClick={exportarHistoricoParaExcel} style={{ marginBottom: "1rem" }}>
            📤 Exportar Histórico para Excel
          </button>

          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th>EAN</th>
                <th>Descrição</th>
                <th>Marca</th>
                <th>Validade</th>
                <th>Data Entrada</th>
                <th>Quantidade</th>
                <th>Lote</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((item, index) => (
                <tr key={index}>
                  <td>{item.ean}</td>
                  <td>{item.descricao}</td>
                  <td>{item.marca}</td>
                  <td>
                    {item.validade
                      ? new Date(item.validade + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td>
                    {item.data_entrada
                      ? new Date(item.data_entrada).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td>{item.quantidade}</td>
                  <td>{item.lote || "—"}</td>
                  <td>{item.usuario_email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}