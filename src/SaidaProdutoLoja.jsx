import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

const SaidaProdutoLoja = () => {
  const [entradaTexto, setEntradaTexto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Saída de Produto da Loja";
  }, []);

  // Validação de cada linha
  const validarSaidaLoja = async ({ ean, validade, quantidade }) => {
    const [ano, mes, dia] = validade.split("-");
    const validadeFormatada = `${ano}-${mes}-${dia}`;

    // Buscar produto
    const { data: produtoData, error: produtoError } = await supabase
      .from("produto")
      .select("*")
      .eq("ean", ean.trim())
      .single();

    if (produtoError || !produtoData) {
      return "Produto não encontrado.";
    }

    const produtoInfo = { ...produtoData, id: produtoData.id_produto };

    // Buscar estoques da loja
    const { data: estoques, error: erroEstoque } = await supabase
      .from("estoque_loja")
      .select("id, quantidade, validade, id_produto, ean")
      .eq("id_produto", produtoInfo.id)
      .eq("ean", ean.trim());

    if (erroEstoque || !estoques || estoques.length === 0) {
      return "Nenhum estoque encontrado.";
    }

    // Regra de validade mais curta primeiro
    const validadePendente = estoques.find(item => {
      const validadeItem = item.validade?.split("T")[0];
      return validadeItem < validadeFormatada && item.quantidade > 0;
    });

    if (validadePendente) {
      const validadeBloqueada = validadePendente.validade?.split("T")[0].split("-").reverse().join("/");
      return `Ainda há saldo com validade ${validadeBloqueada}.`;
    }

    const estoqueSelecionado = estoques.find(item => {
      const estoqueValidade = item.validade?.split("T")[0];
      return estoqueValidade === validadeFormatada;
    });

    if (!estoqueSelecionado) {
      return "Estoque não encontrado para essa validade.";
    }

    if (quantidade > estoqueSelecionado.quantidade) {
      return `Quantidade indisponível. Estoque atual: ${estoqueSelecionado.quantidade}`;
    }

    return { produtoInfo, estoqueSelecionado };
  };

  // Registrar saída individual
  const registrarSaidaLoja = async ({ produtoInfo, estoqueSelecionado, quantidade, lote }) => {
    const dadosSaida = {
      id_produto: produtoInfo.id,
      id_estoque: estoqueSelecionado.id,
      ean: produtoInfo.ean,
      quantidade,
      lote: lote || null,
      validade: estoqueSelecionado.validade,
      data_saida: new Date().toISOString(),
    };

    await supabase.from("saida_loja").insert([dadosSaida]);

    const usuarioEmail = localStorage.getItem("usuarioEmail") || "desconhecido@local";
    const dadosHistorico = { ...dadosSaida, usuario_email: usuarioEmail };
    await supabase.from("saida_loja_historico").insert([dadosHistorico]);

    const novaQuantidade = estoqueSelecionado.quantidade - quantidade;
    await supabase.from("estoque_loja").update({ quantidade: novaQuantidade }).eq("id", estoqueSelecionado.id);
  };

  // Processar todas as linhas coladas
  const processarSaidas = async () => {
    const linhas = entradaTexto.trim().split("\n");
    const erros = [];

    // Primeiro valida todas as linhas
    for (const linha of linhas) {
      const [ean, validade, quantidadeStr, lote] = linha.split(";");
      const quantidade = parseInt(quantidadeStr);

      if (!ean || !validade || isNaN(quantidade)) {
        erros.push(`Linha inválida: ${linha}`);
        continue;
      }

      const resultado = await validarSaidaLoja({ ean, validade, quantidade });
      if (typeof resultado === "string") {
        erros.push(`EAN ${ean}: ${resultado}`);
      }
    }

    // Se houver erros, trava tudo
    if (erros.length > 0) {
      setMensagem("❌ Corrija os seguintes erros antes de registrar:\n" + erros.join("\n"));
      return; // não registra nada
    }

    // Só registra se todas as linhas estiverem corretas
    for (const linha of linhas) {
      const [ean, validade, quantidadeStr, lote] = linha.split(";");
      const quantidade = parseInt(quantidadeStr);

      const resultado = await validarSaidaLoja({ ean, validade, quantidade });
      await registrarSaidaLoja({
        produtoInfo: resultado.produtoInfo,
        estoqueSelecionado: resultado.estoqueSelecionado,
        quantidade,
        lote
      });
    }

    // Mensagem de sucesso e limpeza da tela
    setMensagem("✅ Saídas registradas e estoque atualizado com sucesso!");
    setEntradaTexto(""); // limpa o textarea → itens somem da tela
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📤 Saída em Massa da Loja</h2>
      <textarea
        rows={10}
        cols={50}
        placeholder="Cole aqui os EANs;Validade;Quantidade;Lote(opcional)\nExemplo:\n7898671427591;2028-03-31;5;Pedido123"
        value={entradaTexto}
        onChange={(e) => setEntradaTexto(e.target.value)}
        style={{ width: "100%", marginBottom: "1rem" }}
      />
      <button onClick={processarSaidas}>Confirmar Saídas em Massa</button>

      {mensagem && (
        <pre
          style={{
            marginTop: "1rem",
            color: mensagem.startsWith("❌") ? "red" : "green",
            fontWeight: "bold",
            whiteSpace: "pre-wrap"
          }}
        >
          {mensagem}
        </pre>
      )}
    </div>
  );
};

export default SaidaProdutoLoja;
