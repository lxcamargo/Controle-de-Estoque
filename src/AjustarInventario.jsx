import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function AjustarInventario() {
  const [contagens, setContagens] = useState([]);
  const [filtroEAN, setFiltroEAN] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");

  const carregar = async () => {
    let query = supabase.from("contagem_loja").select("*");

    if (filtroEAN) query = query.ilike("ean", `%${filtroEAN}%`);
    if (filtroMarca) query = query.ilike("marca", `%${filtroMarca}%`);
    if (filtroDescricao) query = query.ilike("descricao", `%${filtroDescricao}%`);
    if (filtroUsuario) query = query.ilike("usuario", `%${filtroUsuario}%`);

    const { data: contagemData, error: erroContagem } = await query;

    if (erroContagem) {
      console.error("Erro ao carregar contagens:", erroContagem);
      return;
    }

    const ajustado = await Promise.all(
      (contagemData || []).map(async item => {
        let nome = item.nome;
        let marca = item.marca;
        let descricao = item.descricao;

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
          usuario: item.usuario
        };
      })
    );

    setContagens(ajustado);
  };

  useEffect(() => {
    carregar();
  }, []);

  // Função para exportar para Excel
  const exportarExcel = () => {
    const dadosExport = contagens.map(item => ({
      EAN: item.ean,
      Nome: item.nome || item.descricao,
      Marca: item.marca,
      Descrição: item.descricao,
      Validade: item.validade,
      "Quantidade Contada": item.quantidade,
      "Saldo Estoque": item.saldo,
      Status: item.status,
      Usuário: item.usuario,
      "Data/Hora Contagem": new Date(item.data_contagem).toLocaleString("pt-BR")
    }));

    const ws = XLSX.utils.json_to_sheet(dadosExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventário");
    XLSX.writeFile(wb, "ajuste_inventario.xlsx");
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>🛠️ Ajustar Inventário</h2>

      {/* Campos de pesquisa */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Pesquisar por EAN"
          value={filtroEAN}
          onChange={(e) => setFiltroEAN(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <input
          type="text"
          placeholder="Pesquisar por Marca"
          value={filtroMarca}
          onChange={(e) => setFiltroMarca(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <input
          type="text"
          placeholder="Pesquisar por Descrição"
          value={filtroDescricao}
          onChange={(e) => setFiltroDescricao(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <input
          type="text"
          placeholder="Pesquisar por Usuário"
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          style={{ marginRight: "0.5rem" }}
        />
        <button
          onClick={carregar}
          style={{
            padding: "0.4rem 0.8rem",
            backgroundColor: "#2196f3",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "0.5rem"
          }}
        >
          🔍 Pesquisar
        </button>
        <button
          onClick={exportarExcel}
          style={{
            padding: "0.4rem 0.8rem",
            backgroundColor: "#4caf50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          📤 Exportar Excel
        </button>
      </div>

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
              <td>{item.usuario}</td>
              <td>{new Date(item.data_contagem).toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
