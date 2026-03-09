import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const EditarProduto = () => {
  const { id } = useParams(); // id_produto vindo da URL
  const navigate = useNavigate();
  const [produto, setProduto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarPopup, setMostrarPopup] = useState(false); // novo estado para popup

  // Campos editáveis
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [ean, setEan] = useState("");

  useEffect(() => {
    const buscarProduto = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("produto")
        .select("*")
        .eq("id_produto", id)
        .single();

      if (error) {
        console.error("Erro ao buscar produto:", error);
      } else {
        setProduto(data);
        setDescricao(data.descricao || "");
        setMarca(data.marca || "");
        setEan(data.ean || "");
      }

      setLoading(false);
    };

    buscarProduto();
  }, [id]);

  const salvarAlteracoes = async () => {
    const camposAtualizados = {};

    if (descricao !== produto.descricao) camposAtualizados.descricao = descricao;
    if (marca !== produto.marca) camposAtualizados.marca = marca;
    if (ean !== produto.ean) camposAtualizados.ean = ean;

    if (Object.keys(camposAtualizados).length === 0) {
      alert("Nenhuma alteração detectada.");
      return;
    }

    const { error } = await supabase
      .from("produto")
      .update(camposAtualizados)
      .eq("id_produto", id);

    if (error) {
      alert("Erro ao salvar alterações.");
      console.error(error);
    } else {
      setMostrarPopup(true); // exibe popup de sucesso
    }
  };

  const fecharPopup = () => {
    setMostrarPopup(false);
    navigate("/produtos-cadastrados"); // ✅ redireciona após confirmação
  };

  if (loading) return <p>🔄 Carregando produto...</p>;
  if (!produto) return <p>❌ Produto não encontrado.</p>;

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      <h2>✏️ Editar Produto</h2>

      <label style={labelStyle}>Descrição:</label>
      <input
        type="text"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>Marca:</label>
      <input
        type="text"
        value={marca}
        onChange={(e) => setMarca(e.target.value)}
        style={inputStyle}
      />

      <label style={labelStyle}>EAN:</label>
      <input
        type="text"
        value={ean}
        onChange={(e) => setEan(e.target.value)}
        style={inputStyle}
      />

      <button onClick={salvarAlteracoes} style={buttonStyle}>
        💾 Salvar
      </button>

      {mostrarPopup && (
        <div style={popupOverlay}>
          <div style={popupBox}>
            <p>✅ Alteração feita com sucesso!</p>
            <button onClick={fecharPopup} style={popupButton}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const labelStyle = {
  display: "block",
  marginTop: "1rem",
  marginBottom: "0.5rem",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "0.5rem",
  fontSize: "1rem",
  marginBottom: "1rem",
};

const buttonStyle = {
  padding: "0.75rem 1.5rem",
  fontSize: "1rem",
  backgroundColor: "#4CAF50",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

const popupOverlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
};

const popupBox = {
  backgroundColor: "#fff",
  padding: "2rem",
  borderRadius: "8px",
  textAlign: "center",
  boxShadow: "0 0 10px rgba(0,0,0,0.3)",
};

const popupButton = {
  marginTop: "1rem",
  padding: "0.5rem 1.5rem",
  fontSize: "1rem",
  backgroundColor: "#4CAF50",
  color: "#fff",
  border: "none",
  cursor: "pointer",
};

export default EditarProduto;