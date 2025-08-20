import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx'; // ✅ Nova importação

const HistoricoSaida = () => {
  const [registros, setRegistros] = useState([]);
  const [usuarioEmail, setUsuarioEmail] = useState('');

  useEffect(() => {
    const emailSalvo = localStorage.getItem("usuarioEmail");
    setUsuarioEmail(emailSalvo || "desconhecido@local");

    const carregarHistorico = async () => {
      const { data, error } = await supabase
        .from("saida_historico")
        .select("*")
        .order("data_saida", { ascending: false });

      if (error) {
        console.error("❌ Erro ao carregar histórico de saída:", error);
        return;
      }

      setRegistros(data);
    };

    carregarHistorico();
  }, []);

  // ✅ Função de exportação
  const exportarSaidaParaExcel = () => {
    if (!registros || registros.length === 0) {
      alert("Nenhum registro de saída para exportar.");
      return;
    }

    const dadosFormatados = registros.map((item) => ({
      EAN: item.ean,
      Quantidade: item.quantidade,
      Lote: item.lote || "-",
      "Data Saída": new Date(item.data_saida).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      Usuário: item.usuario_email
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosFormatados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "HistoricoSaida");

    XLSX.writeFile(workbook, "historico_saida.xlsx");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📤 Histórico de Saída de Produtos</h2>
      <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>
        Usuário logado: {usuarioEmail}
      </p>

      {registros.length === 0 ? (
        <p>Nenhuma saída registrada ainda.</p>
      ) : (
        <>
          <button onClick={exportarSaidaParaExcel} style={{ marginBottom: "1rem" }}>
            📁 Exportar para Excel
          </button>

          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontFamily: "Arial, sans-serif",
            fontSize: "0.95rem",
            marginTop: "1rem"
          }}>
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>📦 EAN</th>
                <th style={{ padding: "0.75rem", textAlign: "center" }}>🔢 Quantidade</th>
                <th style={{ padding: "0.75rem", textAlign: "center" }}>🏷️ Lote</th>
                <th style={{ padding: "0.75rem", textAlign: "center" }}>📅 Data</th>
                <th style={{ padding: "0.75rem", textAlign: "left" }}>👤 Usuário</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9f9f9",
                    borderBottom: "1px solid #ddd"
                  }}
                >
                  <td style={{ padding: "0.75rem" }}>{item.ean}</td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>{item.quantidade}</td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>{item.lote || "-"}</td>
                  <td style={{ padding: "0.75rem", textAlign: "center" }}>
                    {new Date(item.data_saida).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })}
                  </td>
                  <td style={{ padding: "0.75rem" }}>{item.usuario_email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default HistoricoSaida;