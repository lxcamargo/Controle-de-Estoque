import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function HistoricoContagens() {
  const [contagens, setContagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [eanFiltro, setEanFiltro] = useState("");

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    const delayBusca = setTimeout(() => {
      carregarDados(eanFiltro);
    }, 300);

    return () => clearTimeout(delayBusca);
  }, [eanFiltro]);

  const carregarDados = async (ean = "") => {
    setLoading(true);
    try {
      let query = supabase
        .from("contagens")
        .select("*")
        .order("data", { ascending: false });

      if (ean.trim() !== "") {
        query = query.eq("ean", ean.trim());
      }

      const { data, error } = await query;

      if (error) throw error;
      setContagens(data || []);
    } catch (err) {
      console.error("Erro ao carregar contagens:", err);
      setErro("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  };

  const exportarHistoricoParaExcel = () => {
    if (!contagens || contagens.length === 0) {
      alert("Nenhum histórico de contagem para exportar.");
      return;
    }

    const dadosFormatados = contagens.map((item) => ({
      EAN: item.ean,
      Nome: item.nome,
      Marca: item.marca,
      Validade: item.validade
        ? new Date(item.validade + "T00:00:00").toLocaleDateString("pt-BR")
        : "—",
      "Data Contagem": item.data
        ? new Date(item.data).toLocaleString("pt-BR")
        : "—",
      Quantidade: item.quantidade,
      Usuário: item.usuario_id || "—"
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HistoricoContagens");

    XLSX.writeFile(workbook, "historico_contagens.xlsx");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📋 Histórico de Contagens</h2>

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

      {!loading && !erro && contagens.length === 0 && (
        <p>Nenhuma contagem registrada até o momento.</p>
      )}

      {!loading && !erro && contagens.length > 0 && (
        <>
          <button onClick={exportarHistoricoParaExcel} style={{ marginBottom: "1rem" }}>
            📤 Exportar Histórico para Excel
          </button>

          <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th>EAN</th>
                <th>Nome</th>
                <th>Marca</th>
                <th>Validade</th>
                <th>Data Contagem</th>
                <th>Quantidade</th>
                <th>Usuário</th>
              </tr>
            </thead>
            <tbody>
              {contagens.map((item, index) => (
                <tr key={index}>
                  <td>{item.ean}</td>
                  <td>{item.nome}</td>
                  <td>{item.marca}</td>
                  <td>
                    {item.validade
                      ? new Date(item.validade + "T00:00:00").toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td>
                    {item.data
                      ? new Date(item.data).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td>{item.quantidade}</td>
                  <td>{item.usuario_id || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}