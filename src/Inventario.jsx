import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const Inventario = () => {
  const [produtos, setProdutos] = useState([]);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [historico, setHistorico] = useState([]);

  // Carrega inventário inicial com última contagem registrada
  const carregarInventario = async () => {
    const { data: inventario, error } = await supabase
      .from('inventario')
      .select('*')
      .order('descricao', { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    const produtosComContagem = await Promise.all(
      inventario.map(async (item) => {
        const { data: ultimaContagem } = await supabase
          .from('contagens')
          .select('quantidade, contagem_num')
          .eq('ean', item.ean)
          .eq('validade', item.validade)
          .order('data', { ascending: false })
          .limit(1)
          .single();

        return {
          ...item,
          ultimaContagemNum: ultimaContagem?.contagem_num ?? '-',
          ultimaContagemQtd: ultimaContagem?.quantidade ?? '-'
        };
      })
    );

    setProdutos(produtosComContagem);
  };

  // Ajusta estoque com base na última contagem registrada
  const ajustarEstoque = async (produto) => {
    const { data: ultimaContagem, error: erroContagem } = await supabase
      .from('contagens')
      .select('quantidade')
      .eq('ean', produto.ean)
      .eq('validade', produto.validade)
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
    } else {
      alert('Estoque ajustado com sucesso!');
      carregarInventario();
    }
  };

  // Carrega histórico de contagens (sem filtro de status)
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

  // Escuta atualizações em tempo real
  useEffect(() => {
    carregarInventario();

    const canal = supabase
      .channel('inventario-tempo-real')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'inventario'
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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">📦 Tela de Inventário</h1>
      <table className="table-auto w-full border">
        <thead className="bg-gray-100">
          <tr>
            <th>EAN</th>
            <th>Descrição</th>
            <th>Validade</th>
            <th>Última Contagem Nº</th>
            <th>Última Quantidade</th>
            <th>Status</th>
            <th>Ajustar</th>
            <th>Histórico</th>
          </tr>
        </thead>
        <tbody>
          {produtos.map((p, index) => (
            <tr key={index} className="text-center border-t">
              <td>{p.ean}</td>
              <td>{p.descricao}</td>
              <td>{p.validade}</td>
              <td>{p.ultimaContagemNum}</td>
              <td>{p.ultimaContagemQtd}</td>
              <td>{p.status}</td>
              <td>
                <button
                  className="bg-green-600 text-white px-3 py-1 rounded"
                  onClick={() => ajustarEstoque(p)}
                >
                  Ajustar Estoque
                </button>
              </td>
              <td>
                <button
                  className="bg-gray-600 text-white px-3 py-1 rounded"
                  onClick={() => carregarHistorico(p.ean, p.validade)}
                >
                  Ver Histórico
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal de Histórico */}
      {produtoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">📋 Histórico de Contagens</h2>
            <p><strong>EAN:</strong> {produtoSelecionado.ean}</p>
            <p><strong>Validade:</strong> {produtoSelecionado.validade}</p>

            <table className="table-auto w-full mt-4 border">
              <thead className="bg-gray-100">
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
                  <tr key={index} className="text-center border-t">
                    <td>{item.contagem_num}</td>
                    <td>{item.quantidade}</td>
                    <td>{item.usuario}</td>
                    <td>{new Date(item.data).toLocaleString()}</td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <button
              className="mt-6 bg-red-600 text-white px-4 py-2 rounded"
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