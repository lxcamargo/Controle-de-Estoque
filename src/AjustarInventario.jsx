import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function AjustarInventario() {
  const [contagens, setContagens] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      const { data: contagemData, error: erroContagem } = await supabase
        .from("contagem_loja")
        .select("*");

      if (erroContagem) {
        console.error("Erro ao carregar contagens:", erroContagem);
        return;
      }

      const ajustado = await Promise.all(
        (contagemData || []).map(async item => {
          let nome = item.nome;
          let marca = item.marca;
          let descricao = item.descricao;

          // ✅ Se não tiver nome/descricao, busca na tabela produto
          if (!nome || !descricao) {
            const { data: produtoData } = await supabase
              .from("produto")
              .select("nome, marca, descricao")
              .eq("ean", item.ean)
              .maybeSingle();

            if (produtoData) {
              nome = produtoData.nome;
              marca = produtoData.marca;
              descricao = produtoData.descricao;
            }
          }

          // Busca saldo atual no estoque
          const { data: estoqueData } = await supabase
            .from("estoque_loja")
            .select("quantidade")
            .eq("ean", item.ean)
            .eq("validade", item.validade)
            .maybeSingle();

          const saldo = estoqueData?.quantidade ?? null;
          let status;
          if (saldo === null) {
            status = "Novo";
          } else if (item.quantidade > saldo) {
            status = "Maior";
          } else if (item.quantidade < saldo) {
            status = "Menor";
          } else {
            status = "Igual";
          }

          return { ...item, nome, marca, descricao, saldo: saldo ?? 0, status };
        })
      );

      setContagens(ajustado);
    };

    carregar();
  }, []);

  const ajustarSaldo = async (ean, quantidade, validade, nome, marca, descricao, status, id) => {
    if (status === "Novo") {
      const { error } = await supabase
        .from("estoque_loja")
        .insert({
          ean,
          validade,
          quantidade,
          nome: nome || descricao,
          marca,
          descricao
        });

      if (error) {
        console.error("Erro ao inserir estoque:", error);
        alert("Erro ao inserir estoque!");
        return;
      }
    } else if (status === "Maior" || status === "Menor") {
      const { error } = await supabase
        .from("estoque_loja")
        .update({ quantidade })
        .eq("ean", ean)
        .eq("validade", validade);

      if (error) {
        console.error("Erro ao atualizar estoque:", error);
        alert("Erro ao atualizar estoque!");
        return;
      }
    }

    // ✅ Remove também da tabela contagem_loja
    const { error: erroDelete } = await supabase
      .from("contagem_loja")
      .delete()
      .eq("id", id);

    if (erroDelete) {
      console.error("Erro ao apagar contagem:", erroDelete);
    }

    // Remove da tela
    setContagens(prev => prev.filter(item => item.id !== id));

    alert("Saldo ajustado com sucesso!");
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>🛠️ Ajustar Inventário</h2>
      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#f0f0f0" }}>
          <tr>
            <th>EAN</th>
            <th>Nome</th>
            <th>Marca</th>
            <th>Descrição</th>
            <th>Validade</th>
            <th>Quantidade Contada</th>
            <th>Saldo Estoque</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {contagens.map((item, i) => (
            <tr key={i}>
              <td>{item.ean}</td>
              <td>{item.nome || item.descricao}</td>
              <td>{item.marca}</td>
              <td>{item.descricao}</td>
              <td>{item.validade}</td>
              <td>{item.quantidade}</td>
              <td>{item.saldo}</td>
              <td
                style={{
                  color:
                    item.status === "Novo"
                      ? "blue"
                      : item.status === "Maior"
                      ? "orange"
                      : item.status === "Menor"
                      ? "red"
                      : "green",
                  fontWeight: "bold"
                }}
              >
                {item.status}
              </td>
              <td>
                <button
                  onClick={() =>
                    ajustarSaldo(
                      item.ean,
                      item.quantidade,
                      item.validade,
                      item.nome,
                      item.marca,
                      item.descricao,
                      item.status,
                      item.id
                    )
                  }
                >
                  Ajustar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}