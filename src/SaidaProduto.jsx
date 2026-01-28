import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const SaidaProduto = () => {
  // ✅ Define o título da aba do navegador
  useEffect(() => {
    document.title = "Saida de Produto";
  }, []);

  const [ean, setEan] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [lote, setLote] = useState("");
  const [validade, setValidade] = useState("");
  const [produtoInfo, setProdutoInfo] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const navigate = useNavigate();
  

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
        alert("Produto não encontrado.");
      } else {
        setProdutoInfo({
          ...data,
          id: data.id_produto,
        });
      }
    } catch (err) {
      console.error("Erro ao buscar produto:", err);
      alert("Erro ao verificar produto.");
    }
  };

  const registrarSaida = async () => {
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

    const [ano, mes, dia] = validade.split("-");
    const validadeFormatada = `${ano}-${mes}-${dia}`;
    const validadeDate = new Date(`${ano}-${mes}-${dia}T00:00:00`);

    if (isNaN(validadeDate.getTime())) {
      alert("Data de validade inválida.");
      return;
    }

    const { data: estoques, error: erroEstoque } = await supabase
      .from("estoque")
      .select("id, quantidade, validade, id_produto")
      .eq("id_produto", produtoInfo.id)
      .order("validade", { ascending: true });

    if (erroEstoque) {
      console.error("Erro ao consultar estoques:", erroEstoque.message || erroEstoque);
      alert("Erro ao verificar estoque.");
      return;
    }

    if (!estoques || estoques.length === 0) {
      alert("Nenhum estoque encontrado para este produto.");
      return;
    }

    const validadePendente = estoques.find((item) => {
      const estoqueValidade = typeof item.validade === "string"
        ? item.validade.slice(0, 10)
        : new Date(item.validade).toISOString().slice(0, 10);
      return estoqueValidade < validadeFormatada && item.quantidade > 0;
    });

    if (validadePendente) {
      const pendenteFormatada = typeof validadePendente.validade === "string"
        ? validadePendente.validade.slice(0, 10).split("-").reverse().join("/")
        : new Date(validadePendente.validade).toISOString().slice(0, 10).split("-").reverse().join("/");

      alert(`Ainda há saldo do lote com validade ${pendenteFormatada}. É necessário dar baixa nesse lote primeiro.`);
      return;
    }

    const estoqueSelecionado = estoques.find((item) => {
      const estoqueValidade = typeof item.validade === "string"
        ? item.validade.slice(0, 10)
        : new Date(item.validade).toISOString().slice(0, 10);
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
      validade: validadeDate.toISOString(),
      data_saida: new Date().toISOString(),
    };

    try {
      const { error: erroSaida } = await supabase.from("saida").insert([dadosSaida]);

      if (erroSaida) {
        console.error("❌ Erro ao registrar saída:", erroSaida);
        alert("Não foi possível registrar a saída.");
        return;
      }

      const usuarioEmail = localStorage.getItem("usuarioEmail") || "desconhecido@local";
      const dadosHistorico = {
        id_produto: produtoInfo.id,
        ean: produtoInfo.ean,
        quantidade: quantidadeNum,
        lote: lote || null,
        validade: estoqueSelecionado.validade,
        data_saida: new Date().toISOString(),
        usuario_email: usuarioEmail,
      };

      const { error: erroHistorico } = await supabase
        .from("saida_historico")
        .insert([dadosHistorico]);

      if (erroHistorico) {
        console.error("❌ Erro ao registrar no histórico:", erroHistorico);
        alert("Saída registrada, mas não foi possível salvar no histórico.");
      }

      const novaQuantidade = estoqueSelecionado.quantidade - quantidadeNum;
      const { error: erroAtualizacao } = await supabase
        .from("estoque")
        .update({ quantidade: novaQuantidade })
        .eq("id", estoqueSelecionado.id);

      if (erroAtualizacao) {
        console.error("❌ Erro ao atualizar quantidade:", erroAtualizacao);
        alert("Saída registrada, mas não foi possível atualizar o estoque.");
        return;
      }

      // 🔄 Atualização do estoque da loja
      try {
        const dataEntrada = new Date().toISOString();

        const { data: estoqueLoja, error: erroLoja } = await supabase
          .from("estoque_loja")
          .select("*")
          .eq("id_produto", produtoInfo.id)
          .eq("ean", produtoInfo.ean);

        if (erroLoja) {
          console.error("❌ Erro ao consultar estoque da loja:", erroLoja);
        } else {
          const linhaExistente = estoqueLoja.find(item => {
            const validadeBanco = item.validade?.split("T")[0];
            return validadeBanco === validadeFormatada;
          });

          if (linhaExistente) {
            const novaQuantidadeLoja = linhaExistente.quantidade + quantidadeNum;

            const { error: erroUpdateLoja } = await supabase
              .from("estoque_loja")
              .update({ quantidade: novaQuantidadeLoja })
              .eq("id", linhaExistente.id);

            if (erroUpdateLoja) {
              console.error("❌ Erro ao atualizar estoque da loja:", erroUpdateLoja);
            }
          } else {
            const novaLinhaLoja = {
              id_produto: produtoInfo.id,
              ean: produtoInfo.ean,
              nome: produtoInfo.descricao,
              marca: produtoInfo.marca,
              validade: validadeFormatada,
              quantidade: quantidadeNum,
              lote: lote || null,
              data_entrada: dataEntrada
            };

            const { error: erroInsertLoja } = await supabase
              .from("estoque_loja")
              .insert([novaLinhaLoja]);

            if (erroInsertLoja) {
              console.error("❌ Erro ao criar nova linha na loja:", erroInsertLoja);
            }
          }
        }
      } catch (errLoja) {
        console.error("❌ Erro inesperado ao atualizar estoque da loja:", errLoja);
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
      console.error("❌ Erro inesperado ao registrar saída:", err);
      alert("Erro inesperado ao registrar saída.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📤 Registrar Saída de Produto</h2>

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
          <button onClick={registrarSaida}>Confirmar Saída</button>
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

export default SaidaProduto;
