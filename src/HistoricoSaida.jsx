import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';

const HistoricoSaida = () => {
  const [registros, setRegistros] = useState([]);
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [eanFiltro, setEanFiltro] = useState('');

  // ✅ Define o título da aba
  useEffect(() => {
    document.title = "Historico de Saida";
  }, []);

  useEffect(() => {
    const emailSalvo = localStorage.getItem("usuarioEmail");
    setUsuarioEmail(emailSalvo || "desconhecido@local");
    carregarHistorico();
  }, []);

  useEffect(() => {
    const delayBusca = setTimeout(() => {
      carregarHistorico(eanFiltro);
    }, 300);

    return () => clearTimeout(delayBusca);
  }, [eanFiltro]);

  const carregarHistorico = async (ean = "") => {
    try {
      const hoje = new Date();
      const limite = new Date();
      limite.setDate(hoje.getDate() - 15);

      let query = supabase
        .from("saida_historico")
        .select("*")
        .gte("data_saida", limite.toISOString())
        .lte("data_saida", hoje.toISOString())
        .order("data_saida", { ascending: false });

      if (ean.trim() !== "") {
        query = query.eq("ean", ean.trim());
      }

      const { data: saidaData, error: saidaError } = await query;

      if (saidaError) {
        console.error("❌ Erro ao carregar histórico de saída:", saidaError);
        return;
      }

      const registrosComDescricao = await Promise.all(
        saidaData.map(async (item) => {
          const validadeFormatada = item.validade
            ? item.validade.slice(0, 10).split("-").reverse().join("/")
            : "—";

          let descricao = "—";
          let marca = "—";

          if (item.ean) {
            const { data: produtoData } = await supabase
              .from("produto")
              .select("descricao, marca")
              .eq("ean", item.ean)
              .single();

            if (produtoData) {
              descricao = produtoData.descricao || "—";
              marca = produtoData.marca || "—";
            }
          }

          return {
            ...item,
            validade_formatada: validadeFormatada,
            descricao,
            marca
          };
        })
      );

      setRegistros(registrosComDescricao);
    } catch (err) {
      console.error("❌ Erro inesperado:", err);
    }
  };

  const exportarSaidaParaExcel = () => {
    if (!registros || registros.length === 0) {
      alert("Nenhum registro de saída para exportar.");
      return;
    }

    const dadosFormatados = registros.map((item) => ({
      EAN: item.ean,
      Descrição: item.descricao || "—",
      Marca: item.marca || "—",
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
      Validade: item.validade_formatada,
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

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Filtrar por EAN"
          value={eanFiltro}
          onChange={(e) => setEanFiltro(e.target.value)}
          style={{ padding: "0.5rem", width: "300px" }}
        />
      </div>

      {registros.length === 0 ? (
        <p>Nenhuma saída registrada ainda.</p>
      ) : (
        <>
          <button onClick={exportarSaidaParaExcel} style={{ marginBottom: "1rem" }}>
            📁 Exportar para Excel
          </button>

          <table style={tabelaStyle}>
            <thead style={{ backgroundColor: "#f0f0f0" }}>
              <tr>
                <th style={celulaStyle}>📦 EAN</th>
                <th style={celulaStyle}>📝 Descrição</th>
                <th style={celulaStyle}>🏷️ Marca</th>
                <th style={celulaStyle}>🔢 Quantidade</th>
                <th style={celulaStyle}>📦 Pedido</th>
                <th style={celulaStyle}>📅 Data</th>
                <th style={celulaStyle}>📆 Validade</th>
                <th style={celulaStyle}>👤 Usuário</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9f9f9"
                  }}
                >
                  <td style={celulaStyle}>{item.ean}</td>
                  <td style={celulaStyle}>{item.descricao}</td>
                  <td style={celulaStyle}>{item.marca}</td>
                  <td style={{ ...celulaStyle, textAlign: "center" }}>{item.quantidade}</td>
                  <td style={{ ...celulaStyle, textAlign: "center" }}>{item.lote || "-"}</td>
                  <td style={{ ...celulaStyle, textAlign: "center" }}>
                    {new Date(item.data_saida).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })}
                  </td>
                  <td style={{ ...celulaStyle, textAlign: "center" }}>{item.validade_formatada}</td>
                  <td style={celulaStyle}>{item.usuario_email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

const tabelaStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: "Arial, sans-serif",
  fontSize: "0.95rem",
  marginTop: "1rem"
};

const celulaStyle = {
  border: "1px solid #ccc",
  padding: "0.75rem",
  textAlign: "left"
};

export default HistoricoSaida;
