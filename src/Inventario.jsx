import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const Inventario = () => {
  const [contagens, setContagens] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Ajuste de Inventário";
    carregarContagensPendentes();
  }, []);

  // 🔹 Busca contagens pendentes (ajustado = false ou null)
  const carregarContagensPendentes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contagens")
        .select(`
          id,
          ean,
          validade,
          quantidade,
          data,
          usuario_email,
          produto_id,
          produto:produto_id ( descricao, marca )
        `)
        .or("ajustado.eq.false,ajustado.is.null")
        .order("data", { ascending: false });

      if (error) throw error;
      setContagens(data || []);
    } catch (err) {
      console.error("Erro ao carregar contagens:", err);
      alert("Erro ao carregar contagens pendentes.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Função para formatar data para YYYY-MM-DD
  const formatarDataParaYYYYMMDD = (dataString) => {
    if (!dataString) return "";
    const parteData = dataString.split("T")[0];
    if (parteData.includes("/")) {
      const partes = parteData.split("/");
      if (partes.length === 3) {
        if (partes[0].length === 2 && partes[2].length === 4) {
          return `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
        }
        if (partes[0].length === 4) {
          return `${partes[0]}-${partes[1].padStart(2, "0")}-${partes[2].padStart(2, "0")}`;
        }
      }
    }
    return parteData;
  };

  // 🔹 Função principal: Ajustar Estoque
  const ajustarEstoqueItem = async (contagem) => {
    const confirmacao = window.confirm(
      `Deseja ajustar o estoque do EAN ${contagem.ean} (Validade: ${contagem.validade}) para a quantidade ${contagem.quantidade}?`
    );

    if (!confirmacao) return;

    try {
      const validadeFormatada = formatarDataParaYYYYMMDD(contagem.validade);
      const quantidadeContada = Number(contagem.quantidade);

      // 1️⃣ Verifica se já existe o registro desse EAN + Validade na tabela estoque
      const { data: estoqueExistente, error: erroEstoque } = await supabase
        .from("estoque")
        .select("id, quantidade")
        .eq("ean", contagem.ean)
        .eq("validade", validadeFormatada)
        .limit(1);

      if (erroEstoque) throw erroEstoque;

      if (estoqueExistente && estoqueExistente.length > 0) {
        // 2️⃣ SE JÁ EXISTE: SUBSTITUI a quantidade pela quantidade contada
        const itemEstoque = estoqueExistente[0];

        const { error: erroUpdate } = await supabase
          .from("estoque")
          .update({ quantidade: quantidadeContada })
          .eq("id", itemEstoque.id);

        if (erroUpdate) throw erroUpdate;
      } else {
        // 3️⃣ SE NÃO EXISTE: INSERE uma nova linha na tabela estoque
        const { error: erroInsert } = await supabase
          .from("estoque")
          .insert([
            {
              ean: contagem.ean,
              validade: validadeFormatada,
              quantidade: quantidadeContada,
              produto_id: contagem.produto_id
            }
          ]);

        if (erroInsert) throw erroInsert;
      }

      // 4️⃣ MARCA A CONTAGEM COMO AJUSTADA
      const { error: erroAjustarContagem } = await supabase
        .from("contagens")
        .update({ ajustado: true })
        .eq("id", contagem.id);

      if (erroAjustarContagem) throw erroAjustarContagem;

      alert("✅ Estoque ajustado com sucesso!");
      
      // Recarrega a lista removendo a contagem ajustada
      carregarContagensPendentes();
    } catch (err) {
      console.error("Erro ao ajustar estoque:", err);
      alert("Erro ao realizar o ajuste de estoque.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "900px", margin: "auto" }}>
      <h2>📋 Ajuste de Inventário</h2>

      {loading ? (
        <p>Carregando contagens pendentes...</p>
      ) : contagens.length === 0 ? (
        <p>Nenhuma contagem pendente de ajuste.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f2f2f2", textAlign: "left" }}>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>EAN</th>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Produto</th>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Validade</th>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Qtd Contada</th>
              <th style={{ padding: "8px", border: "1px solid #ddd" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contagens.map((item) => (
              <tr key={item.id}>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>{item.ean}</td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                  {item.produto?.descricao || "N/A"}
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                  {item.validade ? item.validade.split("-").reverse().join("/") : "Sem data"}
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd", fontWeight: "bold" }}>
                  {item.quantidade}
                </td>
                <td style={{ padding: "8px", border: "1px solid #ddd" }}>
                  <button
                    onClick={() => ajustarEstoqueItem(item)}
                    style={{
                      padding: "0.4rem 0.8rem",
                      backgroundColor: "#28a745",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    ⚙️ Ajustar Estoque
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Inventario;
