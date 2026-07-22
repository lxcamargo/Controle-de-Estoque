import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const Inventario = () => {
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    document.title = 'Inventário';
  }, []);

  // 🔹 Normaliza qualquer data para YYYY-MM-DD (formato aceito pela coluna 'date' do Postgres)
  const formatarDataParaYYYYMMDD = (dataString) => {
    if (!dataString) return null;
    const parteData = dataString.split("T")[0];

    if (parteData.includes("/")) {
      const partes = parteData.split("/");
      if (partes.length === 3) {
        if (partes[0].length === 2 && partes[2].length === 4) {
          return `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
        }
        if (partes[0].length === 4) {
          return `${partes[0]}-${partes[1].padStart(2, "0")}-${partes[2].padStart(2, "0")}`;
        }
      }
    }
    return parteData;
  };

  const carregarInventario = async () => {
    // 1️⃣ Busca todas as contagens registradas
    const { data: contagens, error: erroContagem } = await supabase
      .from('contagens')
      .select(`
        ean,
        validade,
        quantidade,
        ajustado,
        data,
        produto_id,
        produto:produto_id (
          descricao,
          marca
        )
      `)
      .order('data', { ascending: false });

    if (erroContagem) {
      console.error("Erro ao buscar contagens:", erroContagem);
      return;
    }

    // 2️⃣ Agrupa para pegar apenas a última contagem de cada EAN + Validade
    const agrupados = {};
    for (const item of contagens) {
      const chave = `${item.ean}_${item.validade}`;
      if (!agrupados[chave]) agrupados[chave] = item;
    }

    // 3️⃣ Filtra para exibir apenas as contagens pendentes de ajuste
    const ultimasNaoAjustadas = Object.values(agrupados).filter(
      item => item.ajustado === false || item.ajustado === null || item.ajustado === undefined
    );

    // 4️⃣ Busca o saldo atual no ESTOQUE para cada item (EAN + Validade) e calcula o Status
    const produtosComSaldo = await Promise.all(
      ultimasNaoAjustadas.map(async (item) => {
        const validadeLimpa = formatarDataParaYYYYMMDD(item.validade);

        const { data: estoque, error: erroEstoque } = await supabase
          .from('estoque')
          .select('quantidade')
          .eq('ean', item.ean)
          .eq('validade', validadeLimpa)
          .limit(1)
          .maybeSingle();

        if (erroEstoque) {
          console.error(`Erro ao buscar saldo no estoque para EAN ${item.ean}:`, erroEstoque);
        }

        const saldo = estoque?.quantidade ?? null;

        const status =
          item.quantidade == null || saldo == null
            ? 'Pendente'
            : item.quantidade === saldo
            ? 'OK'
            : 'Divergente';

        return {
          ean: item.ean,
          descricao: item.produto?.descricao ?? '—',
          marca: item.produto?.marca ?? '—',
          validade: item.validade,
          quantidade: item.quantidade,
          saldo,
          status,
          produto_id: item.produto_id
        };
      })
    );

    setProdutos(produtosComSaldo);
  };

  const ajustarEstoque = async (produto) => {
    try {
      const validadeLimpa = formatarDataParaYYYYMMDD(produto.validade);

      if (!validadeLimpa) {
        alert("Validade inválida para ajuste.");
        return;
      }

      // 1️⃣ Busca o ID e dados cadastrais direto da tabela 'produto' pelo EAN
      const { data: dadosProduto, error: erroProduto } = await supabase
        .from('produto')
        .select('id_produto, descricao, marca')
        .eq('ean', produto.ean)
        .limit(1)
        .maybeSingle();

      if (erroProduto || !dadosProduto) {
        alert("Produto não encontrado na tabela cadastral 'produto'.");
        console.error("Erro ao buscar produto:", erroProduto);
        return;
      }

      const idProdutoReal = dadosProduto.id_produto;

      // 2️⃣ Busca a quantidade da última contagem não ajustada
      const { data: ultimaContagem, error: erroContagem } = await supabase
        .from('contagens')
        .select('quantidade')
        .eq('ean', produto.ean)
        .eq('validade', validadeLimpa)
        .or('ajustado.eq.false,ajustado.is.null')
        .order('data', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (erroContagem || !ultimaContagem) {
        alert('Erro ao buscar última contagem pendente.');
        console.error("Erro busca contagem:", erroContagem);
        return;
      }

      // 3️⃣ Checa se já existe linha no estoque para esse EAN + Validade
      const { data: itemEstoque, error: erroChecagem } = await supabase
        .from('estoque')
        .select('id')
        .eq('ean', produto.ean)
        .eq('validade', validadeLimpa)
        .maybeSingle();

      if (erroChecagem) {
        console.error("Erro ao checar estoque existente:", erroChecagem);
      }

      let erroEstoque = null;
      const qtdNumerica = parseFloat(ultimaContagem.quantidade);

      if (itemEstoque) {
        // 4️⃣ UPDATE: Ajusta as colunas respeitando a estrutura exata da tabela estoque
        const payloadUpdate = {
          quantidade: qtdNumerica,
          id_produto: idProdutoReal, // 👈 Nome corrigido para 'id_produto'
          nome: dadosProduto.descricao || null,
          marca: dadosProduto.marca || null
        };

        const { error } = await supabase
          .from('estoque')
          .update(payloadUpdate)
          .eq('id', itemEstoque.id);

        erroEstoque = error;
      } else {
        // 5️⃣ INSERT: Cria o novo registro no estoque respeitando os tipos da tabela
        const payloadInsert = {
          ean: String(produto.ean).trim(),
          validade: validadeLimpa,
          quantidade: qtdNumerica,
          id_produto: idProdutoReal, // 👈 Nome corrigido para 'id_produto'
          nome: dadosProduto.descricao || null,
          marca: dadosProduto.marca || null,
          data_entrada: new Date().toISOString()
        };

        const { error } = await supabase
          .from('estoque')
          .insert([payloadInsert]);

        erroEstoque = error;
      }

      if (erroEstoque) {
        alert(`Erro ao salvar no estoque: ${erroEstoque.message || 'Verifique o console'}`);
        console.error("Erro detalhado no ajuste do estoque:", {
          mensagem: erroEstoque.message,
          detalhes: erroEstoque.details,
          hint: erroEstoque.hint,
          codigo: erroEstoque.code,
          erroCompleto: erroEstoque
        });
        return;
      }

      // 6️⃣ Marca as contagens desse EAN + Validade como ajustadas
      const { error: erroAtualizarContagens } = await supabase
        .from('contagens')
        .update({ ajustado: true })
        .eq('ean', produto.ean)
        .eq('validade', validadeLimpa);

      if (erroAtualizarContagens) {
        alert('Erro ao marcar contagens como ajustadas');
        console.error("Erro ao marcar contagens:", erroAtualizarContagens);
        return;
      }

      alert('✅ Estoque ajustado com sucesso!');
      carregarInventario();
      setProdutoSelecionado(null);
      setHistorico([]);
    } catch (err) {
      console.error("Erro inesperado no ajuste:", err);
      alert("Erro inesperado ao ajustar estoque.");
    }
  };

  const carregarHistorico = async (ean, validade) => {
    const validadeLimpa = formatarDataParaYYYYMMDD(validade);

    const { data, error } = await supabase
      .from('contagens')
      .select('*')
      .eq('ean', ean)
      .eq('validade', validadeLimpa)
      .order('data', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setProdutoSelecionado({ ean, validade });
      setHistorico(data || []);
    }
  };

  useEffect(() => {
    carregarInventario();

    const canal = supabase
      .channel('inventario-tempo-real')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contagens'
      }, payload => {
        console.log('Atualização recebida:', payload);
        carregarInventario();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>📦 Tela de Inventário</h1>

      <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead style={{ backgroundColor: '#f0f0f0' }}>
          <tr>
            <th>EAN</th>
            <th>Descrição</th>
            <th>Marca</th>
            <th>Validade</th>
            <th>Contagem</th>
            <th>Saldo Estoque</th>
            <th>Status</th>
            <th>Ajustar</th>
            <th>Histórico</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p, index) => (
            <tr key={index}>
              <td>{p.ean}</td>
              <td>{p.descricao}</td>
              <td>{p.marca}</td>
              <td>{p.validade ? p.validade.split("-").reverse().join("/") : '—'}</td>
              <td><strong>{p.quantidade ?? '—'}</strong></td>
              <td>{p.saldo ?? 'Sem Saldo'}</td>
              <td>
                {p.status === 'OK' && <span title="Contagem igual ao saldo">✅</span>}
                {p.status === 'Divergente' && <span title="Contagem diferente do saldo">⚠️</span>}
                {p.status === 'Pendente' && <span title="Sem registro prévio no estoque">⏳</span>}
                <span style={{ marginLeft: '0.5rem' }}>{p.status}</span>
              </td>
              <td>
                <button
                  style={{
                    backgroundColor: '#28a745',
                    color: '#fff',
                    padding: '0.3rem 0.6rem',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => ajustarEstoque(p)}
                >
                  Ajustar Estoque
                </button>
              </td>
              <td>
                <button
                  style={{
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    padding: '0.3rem 0.6rem',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  onClick={() => carregarHistorico(p.ean, p.validade)}
                >
                  Ver Histórico
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {produtoSelecionado && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50
        }}>
          <div style={{
            backgroundColor: '#fff',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 0 10px rgba(0,0,0,0.3)',
            width: '100%',
            maxWidth: '800px'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>📋 Histórico de Contagens</h2>
            <p><strong>EAN:</strong> {produtoSelecionado.ean}</p>
            <p><strong>Validade:</strong> {produtoSelecionado.validade ? produtoSelecionado.validade.split("-").reverse().join("/") : '—'}</p>

            <table border="1" cellPadding="8" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead style={{ backgroundColor: '#f0f0f0' }}>
                <tr>
                  <th>Contagem Nº</th>
                  <th>Quantidade</th>
                  <th>Usuário</th>
                  <th>Data</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((item, index) => (
                  <tr key={index}>
                    <td>{item.contagem_num ?? index + 1}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.usuario_email ?? item.usuario ?? '—'}</td>
                    <td>{item.data ? new Date(item.data).toLocaleString('pt-BR') : '—'}</td>
                    <td>{item.status ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              style={{
                marginTop: '1.5rem',
                backgroundColor: '#dc3545',
                color: '#fff',
                padding: '0.5rem 1rem',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => setProdutoSelecionado(null)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;
