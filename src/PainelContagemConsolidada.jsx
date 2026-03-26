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
    const { data, error } = await supabase
      .from("contagem_consolidada")
      .select("ean, descricao, marca, validade, quantidade_total")
      .order("validade", { ascending: true });

    if (error) {
      setErro("Erro ao carregar dados.");
      setContagens([]);
    } else {
      setContagens(data || []);
      setErro(null);
    }
  };

  const ajustarEstoque = async (ean, validade, quantidade, nome, marca) => {
    const validadeISO = new Date(validade).toISOString().split("T")[0];
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
      // Atualiza saldo
      const { error: erroUpdate } = await supabase
        .from("estoque_loja")
        .update({
          quantidade: qtd,
          nome,   // atualiza descrição
          marca,  // atualiza marca
        })
        .eq("ean", ean)
        .eq("validade", validadeISO);
      error = erroUpdate;
    } else {
      // Insere novo registro
      const { error: erroInsert } = await supabase
        .from("estoque_loja")
        .insert({
          ean,
          nome,              // descrição
          marca,             // marca
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
      alert("Estoque ajustado com sucesso!");
      setContagens((prev) =>
        prev.filter((item) => !(item.ean === ean && item.validade === validade))
      );
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📊 Painel de Contagem Consolidada</h2>
      <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>
        Exibe as contagens consolidadas por EAN e validade.
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
                  {new Date(item.validade).toLocaleDateString("pt-BR")}
                </td>
                <td style={{ textAlign: "center" }}>{item.quantidade_total}</td>
                <td style={{ textAlign: "center" }}>
                  <button
                    onClick={() =>
                      ajustarEstoque(
                        item.ean,
                        item.validade,
                        item.quantidade_total,
                        item.descricao, // passa como nome
                        item.marca       // passa marca
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