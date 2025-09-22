import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const EntradaProdutoLoja = () => {
  const [ean, setEan] = useState('');
  const [validade, setValidade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [lote, setLote] = useState('');
  const [produtoInfo, setProdutoInfo] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const emailSalvo = localStorage.getItem("usuarioEmail");
    setUsuarioEmail(emailSalvo || "desconhecido@local");
  }, []);

  const buscarProduto = async () => {
    setProdutoInfo(null);
    setMensagem('');

    const { data, error } = await supabase
      .from("produto")
      .select("*")
      .eq("ean", ean.trim())
      .limit(1);

    if (error || !data || data.length === 0) {
      const cadastrar = window.confirm("Produto não cadastrado. Deseja cadastrá-lo?");
      if (cadastrar) {
        navigate("/cadastro-dinamico", { state: { ean } });
      }
    } else {
      setProdutoInfo(data[0]);
    }
  };

  const registrarEntradaLoja = async () => {
    setMensagem('');

    if (!produtoInfo || !produtoInfo.id_produto) {
      alert("Nenhum produto selecionado.");
      return;
    }

    if (!validade) {
      alert("Data de validade é obrigatória.");
      return;
    }

    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    const validadeFormatada = new Date(validade).toISOString().split("T")[0];
    const entradaFormatada = new Date().toISOString();

    const { data: estoqueLoja, error: erroBusca } = await supabase
      .from("estoque_loja")
      .select("*")
      .eq("id_produto", produtoInfo.id_produto);

    if (erroBusca) {
      alert("Erro ao verificar estoque da loja.");
      return;
    }

    const linhaExistente = estoqueLoja.find(item => {
      const validadeBanco = item.validade?.split("T")[0];
      return validadeBanco === validadeFormatada;
    });

    if (linhaExistente) {
      const novaQuantidade = linhaExistente.quantidade + quantidadeNum;

      const { error: erroUpdate } = await supabase
        .from("estoque_loja")
        .update({ quantidade: novaQuantidade })
        .eq("id", linhaExistente.id);

      if (erroUpdate) {
        alert("Erro ao atualizar estoque da loja.");
        return;
      }
    } else {
      const novaEntrada = {
        id_produto: produtoInfo.id_produto,
        ean: produtoInfo.ean,
        nome: produtoInfo.descricao, // ✅ campo exigido pela tabela
        validade: validadeFormatada,
        quantidade: quantidadeNum,
        lote: lote || null,
        data_entrada: entradaFormatada
      };

      const { error: erroInsert } = await supabase
        .from("estoque_loja")
        .insert([novaEntrada]);

      if (erroInsert) {
        console.error("Erro ao registrar entrada:", erroInsert);
        alert("Erro ao registrar entrada na loja.");
        return;
      }
    }

    setMensagem("✅ Entrada registrada com sucesso!");
    setTimeout(() => {
      setProdutoInfo(null);
      setEan('');
      setValidade('');
      setQuantidade('');
      setLote('');
    }, 1500);
  };

  return (
    <div className="entrada-produto-loja" style={{ padding: "2rem" }}>
      <h2>🏬 Entrada de Produto na Loja</h2>
      <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>
        Usuário logado: {usuarioEmail}
      </p>

      <input
        type="text"
        value={ean}
        onChange={(e) => setEan(e.target.value)}
        placeholder="Digite o EAN do produto"
        style={{ marginRight: "1rem" }}
      />
      <button onClick={buscarProduto}>Verificar Produto</button>

      {produtoInfo && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>Descrição:</strong> {produtoInfo.descricao}</p>
          <p><strong>Marca:</strong> {produtoInfo.marca}</p>

          <div style={{ marginTop: "1rem" }}>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              placeholder="Data de validade"
              style={{ marginRight: "1rem" }}
            />
            <input
              type="number"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              placeholder="Quantidade"
              style={{ marginRight: "1rem" }}
            />
            <input
              type="text"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              placeholder="Lote (opcional)"
              style={{ marginRight: "1rem" }}
            />
            <button onClick={registrarEntradaLoja}>Confirmar Entrada</button>
          </div>
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

export default EntradaProdutoLoja;