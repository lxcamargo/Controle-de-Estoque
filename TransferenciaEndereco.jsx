import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function TransferenciaEndereco() {
  const [dados, setDados] = useState([]);
  const [eanBusca, setEanBusca] = useState("");
  const [novoEndereco, setNovoEndereco] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [quantidades, setQuantidades] = useState({});

  // ✅ define o título da aba do navegador quando a tela abre
  useEffect(() => {
    document.title = "Transferência de Endereço";
  }, []);

  const buscarPorEAN = async () => {
    if (!eanBusca) {
      alert("Informe um EAN para buscar!");
      return;
    }

    setCarregando(true);

    const { data: produtos, error: erroProduto } = await supabase
      .from("produto")
      .select("id_produto, ean, descricao, marca")
      .eq("ean", eanBusca);

    if (erroProduto || !produtos || produtos.length === 0) {
      setErro("Nenhum produto encontrado com esse EAN.");
      setCarregando(false);
      return;
    }

    const produto = produtos[0];

    const { data: estoque, error: erroEstoque } = await supabase
      .from("estoque")
      .select("id_produto, quantidade, endereco, validade")
      .eq("id_produto", produto.id_produto)
      .gt("quantidade", 0);

    if (erroEstoque) {
      setErro("Erro ao carregar estoque.");
      setCarregando(false);
      return;
    }

    const resultado = estoque.map(item => {
      const validadeDate = item.validade
        ? new Date(item.validade + "T00:00:00")
        : null;

      return {
        id_produto: item.id_produto,
        ean: produto.ean,
        descricao: produto.descricao,
        marca: produto.marca,
        quantidade: item.quantidade,
        validade: validadeDate
          ? validadeDate.toLocaleDateString("pt-BR")
          : "—",
        validadeRaw: validadeDate,
        enderecoRaw: item.endereco,
        endereco: item.endereco || "VC-01-01-01"
      };
    });

    setDados(resultado);
    setErro(null);
    setCarregando(false);
  };

  const transferir = async (item) => {
    const chave = `${item.id_produto}-${item.endereco}-${item.validade}`;
    const qtdTransferir = quantidades[chave];
    if (!novoEndereco) {
      alert("Informe o novo endereço!");
      return;
    }
    if (!qtdTransferir || qtdTransferir <= 0) {
      alert("Informe uma quantidade válida!");
      return;
    }
    if (qtdTransferir > item.quantidade) {
      alert("Quantidade maior que o saldo disponível!");
      return;
    }

    let updateQuery = supabase
      .from("estoque")
      .update({ quantidade: item.quantidade - qtdTransferir })
      .eq("id_produto", item.id_produto);

    if (item.enderecoRaw === null) {
      updateQuery = updateQuery.is("endereco", null);
    } else {
      updateQuery = updateQuery.eq("endereco", item.enderecoRaw);
    }

    if (item.validadeRaw) {
      updateQuery = updateQuery.eq("validade", item.validadeRaw.toISOString().split("T")[0]);
    }

    const { error: erroUpdate } = await updateQuery;
    if (erroUpdate) {
      alert("Erro ao atualizar saldo original: " + erroUpdate.message);
      return;
    }

    const { data: destino } = await supabase
      .from("estoque")
      .select("id_produto, quantidade")
      .eq("id_produto", item.id_produto)
      .eq("endereco", novoEndereco)
      .eq("validade", item.validadeRaw ? item.validadeRaw.toISOString().split("T")[0] : null);

    if (destino && destino.length > 0) {
      await supabase
        .from("estoque")
        .update({ quantidade: destino[0].quantidade + qtdTransferir })
        .eq("id_produto", item.id_produto)
        .eq("endereco", novoEndereco)
        .eq("validade", item.validadeRaw ? item.validadeRaw.toISOString().split("T")[0] : null);
    } else {
      await supabase
        .from("estoque")
        .insert({
          id_produto: item.id_produto,
          quantidade: qtdTransferir,
          endereco: novoEndereco,
          ean: item.ean,
          validade: item.validadeRaw ? item.validadeRaw.toISOString().split("T")[0] : null
        });
    }

    alert("Transferência realizada com sucesso!");
    buscarPorEAN();
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🔄 Transferência de Endereço</h2>
      {erro && <p style={{ color: "red" }}>{erro}</p>}

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Digite o EAN"
          value={eanBusca}
          onChange={e => setEanBusca(e.target.value)}
          style={{ marginRight: "1rem" }}
        />
        <button onClick={buscarPorEAN}>🔎 Buscar</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Novo endereço"
          value={novoEndereco}
          onChange={e => setNovoEndereco(e.target.value)}
        />
      </div>

      {carregando ? (
        <p>Carregando dados...</p>
      ) : dados.length === 0 ? (
        <p>Nenhum produto encontrado para o EAN informado.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th>EAN</th>
              <th>Descrição</th>
              <th>Marca</th>
              <th>Quantidade Atual</th>
              <th>Validade</th>
              <th>Endereço Atual</th>
              <th>Qtd Transferir</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {dados.map(item => {
              const chave = `${item.id_produto}-${item.endereco}-${item.validade}`;
              return (
                <tr key={chave}>
                  <td>{item.ean}</td>
                  <td>{item.descricao}</td>
                  <td>{item.marca}</td>
                  <td>{item.quantidade}</td>
                  <td>{item.validade}</td>
                  <td>{item.endereco}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      max={item.quantidade}
                      value={quantidades[chave] || ""}
                      onChange={e =>
                        setQuantidades({
                          ...quantidades,
                          [chave]: parseInt(e.target.value, 10)
                        })
                      }
                    />
                  </td>
                  <td>
                    <button onClick={() => transferir(item)}>
                      Transferir
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}