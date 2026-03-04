import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export default function AjustarInventario() {
  const [contagens, setContagens] = useState([]);

  useEffect(() => {
    const carregar = async () => {
      // Busca todas as contagens feitas
      const { data: contagemData } = await supabase
        .from("contagem_loja")
        .select("*");

      // Para cada contagem, busca saldo atual na tabela estoque_loja
      const ajustado = await Promise.all(
        contagemData.map(async item => {
          const { data: loja } = await supabase
            .from("estoque_loja")
            .select("quantidade")
            .eq("ean", item.ean)
            .single();

          const saldo = loja?.quantidade || 0;
          let status = "Igual";
          if (item.quantidade > saldo) status = "Maior";
          else if (item.quantidade < saldo) status = "Menor";

          return { ...item, saldo, status };
        })
      );

      setContagens(ajustado);
    };

    carregar();
  }, []);

  const ajustarSaldo = async (ean, quantidade) => {
    await supabase
      .from("estoque_loja")
      .update({ quantidade })
      .eq("ean", ean);

    alert("Saldo ajustado com sucesso!");
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>🛠️ Ajustar Inventário</h2>
      <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#f0f0f0" }}>
          <tr>
            <th>EAN</th>
            <th>Descrição</th>
            <th>Marca</th>
            <th>Validade</th>
            <th>Quantidade</th>
            <th>Saldo</th>
            <th>Status</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          {contagens.map((item, i) => (
            <tr key={i}>
              <td>{item.ean}</td>
              <td>{item.descricao}</td>
              <td>{item.marca}</td>
              <td>{item.validade}</td>
              <td>{item.quantidade}</td>
              <td>{item.saldo}</td>
              <td style={{
                color: item.status === "Maior" ? "orange" :
                       item.status === "Menor" ? "red" : "green",
                fontWeight: "bold"
              }}>
                {item.status}
              </td>
              <td>
                <button onClick={() => ajustarSaldo(item.ean, item.quantidade)}>
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