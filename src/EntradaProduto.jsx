import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const EntradaProduto = () => {
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
    console.log("📧 Usuário logado:", emailSalvo);
  }, []);

  // ✅ Define o título da aba do navegador
  useEffect(() => {
    document.title = 'Registrar Entrada';
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
          console.log("🔄 Redirecionando para cadastro dinâmico com EAN:", ean);
          navigate("/cadastro-dinamico", { state: { ean } });
        }
      } else {
        setProdutoEncontrado(true);
        setProdutoInfo(data[0]);
      }
    } catch (err) {
      console.error("Erro ao consultar produto no Supabase:", err);
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
      const { data: estoqueExistente, error: erroBusca } = await supabase
        .from("estoque")
        .select("*")
        .eq("id_produto", produtoInfo.id_produto);

      if (erroBusca) {
        console.error("❌ Erro ao buscar estoque existente:", erroBusca);
        alert("Erro ao verificar estoque existente.");
        return;
      }

      const linhaExistente = estoqueExistente.find(item => {
        const validadeBanco = item.validade?.split("T")[0];
        return validadeBanco === validadeFormatada;
      });

      if (linhaExistente) {
        const novaQuantidade = linhaExistente.quantidade + quantidadeNum;

        const { error: erroUpdate } = await supabase
          .from("estoque")
          .update({ quantidade: novaQuantidade })
          .eq("id", linhaExistente.id);

        if (erroUpdate) {
          console.error("❌ Erro ao atualizar estoque:", erroUpdate);
          alert("Erro ao atualizar estoque.");
          return;
        }
      } else {
        const dadosEntrada = {
          id_produto: produtoInfo.id_produto,
          ean: produtoInfo.ean,
          validade: validadeFormatada,
          quantidade: quantidadeNum,
          lote: lote || null,
          data_entrada: entradaFormatada
        };

        const { error: erroInsert } = await supabase
          .from("estoque")
          .insert([dadosEntrada]);

        if (erroInsert) {
          console.error("❌ Erro ao registrar entrada:", erroInsert);
          alert(`Não foi possível registrar a entrada: ${erroInsert.message}`);
          return;
        }
      }

      const historicoEntrada = {
        id_produto: produtoInfo.id_produto,
        ean: produtoInfo.ean,
        validade: validadeFormatada,
        quantidade: quantidadeNum,
        lote: lote || null,
        data_entrada: entradaFormatada,
        usuario_email: usuarioEmail
      };

      const { error: erroHistorico } = await supabase
        .from("entrada_historico")
        .insert([historicoEntrada]);

      if (erroHistorico) {
        console.warn("⚠️ Entrada registrada, mas falhou ao salvar no histórico:", erroHistorico);
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
      console.error("❌ Erro inesperado:", err);
      alert("Erro inesperado ao registrar entrada.");
    }
  };

  return (
    <div className="entrada-produto" style={{ padding: "2rem" }}>
      <h2>📥 Registrar Entrada de Produto</h2>

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

          <div className="form-entrada" style={{ marginTop: "1rem" }}>
            <input
              type="date"
              placeholder="Data de validade"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              style={{ marginRight: "1rem" }}
            />
            <input
              type="number"
              placeholder="Quantidade"
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              style={{ marginRight: "1rem" }}
            />
            <input
              type="text"
              placeholder="Lote (opcional)"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
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

export default EntradaProduto;