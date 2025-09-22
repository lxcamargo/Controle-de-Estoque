import { useEffect, useState } from "react";
import ScannerInventario from "./ScannerInventario";
import { supabase } from "./supabaseClient";

const TelaContagem = () => {
  const [ean, setEan] = useState("");
  const [descricao, setDescricao] = useState("");
  const [marca, setMarca] = useState("");
  const [validade, setValidade] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [validades, setValidades] = useState([]);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  useEffect(() => {
    const emailLocal = localStorage.getItem("usuarioEmail");
    if (emailLocal) {
      setUsuarioEmail(emailLocal);
    } else {
      console.error("Email do usuário não encontrado no localStorage.");
    }
  }, []);

  const buscarProdutoPorEAN = async () => {
    const eanLimpo = ean.replace(/[^\d]/g, "");
    if (!eanLimpo) {
      alert("Digite um EAN válido.");
      return;
    }

    try {
      const { data: produtos, error: erroProduto } = await supabase
        .from("produto")
        .select("id_produto, descricao, marca")
        .eq("ean", eanLimpo);

      if (erroProduto || !produtos || produtos.length === 0) {
        alert("Produto não encontrado na tabela 'produto'.");
        return;
      }

      const produto = produtos[0];
      setDescricao(produto.descricao);
      setMarca(produto.marca);
      setProdutoId(produto.id_produto);

      const { data: estoques, error: erroEstoque } = await supabase
        .from("estoque")
        .select("validade")
        .eq("ean", eanLimpo)
        .gt("quantidade", 0);

      if (erroEstoque) {
        console.error("Erro ao buscar validades:", erroEstoque);
        return;
      }

      const validadesUnicas = Array.from(
        new Set(
          estoques
            .map((item) => item.validade?.slice(0, 10))
            .filter(Boolean)
        )
      );

      setValidades(validadesUnicas);
      setValidade(validadesUnicas.length === 1 ? validadesUnicas[0] : "");
    } catch (err) {
      console.error("Erro ao buscar produto:", err);
      alert("Erro inesperado ao buscar produto.");
    }
  };

  const registrarContagem = async () => {
    const quantidadeNum = Number(quantidade);
    const validadeFormatada = validade?.slice(0, 10);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const produtoIdValido = uuidRegex.test(produtoId);

    if (
      !ean?.trim() ||
      !validadeFormatada ||
      !usuarioEmail?.trim() ||
      !produtoIdValido ||
      isNaN(quantidadeNum) ||
      quantidadeNum <= 0
    ) {
      alert("Preencha todos os campos corretamente antes de registrar.");
      return;
    }

    try {
      const { data: existente, error: erroBusca } = await supabase
        .from("contagens")
        .select("id, quantidade")
        .eq("ean", ean)
        .eq("validade", validadeFormatada)
        .eq("produto_id", produtoId)
        .eq("usuario_email", usuarioEmail)
        .limit(1);

      if (erroBusca) throw erroBusca;

      if (existente && existente.length > 0) {
        const contagemExistente = existente[0];
        const novaQuantidade = contagemExistente.quantidade + quantidadeNum;

        const { error: erroUpdate } = await supabase
          .from("contagens")
          .update({ quantidade: novaQuantidade })
          .eq("id", contagemExistente.id);

        if (erroUpdate) throw erroUpdate;

        setMensagemSucesso("🔁 Contagem atualizada com sucesso!");
      } else {
        const dadosContagem = {
          ean,
          validade: validadeFormatada,
          quantidade: quantidadeNum,
          data: new Date().toISOString(),
          usuario_email: usuarioEmail,
          produto_id: produtoId
        };

        const { error: erroInsert } = await supabase
          .from("contagens")
          .insert([dadosContagem]);

        if (erroInsert) throw erroInsert;

        setMensagemSucesso("✅ Contagem registrada com sucesso!");
      }

      setEan("");
      setDescricao("");
      setMarca("");
      setValidade("");
      setQuantidade("");
      setValidades([]);
      setProdutoId("");

      setTimeout(() => {
        setMensagemSucesso("");
      }, 3000);
    } catch (err) {
      console.error("Erro ao registrar contagem:", err);
      alert("Erro ao registrar contagem.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "auto" }}>
      <h2>📦 Contagem de Estoque</h2>

      {usuarioEmail && (
        <p><strong>Usuário logado:</strong> {usuarioEmail}</p>
      )}

      <ScannerInventario
        usuarioId="scanner"
        onProdutoSelecionado={({ ean, descricao, marca, validade, validades }) => {
          setEan(ean);
          setDescricao(descricao);
          setMarca(marca);
          setValidade(validade);
          setValidades(validades);
        }}
      />

      <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
        <label>
          <strong>EAN manual:</strong>
          <input
            type="text"
            value={ean}
            onChange={(e) => setEan(e.target.value)}
            style={{ marginLeft: "1rem", width: "200px" }}
          />
        </label>
        <button
          onClick={buscarProdutoPorEAN}
          style={{
            marginLeft: "1rem",
            padding: "0.5rem 1rem",
            backgroundColor: "#007BFF",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          🔍 Buscar Produto
        </button>
      </div>

      {(descricao || marca || validades.length > 0) && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>EAN:</strong> {ean}</p>
          {descricao && <p><strong>Produto:</strong> {descricao}</p>}
          {marca && <p><strong>Marca:</strong> {marca}</p>}

          {validades.length > 1 ? (
            <div>
              <p><strong>Escolha a validade:</strong></p>
              {validades.map((val, idx) => (
                <button
                  key={idx}
                  onClick={() => setValidade(val)}
                  style={{
                    margin: "0.5rem",
                    padding: "0.5rem 1rem",
                    backgroundColor: val === validade ? "#4CAF50" : "#eee",
                    border: "1px solid #ccc",
                    cursor: "pointer",
                  }}
                >
                  {val.split("-").reverse().join("/")}
                </button>
              ))}
            </div>
          ) : validades.length === 1 ? (
            <p><strong>Validade:</strong> {validades[0].split("-").reverse().join("/")}</p>
          ) : null}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <label>
          <strong>Quantidade:</strong>
          <input
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            style={{ marginLeft: "1rem", width: "100px" }}
          />
        </label>
      </div>

      <button
        onClick={registrarContagem}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          backgroundColor: "#4CAF50",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        ✅ Registrar Contagem
      </button>

      {mensagemSucesso && (
        <p style={{ marginTop: "1rem", color: "#4CAF50", fontWeight: "bold" }}>
          {mensagemSucesso}
        </p>
      )}
    </div>
  );
};

export default TelaContagem;