import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function ContagemLoja() {
  const [ean, setEan] = useState("");
  const [produto, setProduto] = useState(null);
  const [validade, setValidade] = useState("");
  const [quantidade, setQuantidade] = useState("");

  // Buscar produto pelo EAN
  const buscarProduto = async () => {
    if (!ean) return;
    const { data, error } = await supabase
      .from("estoque_loja")
      .select("nome, marca, descricao")
      .eq("ean", ean)
      .single();

    if (error) {
      alert("Produto não encontrado!");
      setProduto(null);
    } else {
      setProduto(data);
    }
  };

  // Salvar contagem
  const salvarContagem = async () => {
    if (!ean || !validade || !quantidade) {
      alert("Preencha todos os campos!");
      return;
    }

    const { error } = await supabase.from("contagem_loja").insert({
      ean,
      descricao: produto?.descricao || "",
      marca: produto?.marca || "",
      validade,
      quantidade: parseInt(quantidade, 10),
      data_contagem: new Date().toISOString()
    });

    if (error) {
      alert("Erro ao salvar contagem!");
    } else {
      alert("Contagem salva com sucesso!");
      setEan("");
      setProduto(null);
      setValidade("");
      setQuantidade("");
    }
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>📱 Contagem de Estoque - Loja</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>EAN:</label>
        <input
          type="text"
          value={ean}
          onChange={(e) => setEan(e.target.value)}
          placeholder="Digite ou bipar EAN"
        />
        <button onClick={buscarProduto}>Buscar Produto</button>
      </div>

      {produto && (
        <div style={{ marginBottom: "1rem" }}>
          <p><strong>Nome:</strong> {produto.nome}</p>
          <p><strong>Marca:</strong> {produto.marca}</p>
          <p><strong>Descrição:</strong> {produto.descricao}</p>
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label>Validade:</label>
        <input
          type="date"
          value={validade}
          onChange={(e) => setValidade(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label>Quantidade:</label>
        <input
          type="number"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          placeholder="Digite a quantidade"
        />
      </div>

      <button onClick={salvarContagem} style={{ backgroundColor: "#4CAF50", color: "white", padding: "10px" }}>
        Salvar Contagem
      </button>
    </div>
  );
}