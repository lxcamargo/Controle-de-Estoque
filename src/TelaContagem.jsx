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
  const [mensagemSucesso, setMensagemSucesso] = useState("");

  useEffect(() => {
    const carregarUsuario = async () => {
      const { data, error } = await supabase
        .from("cadastro_user")
        .select("usuario_email")
        .eq("id", 1)
        .single();

      if (data) {
        setUsuarioEmail(data.usuario_email);
      } else {
        console.error("Erro ao buscar usuário:", error);
      }
    };

    carregarUsuario();
  }, []);

  const buscarProdutoPorEAN = async () => {
    const eanLimpo = ean.replace(/[^\d]/g, "");
    if (!eanLimpo) {
      alert("Digite um EAN válido.");
      return;
    }

    try {
      const { data: estoques, error } = await supabase
        .from("estoque")
        .select("quantidade, validade, nome, marca")
        .eq("ean", eanLimpo)
        .gt("quantidade", 0);

      if (error || !estoques || estoques.length === 0) {
        alert("Produto não encontrado ou sem saldo disponível.");
        return;
      }

      const primeiro = estoques.find((item) => item.nome && item.marca) || estoques[0];
      setDescricao(primeiro.nome);
      setMarca(primeiro.marca);

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
    if (!ean || !validade || !quantidade) {
      alert("Preencha todos os campos antes de registrar.");
      return;
    }

    const nomeSeguro = descricao ?? "Desconhecido";
    const marcaSegura = marca ?? "Desconhecida";

    try {
      await supabase.from("contagens").insert([
        {
          ean,
          nome: nomeSeguro,
          marca: marcaSegura,
          validade,
          quantidade: Number(quantidade),
          data: new Date().toISOString(),
          usuario: usuarioEmail,
          status: "registrada",
        },
      ]);

      setMensagemSucesso("✅ Contagem registrada com sucesso!");
      setEan("");
      setDescricao("");
      setMarca("");
      setValidade("");
      setQuantidade("");
      setValidades([]);

      setTimeout(() => setMensagemSucesso(""), 3000);
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

      {/* Campo EAN manual */}
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

      {/* Campo de quantidade fixo */}
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