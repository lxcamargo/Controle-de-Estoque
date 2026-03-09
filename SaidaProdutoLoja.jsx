import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const SaidaProdutoLoja = () => {
  const [ean, setEan] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");
  const [produtoInfo, setProdutoInfo] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const navigate = useNavigate();

  // ✅ define o título da aba do navegador quando a tela abre
  useEffect(() => {
    document.title = "Saída de Produto da Loja";
  }, []);

  const buscarProduto = async () => {
    setProdutoInfo(null);
    setMensagem("");

    try {
      const { data, error } = await supabase
        .from("produto")
        .select("*")
        .eq("ean", ean.trim())
        .single();

      if (error || !data) {
        const cadastrar = window.confirm("Produto não cadastrado. Deseja cadastrá-lo?");
        if (cadastrar) {
          navigate("/cadastro-dinamico", { state: { ean } });
        }
      } else {
        setProdutoInfo({ ...data, id: data.id_produto });
      }
    } catch (err) {
      console.error("Erro ao buscar produto:", err);
      alert("Erro ao verificar produto.");
    }
  };

  const registrarSaidaLoja = async () => {
    setMensagem("");

    if (!produtoInfo || !produtoInfo.id) {
      alert("Nenhum produto selecionado ou ID inválido.");
      return;
    }

    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    if (!validade) {
      alert("A data de validade é obrigatória.");
      return;
    }

    const validadeFormatada = new Date(validade).toISOString().split("T")[0];

    const { data: estoques, error: erroEstoque } = await supabase
      .from("estoque_loja")
      .select("id, quantidade, validade, id_produto, ean")
      .eq("id_produto", produtoInfo.id)
      .eq("ean", ean.trim());

    if (erroEstoque) {
      alert("Erro ao verificar estoque da loja.");
      return;
    }

    // 🔒 Verifica se há saldo em validade anterior
    const validadeMaisAntigaComSaldo = estoques.find(item => {
      const validadeItem = item.validade?.split("T")[0];
      return validadeItem < validadeFormatada && item.quantidade > 0;
    });

    if (validadeMaisAntigaComSaldo) {
      const validadeBloqueada = validadeMaisAntigaComSaldo.validade?.split("T")[0].split("-").reverse().join("/");
      alert(`⚠️ Existe saldo disponível com validade anterior (${validadeBloqueada}). Você só pode dar saída em produtos com validade mais longa quando o saldo da mais próxima estiver zerado.`);
      return;
    }

    const estoqueSelecionado = estoques.find((item) => {
      const estoqueValidade = item.validade?.split("T")[0];
      return estoqueValidade === validadeFormatada;
    });

    if (!estoqueSelecionado || !estoqueSelecionado.id) {
      alert("Estoque não encontrado para este produto com essa validade.");
      return;
    }

    if (quantidadeNum > estoqueSelecionado.quantidade) {
      alert(`Quantidade indisponível. Estoque atual: ${estoqueSelecionado.quantidade}`);
      return;
    }

    const dadosSaida = {
      id_produto: produtoInfo.id,
      id_estoque: estoqueSelecionado.id,
      ean: produtoInfo.ean,
      quantidade: quantidadeNum,
      lote: lote || null,
      validade: estoqueSelecionado.validade,
      data_saida: new Date().toISOString(),
    };

    try {
      const { error: erroSaida } = await supabase
        .from("saida_loja")
        .insert([dadosSaida]);

      if (erroSaida) {
        alert("Não foi possível registrar a saída.");
        return;
      }

      const usuarioEmail = localStorage.getItem("usuarioEmail") || "desconhecido@local";
      const dadosHistorico = {
        ...dadosSaida,
        usuario_email: usuarioEmail,
      };

      const { error: erroHistorico } = await supabase
        .from("saida_loja_historico")
        .insert([dadosHistorico]);

      if (erroHistorico) {
        console.warn("Saída registrada, mas falhou ao salvar no histórico:", erroHistorico);
      }

      const novaQuantidade = estoqueSelecionado.quantidade - quantidadeNum;
      const { error: erroAtualizacao } = await supabase
        .from("estoque_loja")
        .update({ quantidade: novaQuantidade })
        .eq("id", estoqueSelecionado.id);

      if (erroAtualizacao) {
        alert("Saída registrada, mas não foi possível atualizar o estoque.");
        return;
      }

      setMensagem("✅ Saída registrada e estoque atualizado com sucesso!");
      setTimeout(() => {
        setProdutoInfo(null);
        setEan('');
        setQuantidade('');
        setLote('');
        setValidade('');
      }, 1500);
    } catch (err) {
      console.error("Erro inesperado ao registrar saída:", err);
      alert("Erro inesperado ao registrar saída.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📤 Saída de Produto da Loja</h2>

      <input
        type="text"
        placeholder="EAN do produto"
        value={ean}
        onChange={(e) => setEan(e.target.value)}
        style={{ marginBottom: "1rem", width: "100%" }}
      />
      <button onClick={buscarProduto}>Verificar Produto</button>

      {produtoInfo && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>Descrição:</strong> {produtoInfo.descricao}</p>
          <p><strong>Marca:</strong> {produtoInfo.marca}</p>

          <input
            type="number"
            placeholder="Quantidade"
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            style={{ marginBottom: "1rem", width: "100%" }}
          />
          <input
            type="text"
            placeholder="Pedido (opcional)"
            value={lote}
            onChange={(e) => setLote(e.target.value)}
            style={{ marginBottom: "1rem", width: "100%" }}
          />
          <input
            type="date"
            placeholder="Data de validade"
            value={validade}
            onChange={(e) => setValidade(e.target.value)}
            style={{ marginBottom: "1rem", width: "100%" }}
          />
          <button onClick={registrarSaidaLoja}>Confirmar Saída</button>
        </div>
      )}

      {mensagem && (
        <p style={{ marginTop: "1rem", color: "green", fontWeight: "bold" }}>
          {mensagem}
        </p>
      )}
    </div>
  );
};

export default SaidaProdutoLoja;