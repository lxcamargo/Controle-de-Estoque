import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

const supabase = createClient(
  "https://hejiipyxvufhnzeyfhdd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlamlpcHl4dnVmaG56ZXlmaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjQxNTAsImV4cCI6MjA2ODk0MDE1MH0.fq4G4b7lQktCRreV_CLem06221ZuOlY-miaVilcqfGE"
);

function ListaPedidos() {
  const [pedidos, setPedidos] = useState([]);

  useEffect(() => {
    const carregarPedidos = async () => {
      const { data: pedidosData, error } = await supabase
        .from("pedidos")
        .select("ean, marca, descricao, saldo_loja, saldo_galpao, validade, quantidade");

      if (error) {
        alert("Erro ao buscar pedidos: " + error.message);
        return;
      }

      // Para cada pedido, calcular média semanal de vendas
      const pedidosComMedia = await Promise.all(
        pedidosData.map(async (pedido) => {
          const { data: historico } = await supabase
            .from("saida_loja_historico")
            .select("quantidade, data_saida")
            .eq("ean", pedido.ean);

          let mediaSemanal = 0;
          if (historico && historico.length > 0) {
            const vendasPorSemana = {};
            historico.forEach(h => {
              const data = new Date(h.data_saida);
              const ano = data.getFullYear();
              const semana = Math.ceil(
                ((data - new Date(ano, 0, 1)) / 86400000 + new Date(ano, 0, 1).getDay() + 1) / 7
              );
              const chave = `${ano}-W${semana}`;
              vendasPorSemana[chave] = (vendasPorSemana[chave] || 0) + h.quantidade;
            });

            const total = Object.values(vendasPorSemana).reduce((acc, v) => acc + v, 0);
            mediaSemanal = total / Object.keys(vendasPorSemana).length;
          }

          return { ...pedido, media_semanal: mediaSemanal.toFixed(2) };
        })
      );

      setPedidos(pedidosComMedia);
    };

    carregarPedidos();
  }, []);

  const exportarExcel = () => {
    const ws = XLSX.utils.json_to_sheet(pedidos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, "pedidos.xlsx");
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Lista de Pedidos</h2>
      <button onClick={exportarExcel} style={styles.button}>
        Exportar para Excel
      </button>
      {pedidos.length === 0 ? (
        <p>Nenhum pedido encontrado.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>EAN</th>
              <th style={styles.th}>Marca</th>
              <th style={styles.th}>Descrição</th>
              <th style={styles.th}>Saldo Loja</th>
              <th style={styles.th}>Saldo Galpão</th>
              <th style={styles.th}>Validade</th>
              <th style={styles.th}>Quantidade_Reposicão</th>
              <th style={styles.th}>Média Semanal Vendas</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido, idx) => (
              <tr key={idx}>
                <td style={styles.td}>{pedido.ean}</td>
                <td style={styles.td}>{pedido.marca}</td>
                <td style={styles.td}>{pedido.descricao}</td>
                <td style={styles.td}>{pedido.saldo_loja}</td>
                <td style={styles.td}>{pedido.saldo_galpao}</td>
                <td style={styles.td}>{pedido.validade}</td>
                <td style={styles.td}>{pedido.quantidade}</td>
                <td style={styles.td}>{pedido.media_semanal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "10px",
    maxWidth: "100%",
    fontFamily: "Arial, sans-serif"
  },
  title: {
    textAlign: "center",
    marginBottom: "15px"
  },
  button: {
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
    backgroundColor: "#4CAF50",
    color: "white"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse"
  },
  th: {
    border: "1px solid #999",
    padding: "8px",
    backgroundColor: "#f0f0f0",
    textAlign: "center"
  },
  td: {
    border: "1px solid #999",
    padding: "8px",
    textAlign: "center"
  }
};

export default ListaPedidos;
