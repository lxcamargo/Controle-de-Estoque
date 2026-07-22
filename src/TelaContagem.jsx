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
  
  // Controle do checkbox de digitação manual
  const [digitarManualmente, setDigitarManualmente] = useState(false);

  useEffect(() => {
    document.title = 'Tela de Contagem';
  }, []);

  useEffect(() => {
    const emailLocal = localStorage.getItem("usuarioEmail");
    if (emailLocal) {
      setUsuarioEmail(emailLocal);
    } else {
      console.error("Email do usuário não encontrado no localStorage.");
    }
  }, []);

  // 🔹 Normaliza qualquer formato de data (DD/MM/AAAA ou YYYY-MM-DD) para YYYY-MM-DD do Supabase
  const formatarDataParaYYYYMMDD = (dataString) => {
    if (!dataString) return "";
    
    const parteData = dataString.split("T")[0];

    if (parteData.includes("/") || parteData.includes("-")) {
      const separador = parteData.includes("/") ? "/" : "-";
      const partes = parteData.split(separador);

      if (partes.length === 3) {
        // Se foi digitado/selecionado em formato brasileiro DD/MM/AAAA
        if (partes[0].length === 2 && partes[2].length === 4) {
          const dia = partes[0].padStart(2, "0");
          const mes = partes[1].padStart(2, "0");
          const ano = partes[2];
          return `${ano}-${mes}-${dia}`;
        }
        // Se já vier do banco/botão como YYYY-MM-DD
        if (partes[0].length === 4) {
          return `${partes[0]}-${partes[1].padStart(2, "0")}-${partes[2].padStart(2, "0")}`;
        }
      }
    }

    return parteData;
  };

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
            .map((item) => formatarDataParaYYYYMMDD(item.validade))
            .filter(Boolean)
        )
      );

      setValidades(validadesUnicas);
      setValidade(validadesUnicas.length === 1 ? validadesUnicas[0] : "");
      setDigitarManualmente(false);
    } catch (err) {
      console.error("Erro ao buscar produto:", err);
      alert("Erro inesperado ao buscar produto.");
    }
  };

  const registrarContagem = async () => {
    // Permite quantidade 0 (converte string vazia para NaN para forçar o alerta)
    const quantidadeNum = quantidade === "" ? NaN : Number(quantidade);
    const validadeFormatada = formatarDataParaYYYYMMDD(validade);

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const produtoIdValido = uuidRegex.test(produtoId);

    // Validações com alertas específicos
    if (!ean?.trim()) {
      alert("Por favor, informe ou busque um EAN válido.");
      return;
    }

    if (!validadeFormatada || validadeFormatada.length !== 10) {
      alert("Selecione uma validade existente ou digite no formato correto (DD/MM/AAAA).");
      return;
    }

    // ✅ AGORA ACEITA 0 (Bloqueia apenas se estiver vazio ou se for um número negativo)
    if (isNaN(quantidadeNum) || quantidadeNum < 0) {
      alert("Digite uma quantidade válida (0 ou superior) antes de registrar.");
      return;
    }

    if (!usuarioEmail?.trim() || !produtoIdValido) {
      alert("Dados do produto ou usuário inválidos. Refaça a busca do produto.");
      return;
    }

    try {
      // 🔍 CONSOLIDAÇÃO: Busca se já existe uma contagem ativa para este EAN + Validade
      const { data: existente, error: erroBusca } = await supabase
        .from("contagens")
        .select("id, quantidade")
        .eq("ean", ean)
        .eq("validade", validadeFormatada)
        .or("ajustado.eq.false,ajustado.is.null")
        .order("data", { ascending: false })
        .limit(1);

      if (erroBusca) throw erroBusca;

      if (existente && existente.length > 0) {
        // ✅ CONSOLIDA (Soma a quantidade digitada)
        const contagemExistente = existente[0];
        const novaQuantidadeTotal = Number(contagemExistente.quantidade || 0) + quantidadeNum;

        const { error: erroUpdate } = await supabase
          .from("contagens")
          .update({ 
            quantidade: novaQuantidadeTotal,
            data: new Date().toISOString(),
            usuario_email: usuarioEmail
          })
          .eq("id", contagemExistente.id);

        if (erroUpdate) throw erroUpdate;

        setMensagemSucesso(`🔁 Contagem consolidada! Nova quantidade total: ${novaQuantidadeTotal}`);
      } else {
        // ✅ CRIA NOVA LINHA
        const dadosContagem = {
          ean,
          validade: validadeFormatada,
          quantidade: quantidadeNum, // Pode ser 0
          data: new Date().toISOString(),
          usuario_email: usuarioEmail,
          produto_id: produtoId,
          ajustado: false
        };

        const { error: erroInsert } = await supabase
          .from("contagens")
          .insert([dadosContagem]);

        if (erroInsert) throw erroInsert;

        setMensagemSucesso("✅ Nova contagem registrada com sucesso!");
      }

      // Limpa os campos após registro
      setEan("");
      setDescricao("");
      setMarca("");
      setValidade("");
      setQuantidade("");
      setValidades([]);
      setProdutoId("");
      setDigitarManualmente(false);

      setTimeout(() => {
        setMensagemSucesso("");
      }, 3500);
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
          setValidade(formatarDataParaYYYYMMDD(validade) || "");
          setValidades(validades || []);
          setDigitarManualmente(false);
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

      {(descricao || marca || validades.length > 0 || produtoId) && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>EAN:</strong> {ean}</p>
          {descricao && <p><strong>Produto:</strong> {descricao}</p>}
          {marca && <p><strong>Marca:</strong> {marca}</p>}

          {/* Botões de Validades Vindas do Estoque */}
          {validades.length > 0 && !digitarManualmente && (
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
                    color: val === validade ? "#fff" : "#000",
                    border: "1px solid #ccc",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  {val.includes("-") ? val.split("-").reverse().join("/") : val}
                </button>
              ))}
            </div>
          )}

          {/* Checkbox para Ativar Digitação Manual */}
          <div style={{ marginTop: "1rem" }}>
            <label style={{ cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
              <input
                type="checkbox"
                checked={digitarManualmente}
                onChange={(e) => {
                  setDigitarManualmente(e.target.checked);
                  if (!e.target.checked) {
                    setValidade(validades.length === 1 ? validades[0] : "");
                  } else {
                    setValidade("");
                  }
                }}
                style={{ marginRight: "0.5rem" }}
              />
              <strong>Digitar validade manualmente</strong>
            </label>
          </div>

          {/* Campo de Texto com Máscara Brasileira DD/MM/AAAA */}
          {digitarManualmente && (
            <div style={{ marginTop: "0.5rem" }}>
              <label>
                <strong>Digite a validade (DD/MM/AAAA):</strong>
                <br />
                <input
                  type="text"
                  placeholder="Ex: 31/12/2026"
                  maxLength={10}
                  value={validade}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
                    if (v.length > 5) v = v.slice(0, 5) + "/" + v.slice(5, 9);
                    setValidade(v);
                  }}
                  style={{
                    marginTop: "0.25rem",
                    padding: "0.4rem",
                    width: "100%",
                    maxWidth: "300px",
                    borderRadius: "4px",
                    border: "1px solid #ccc"
                  }}
                />
              </label>
            </div>
          )}
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
