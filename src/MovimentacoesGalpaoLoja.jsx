import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const MovimentacoesGalpaoLoja = () => {
  const [registros, setRegistros] = useState([]);
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const [eanFiltro, setEanFiltro] = useState('');

  useEffect(() => {
    const emailSalvo = localStorage.getItem("usuarioEmail");
    setUsuarioEmail(emailSalvo || "desconhecido@local");
    carregarMovimentacoes();
  }, []);

  useEffect(() => {
    const delayBusca = setTimeout(() => {
      carregarMovimentacoes(eanFiltro);
    }, 300);

    return () => clearTimeout(delayBusca);
  }, [eanFiltro]);

  const carregarMovimentacoes = async (ean = "") => {
    try {
      let query = supabase
        .from("saida_historico")
        .select("*")
        .order("data_saida", { ascending: false });

      if (ean.trim() !== "") {
        query = query.eq("ean", ean.trim());
      }

      const { data: movimentacoesData, error } = await query;

      if (error) {
        console.error("❌ Erro ao carregar movimentações:", error);
        return;
      }

      console.log("📦 Dados recebidos:", movimentacoesData);

      const registrosComDescricao = await Promise.all(
        movimentacoesData.map(async (item) => {
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

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🔄 Movimentações Galpão → Loja</h2>
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
        <p style={{ color: "#999" }}>Nenhuma movimentação encontrada.</p>
      ) : (
        <table style={tabelaStyle}>
          <thead style={{ backgroundColor: "#f0f0f0" }}>
            <tr>
              <th style={celulaStyle}>📦 EAN</th>
              <th style={celulaStyle}>📝 Descrição</th>
              <th style={celulaStyle}>🏷️ Marca</th>
              <th style={celulaStyle}>🔢 Quantidade Transferida</th>
              <th style={celulaStyle}>📅 Data da Movimentação</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((item, index) => (
              <tr
                key={item.id || index}
                style={{
                  backgroundColor: index % 2 === 0 ? "#ffffff" : "#f9f9f9"
                }}
              >
                <td style={celulaStyle}>{item.ean}</td>
                <td style={celulaStyle}>{item.descricao}</td>
                <td style={celulaStyle}>{item.marca}</td>
                <td style={{ ...celulaStyle, textAlign: "center" }}>{item.quantidade}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
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

export default MovimentacoesGalpaoLoja;