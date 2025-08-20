import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

export default function CadastroDinamico() {
  const location = useLocation();
  const navigate = useNavigate();
  const eanRecebido = location.state?.ean || "";

  const [ean, setEan] = useState(eanRecebido);
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [mensagem, setMensagem] = useState("");

  const cadastrarProduto = async () => {
    if (!ean || !descricao || !marca) {
      alert("Preencha todos os campos.");
      return;
    }

    try {
      const { error } = await supabase
        .from("produto")
        .insert([
          {
            ean: ean.trim(),
            descricao: descricao.trim(),
            marca: marca.trim()
          }
        ]);

      if (error) {
        console.error("❌ Erro ao cadastrar produto:", error);
        alert("Não foi possível cadastrar o produto.");
      } else {
        setMensagem("✅ Produto cadastrado com sucesso!");
        setTimeout(() => navigate("/entrada-produto"), 1500);
      }
    } catch (err) {
      console.error("❌ Erro inesperado:", err);
      alert("Erro inesperado ao cadastrar produto.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "500px", margin: "0 auto" }}>
      <h2>📝 Cadastro Manual de Produto</h2>

      <input
        type="text"
        placeholder="EAN"
        value={ean}
        onChange={(e) => setEan(e.target.value)}
        style={{ marginBottom: "1rem", width: "100%" }}
      />
      <input
        type="text"
        placeholder="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        style={{ marginBottom: "1rem", width: "100%" }}
      />
      <input
        type="text"
        placeholder="Marca"
        value={marca}
        onChange={(e) => setMarca(e.target.value)}
        style={{ marginBottom: "1rem", width: "100%" }}
      />
      <button onClick={cadastrarProduto}>Cadastrar Produto</button>

      {mensagem && (
        <p style={{ marginTop: "1rem", color: "green", fontWeight: "bold" }}>
          {mensagem}
        </p>
      )}
    </div>
  );
}