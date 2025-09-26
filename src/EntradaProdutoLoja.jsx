import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const EntradaProdutoLoja = () => {
  const [ean, setEan] = useState('');
  const [validade, setValidade] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [lote, setLote] = useState('');
  const [produtoEncontrado, setProdutoEncontrado] = useState(false);
  const [produtoInfo, setProdutoInfo] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [usuarioEmail, setUsuarioEmail] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const emailSalvo = localStorage.getItem("usuarioEmail");
    setUsuarioEmail(emailSalvo || "desconhecido@local");
  }, []);

  const buscarProduto = async () => {
    setProdutoEncontrado(false);
    setProdutoInfo(null);
    setMensagem('');

    try {
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
        setProdutoEncontrado(true);
        setProdutoInfo(data[0]);
      }
    } catch (err) {
      console.error("Erro ao consultar produto:", err);
      alert("Erro ao verificar produto.");
    }
  };

  const registrarEntrada = async () => {
    setMensagem('');

    if (!produtoInfo) {
      alert("Nenhum produto selecionado.");
      return;
    }

    const quantidadeNum = parseInt(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      alert("Informe uma quantidade válida.");
      return;
    }

    const validadeFormatada = validade ? new Date(validade).toISOString().split("T")[0] : null;
    const entradaFormatada = new Date().toISOString();

    try {
      const { data: estoqueLoja, error: erroBusca } = await supabase
        .from("estoque_loja")
        .select("*")
        .eq("id_produto", produtoInfo.id_produto);

      if (erroBusca) {
        console.error("Erro ao buscar estoque loja:", erroBusca);
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
          console.error("Erro ao atualizar estoque loja:", erroUpdate);
          alert("Erro ao atualizar estoque da loja.");
          return;
        }
      } else {
        const novaEntrada = {
          id_produto: produtoInfo.id_produto,
          ean: produtoInfo.ean,
          validade: validadeFormatada,
          quantidade: quantidadeNum,
          lote: lote || null,
          data_entrada: entradaFormatada
        };

        const { error: erroInsert } = await supabase
          .from("estoque_loja")
          .insert([novaEntrada]);

        if (erroInsert) {
          console.error("Erro ao registrar nova entrada:", erroInsert);
          alert("Erro ao registrar entrada no estoque da loja.");
          return;
        }
      }

      const historicoLoja = {
        id_produto: produtoInfo.id_produto,
        ean: produtoInfo.ean,
        validade: validadeFormatada,
        quantidade: quantidadeNum,
        lote: lote || null,
        data_entrada: entradaFormatada,
        usuario_email: usuarioEmail
      };

      const { error: erroHistorico } = await supabase
        .from("entrada_loja_historico")
        .insert([historicoLoja]);

      if (erroHistorico) {
        console.warn("Entrada registrada, mas falhou no histórico:", erroHistorico);
      }

      setMensagem("✅ Entrada registrada com sucesso!");
      setTimeout(() => {
        setProdutoEncontrado(false);
        setProdutoInfo(null);
        setEan('');
        setValidade('');
        setQuantidade('');
        setLote('');
      }, 1500);
    } catch (err) {
      console.error("Erro inesperado:", err);
      alert("Erro inesperado ao registrar entrada.");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
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

      {produtoEncontrado && produtoInfo && (
        <div style={{ marginTop: "1rem" }}>
          <p><strong>Descrição:</strong> {produtoInfo.descricao}</p>
          <p><strong>Marca:</strong> {produtoInfo.marca}</p>

          <div style={{ marginTop: "1rem" }}>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
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
            <button onClick={registrarEntrada}>Confirmar Entrada</button>
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