import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function AjustarInventario() {
  const [contagens, setContagens] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      const { data: contagemData, error: erroContagem } = await supabase
        .from("contagem_loja")
        .select("*"); // ✅ já inclui o campo usuario

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

          // ✅ Regra extra: se ainda não tiver descrição, tenta garantir pelo produto
          if (!descricao) {
            const { data: produtoInfo } = await supabase
              .from("produto")
              .select("descricao")
              .eq("ean", item.ean)
              .maybeSingle();

            if (produtoInfo) {
              descricao = produtoInfo.descricao;
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

          return {
            ...item,
            nome,
            marca,
            descricao,
            saldo: saldo ?? 0,
            status,
            usuario: item.usuario // ✅ garante que o usuário venha junto
          };
        })
      );

      setContagens(ajustado);
    };

    carregar();
  }, []);

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
            <th>Usuário</th>
            <th>Data/Hora Contagem</th>
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
              <td>{item.usuario}</td> {/* ✅ mostra o usuário corretamente */}
              <td>{new Date(item.data_contagem).toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}