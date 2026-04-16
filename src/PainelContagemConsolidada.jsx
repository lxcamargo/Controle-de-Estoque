import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function PainelContagemConsolidada() {
  const [contagens, setContagens] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    document.title = "Painel de Contagem Consolidada";
    carregarDados();
  }, []);

  const carregarDados = async () => {
    // Busca as contagens consolidadas
    const { data, error } = await supabase
      .from("contagem_consolidada")
      .select("ean, descricao, marca, validade, quantidade_total")
      .order("validade", { ascending: true });

    if (error) {
      setErro("Erro ao carregar dados.");
      setContagens([]);
    } else {
      // Para cada item consolidado, busca o saldo atual em estoque_loja (comparando por ean + validade)
      const dadosComSaldo = await Promise.all(
        (data || []).map(async (item) => {
          const validadeISO =
            typeof item.validade === "string"
              ? item.validade
              : new Date(item.validade + "T00:00:00").toISOString().split("T")[0];

          const { data: estoque, error: erroEstoque } = await supabase
            .from("estoque_loja")
            .select("quantidade")
            .eq("ean", item.ean)
            .eq("validade", validadeISO)
            .maybeSingle();

          return {
            ...item,
            saldo_atual: erroEstoque ? 0 : estoque?.quantidade || 0,
          };
        })
      );

      setContagens(dadosComSaldo);
      setErro(null);
    }
  };

  const ajustarEstoque = async (ean, validade, quantidade, nome, marca) => {
    const validadeISO =
      typeof validade === "string"
        ? validade
        : new Date(validade + "T00:00:00").toISOString().split("T")[0];

    const qtd = parseInt(quantidade, 10);

    const { data: existente, error: erroBusca } = await supabase
      .from("estoque_loja")
      .select("ean, validade")
      .eq("ean", ean)
      .eq("validade", validadeISO)
      .maybeSingle();

    if (erroBusca) {
      alert("Erro ao verificar estoque!");
      console.error(erroBusca);
      return;
    }

    let error;
    if (existente) {
      const { error: erroUpdate } = await supabase
        .from("estoque_loja")
        .update({
          quantidade: qtd,
          nome,
          marca,
        })
        .eq("ean", ean)
        .eq("validade", validadeISO);
      error = erroUpdate;
    } else {
      const { error: erroInsert } = await supabase
        .from("estoque_loja")
        .insert({
          ean,
          nome,
          marca,
          validade: validadeISO,
          quantidade: qtd,
          criado_em: new Date().toISOString(),
        });
      error = erroInsert;
    }

    if (error) {
      alert("Erro ao ajustar estoque!");
      console.error(error);
    } else {
      // ✅ Remove o item da tabela contagem_consolidada
      const { error: erroDelete } = await supabase
        .from("contagem_consolidada")
        .delete()
        .eq("ean", ean)
        .eq("validade", validadeISO);

      if (erroDelete) {
        console.error("Erro ao remover da contagem_consolidada:", erroDelete);
      }

      alert("Estoque ajustado com sucesso!");
      // ✅ Remove também da tela imediatamente
      setContagens((prev) =>
        prev.filter(
          (item) =>
            !(
              item.ean === ean &&
              (typeof item.validade === "string"
                ? item.validade
                : new Date(item.validade + "T00:00:00").toISOString().split("T")[0]) === validadeISO
            )
        )
      );
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📊 Painel de Contagem Consolidada</h2>
      <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>
        Exibe as contagens consolidadas por EAN e validade, comparando saldo atual com contagem.
      </p>

      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {contagens.length === 0 ? (
        <p>Nenhuma contagem consolidada encontrada.</p>
      ) : (
        <table
          border="1"
          cellPadding="8"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
          }}
        >
          <thead style={{ backgroundColor: "#f0f0f0" }}>
            <tr>
              <th style={{ width: "10%" }}>EAN</th>
              <th style={{ width: "25%", textAlign: "left" }}>Descrição</th>
              <th style={{ width: "15%" }}>Marca</th>
              <th style={{ width: "15%" }}>Validade</th>
              <th style={{ width: "10%" }}>Saldo Atual</th>
              <th style={{ width: "10%" }}>Qtd Consolidada</th>
              <th style={{ width: "10%" }}>Ajuste</th>
            </tr>
          </thead>
          <tbody>
            {contagens.map((item, index) => (
              <tr key={index}>
                <td>{item.ean}</td>
                <td style={{ textAlign: "left" }}>{item.descricao}</td>
                <td>{item.marca}</td>
                <td style={{ textAlign: "center" }}>
                  {typeof item.validade === "string"
                    ? new Date(item.validade + "T00:00:00").toLocaleDateString("pt-BR")
                    : new Date(item.validade).toLocaleDateString("pt-BR")}
                </td>
                <td style={{ textAlign: "center" }}>{item.saldo_atual}</td>
                <td style={{ textAlign: "center" }}>{item.quantidade_total}</td>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() =>
                      ajustarEstoque(
                        item.ean,
                        item.validade,
                        item.quantidade_total,
                        item.descricao,
                        item.marca
                      )
                    }
                    style={{
                      padding: "0.4rem 0.8rem",
                      backgroundColor: "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    Ajustar Estoque
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
