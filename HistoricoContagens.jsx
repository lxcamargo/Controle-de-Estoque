import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function HistoricoContagens() {
  const [contagens, setContagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [eanFiltro, setEanFiltro] = useState("");

  // ✅ Define o título da aba do navegador
  useEffect(() => {
    document.title = "Histórico de Contagem";
  }, []);

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
      // 🔥 Exclui contagens ajustadas do banco
      await supabase.from("contagens").delete().eq("ajustado", true);

      let query = supabase
        .from("contagens")
        .select(`
          ean,
          validade,
          quantidade,
          data,
          usuario_email,
          ajustado,
          produto:produto_id (
            descricao,
            marca
          )
        `)
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
      Nome: item.produto?.descricao || "—",
      Marca: item.produto?.marca || "—",
      Validade: item.validade
        ? new Date(item.validade + "T00:00:00").toLocaleDateString("pt-BR")
        : "—",
      "Data Contagem": item.data
        ? new Date(item.data).toLocaleString("pt-BR")
        : "—",
      Quantidade: item.quantidade,
      Usuário: item.usuario_email || "—",
      Ajustado: item.ajustado ? "Sim" : "Não",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HistoricoContagens");

    XLSX.writeFile(workbook, "historico_contagens.xlsx");
  };

  const totaisEmAberto = Object.values(
    contagens.reduce((acc, item) => {
      const chave = `${item.ean}_${item.validade}`;
      if (!acc[chave]) {
        acc[chave] = {
          ean: item.ean,
          validade: item.validade,
          descricao: item.produto?.descricao || "—",
          marca: item.produto?.marca || "—",
          quantidade: 0,
        };
      }
      acc[chave].quantidade += item.quantidade;
      return acc;
    }, {})
  );

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
          <button
            onClick={exportarHistoricoParaExcel}
            style={{
              marginBottom: "1rem",
              padding: "0.5rem 1rem",
              backgroundColor: "#007BFF",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            📤 Exportar Histórico para Excel
          </button>

          <table
            border="1"
            cellPadding="8"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "2rem",
            }}
          >
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th>EAN</th>
                <th>Nome</th>
                <th>Marca</th>
                <th>Validade</th>
                <th>Data Contagem</th>
                <th>Quantidade</th>
                <th>Usuário</th>
                <th>Ajustado</th>
              </tr>
            </thead>
            <tbody>
              {contagens.map((item, index) => (
                <tr key={index}>
                  <td>{item.ean}</td>
                  <td>{item.produto?.descricao || "—"}</td>
                  <td>{item.produto?.marca || "—"}</td>
                  <td>
                    {item.validade
                      ? new Date(
                          item.validade + "T00:00:00"
                        ).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td>
                    {item.data
                      ? new Date(item.data).toLocaleString("pt-BR")
                      : "—"}
                  </td>
                  <td>{item.quantidade}</td>
                  <td>{item.usuario_email || "—"}</td>
                  <td style={{ textAlign: "center" }}>
                    {item.ajustado ? "✅" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>📊 Totais em aberto por item</h3>
          <table
            border="1"
            cellPadding="8"
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th>EAN</th>
                <th>Validade</th>
                <th>Nome</th>
                <th>Marca</th>
                <th>Quantidade em aberto</th>
              </tr>
            </thead>
            <tbody>
              {totaisEmAberto.map((item, index) => (
                <tr key={index}>
                  <td>{item.ean}</td>
                  <td>{item.validade}</td>
                  <td>{item.descricao}</td>
                  <td>{item.marca}</td>
                  <td>{item.quantidade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
