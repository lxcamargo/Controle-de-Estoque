import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const SaidaProduto = () => {
  const [entradaTexto, setEntradaTexto] = useState("");
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    document.title = "Saída de Produto (Galpão)";
  }, []);

  // Validação de cada linha
  const validarSaida = async ({ ean, validade, quantidade }) => {
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

    // Buscar estoques do galpão ordenados por validade
    const { data: estoques, error: erroEstoque } = await supabase
      .from("estoque")
      .select("id, quantidade, validade, id_produto")
      .eq("id_produto", produtoInfo.id)
      .order("validade", { ascending: true });

    if (erroEstoque || !estoques || estoques.length === 0) {
      return "Nenhum estoque encontrado.";
    }

    // Verifica se há saldo suficiente somando todas as validades
    const saldoTotal = estoques.reduce((acc, est) => acc + est.quantidade, 0);
    if (quantidade > saldoTotal) {
      return `Quantidade indisponível. Saldo total: ${saldoTotal}`;
    }

    return { produtoInfo, estoques, validadeFormatada };
  };

  // Registrar saída FIFO (primeiro validade mais próxima)
  const registrarSaida = async ({ produtoInfo, estoques, quantidade }) => {
    let quantidadeRestante = quantidade;

    for (const estoque of estoques) {
      if (quantidadeRestante <= 0) break;

      const estoqueValidade = estoque.validade?.split("T")[0];
      const validadeDate = new Date(estoqueValidade + "T00:00:00");

      const quantidadeSaida = Math.min(estoque.quantidade, quantidadeRestante);

      // Registrar saída no galpão
      const dadosSaida = {
        id_produto: produtoInfo.id,
        id_estoque: estoque.id,
        ean: produtoInfo.ean,
        quantidade: quantidadeSaida,
        validade: validadeDate.toISOString(),
        data_saida: new Date().toISOString(),
      };
      await supabase.from("saida").insert([dadosSaida]);

      // Registrar histórico
      const usuarioEmail = localStorage.getItem("usuarioEmail") || "desconhecido@local";
      const dadosHistorico = { ...dadosSaida, usuario_email: usuarioEmail };
      await supabase.from("saida_historico").insert([dadosHistorico]);

      // Atualizar estoque do galpão
      const novaQuantidade = estoque.quantidade - quantidadeSaida;
      await supabase.from("estoque").update({ quantidade: novaQuantidade }).eq("id", estoque.id);

      // Atualizar estoque da loja
      const { data: estoqueLoja } = await supabase
        .from("estoque_loja")
        .select("*")
        .eq("ean", produtoInfo.ean);

      const linhaExistente = estoqueLoja?.find(item => item.validade?.split("T")[0] === estoqueValidade);

      if (linhaExistente) {
        const novaQuantidadeLoja = linhaExistente.quantidade + quantidadeSaida;
        await supabase.from("estoque_loja").update({ quantidade: novaQuantidadeLoja }).eq("id", linhaExistente.id);
      } else {
        const novaLinhaLoja = {
          ean: produtoInfo.ean,
          nome: produtoInfo.descricao,
          marca: produtoInfo.marca,
          validade: estoqueValidade,
          quantidade: quantidadeSaida,
          data_entrada: new Date().toISOString()
        };
        await supabase.from("estoque_loja").insert([novaLinhaLoja]);
      }

      quantidadeRestante -= quantidadeSaida;
    }
  };

  // Processar todas as linhas coladas
  const processarSaidas = async () => {
    const linhas = entradaTexto.trim().split("\n");
    const erros = [];

    // Primeiro valida todas as linhas
    for (const linha of linhas) {
      const [ean, quantidadeStr, validade] = linha.split(";");
      const quantidade = parseInt(quantidadeStr);

      if (!ean || !validade || isNaN(quantidade)) {
        erros.push(`Linha inválida: ${linha}`);
        continue;
      }

      const resultado = await validarSaida({ ean, validade, quantidade });
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
      const [ean, quantidadeStr, validade] = linha.split(";");
      const quantidade = parseInt(quantidadeStr);

      const resultado = await validarSaida({ ean, validade, quantidade });
      await registrarSaida({
        produtoInfo: resultado.produtoInfo,
        estoques: resultado.estoques,
        quantidade
      });
    }

    // Mensagem de sucesso e limpeza da tela
    setMensagem("✅ Saídas registradas e estoque atualizado com sucesso!");
    setEntradaTexto(""); // limpa o textarea → itens somem da tela
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📤 Saída em Massa do Galpão</h2>
      <textarea
        rows={10}
        cols={50}
        placeholder="Cole aqui os EANs;Quantidade;Validade\nExemplo:\n7898671427591;5;2028-03-31"
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

export default SaidaProduto;
