import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const Inventario = () => {
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);

  // ✅ Define o título da aba do navegador (NOVA LINHA PEDIDA)
  useEffect(() => {
    document.title = 'Inventário';
  }, []);

  const carregarInventario = async () => {
    const { data: contagens, error: erroContagem } = await supabase
      .from('contagens')
      .select(`
        ean,
        validade,
        quantidade,
        ajustado,
        data,
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

    const agrupados = {};
    for (const item of contagens) {
      const chave = `${item.ean}_${item.validade}`;
      if (!agrupados[chave]) agrupados[chave] = item;
    }

    const ultimasNaoAjustadas = Object.values(agrupados).filter(item => item.ajustado === false);

    const produtosComSaldo = await Promise.all(
      ultimasNaoAjustadas.map(async (item) => {
        const { data: estoque, error: erroEstoque } = await supabase
          .from('estoque')
          .select('quantidade')
          .eq('ean', item.ean)
          .eq('validade', item.validade)
          .limit(1)
          .single();

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
          status
        };
      })
    );

    setProdutos(produtosComSaldo);
  };

  const ajustarEstoque = async (produto) => {
    const { data: ultimaContagem, error: erroContagem } = await supabase
      .from('contagens')
      .select('quantidade')
      .eq('ean', produto.ean)
      .eq('validade', produto.validade)
      .eq('ajustado', false)
      .order('data', { ascending: false })
      .limit(1)
      .single();

    if (erroContagem || !ultimaContagem) {
      alert('Erro ao buscar última contagem');
      console.error(erroContagem);
      return;
    }

    const { error: erroEstoque } = await supabase
      .from('estoque')
      .update({ quantidade: ultimaContagem.quantidade })
      .match({ ean: produto.ean, validade: produto.validade });

    if (erroEstoque) {
      alert('Erro ao ajustar estoque');
      console.error(erroEstoque);
      return;
    }

    const { error: erroAtualizarContagens } = await supabase
      .from('contagens')
      .update({ ajustado: true })
      .match({ ean: produto.ean, validade: produto.validade });

    if (erroAtualizarContagens) {
      alert('Erro ao marcar contagens como ajustadas');
      console.error(erroAtualizarContagens);
      return;
    }

    alert('✅ Estoque ajustado e item removido da tela!');
    carregarInventario();
    setProdutoSelecionado(null);
    setHistorico([]);
  };

  const carregarHistorico = async (ean, validade) => {
    const { data, error } = await supabase
      .from('contagens')
      .select('*')
      .eq('ean', ean)
      .eq('validade', validade)
      .order('contagem_num', { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setProdutoSelecionado({ ean, validade });
      setHistorico(data);
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
            <th>Quantidade</th>
            <th>Saldo</th>
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
              <td>{p.validade}</td>
              <td>{p.quantidade ?? '—'}</td>
              <td>{p.saldo ?? '—'}</td>
              <td>
                {p.status === 'OK' && <span>✅</span>}
                {p.status === 'Divergente' && <span>⚠️</span>}
                {p.status === 'Pendente' && <span>⏳</span>}
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
            <p><strong>Validade:</strong> {produtoSelecionado.validade}</p>

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
                    <td>{item.contagem_num}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.usuario ?? '—'}</td>
                    <td>{item.data}</td>
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
