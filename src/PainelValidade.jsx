import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

export default function PainelValidade() {
  const [estoque, setEstoque] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [erro, setErro] = useState(null);

  const [filtroEAN, setFiltroEAN] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroMes, setFiltroMes] = useState("");
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroQtdLojaOperador, setFiltroQtdLojaOperador] = useState(""); // operador
  const [filtroQtdLojaValor, setFiltroQtdLojaValor] = useState("");       // valor

  useEffect(() => {
    document.title = "Painel de Validade - Galpão";
  }, []);

  useEffect(() => {
    const carregarDados = async () => {
      const { data: dadosEstoque, error: erroEstoque } = await supabase
        .from("estoque")
        .select("*")
        .gt("quantidade", 0);

      const { data: dadosProdutos, error: erroProdutos } = await supabase
        .from("produto")
        .select("*");

      if (erroEstoque || erroProdutos) {
        setErro("Erro ao carregar dados.");
        setEstoque([]);
        setProdutos([]);
      } else {
        setEstoque(dadosEstoque);
        setProdutos(dadosProdutos);
        setErro(null);
      }
    };

    carregarDados();
  }, []);

  // Consolida os saldos por EAN + validade
  const dadosConsolidados = {};
  estoque.forEach(item => {
    const produto = produtos.find(p => p.id_produto === item.id_produto);
    const validadeDate = item.validade ? new Date(item.validade + "T00:00:00") : null;
    if (!validadeDate) return;

    const chave = `${produto?.ean || "—"}-${validadeDate.toISOString().split("T")[0]}`;

    if (!dadosConsolidados[chave]) {
      dadosConsolidados[chave] = {
        ean: produto?.ean || "—",
        descricao: produto?.descricao || "—",
        marca: produto?.marca || "—",
        quantidade: item.quantidade || 0,
        saldoLoja: item.saldo_loja || 0,
        validade: validadeDate.toLocaleDateString("pt-BR"),
        validadeRaw: validadeDate
      };
    } else {
      dadosConsolidados[chave].quantidade += item.quantidade || 0;
      dadosConsolidados[chave].saldoLoja += item.saldo_loja || 0;
    }
  });

  const dadosOrdenados = Object.values(dadosConsolidados).sort(
    (a, b) => a.validadeRaw - b.validadeRaw
  );

  const dadosFiltrados = dadosOrdenados.filter(item => {
    const validade = item.validadeRaw;
    const mes = validade?.getMonth() + 1;
    const ano = validade?.getFullYear();

    const saldo = Number(item.saldoLoja);
    const valor = Number(filtroQtdLojaValor);

    let condicaoQtdLoja = true;
    if (filtroQtdLojaOperador && filtroQtdLojaValor !== "") {
      switch (filtroQtdLojaOperador) {
        case "=":  condicaoQtdLoja = saldo === valor; break;
        case "<>": condicaoQtdLoja = saldo !== valor; break;
        case "<":  condicaoQtdLoja = saldo < valor; break;
        case "<=": condicaoQtdLoja = saldo <= valor; break;
        case ">":  condicaoQtdLoja = saldo > valor; break;
        case ">=": condicaoQtdLoja = saldo >= valor; break;
        default:   condicaoQtdLoja = true;
      }
    }

    return (
      item.ean.toLowerCase().includes(filtroEAN.toLowerCase()) &&
      item.marca.toLowerCase().includes(filtroMarca.toLowerCase()) &&
      item.descricao.toLowerCase().includes(filtroDescricao.toLowerCase()) &&
      (filtroMes === "" || mes === parseInt(filtroMes)) &&
      (filtroAno === "" || ano === parseInt(filtroAno)) &&
      condicaoQtdLoja
    );
  });

  const estiloValidadeFaixa = data => {
    if (!data) return {};
    const hoje = new Date();
    const dias = (data - hoje) / (1000 * 60 * 60 * 24);

    if (dias >= 30 && dias <= 90) return { backgroundColor: "#ffd6d6" };
    if (dias > 90 && dias <= 180) return { backgroundColor: "#fff3cc" };
    if (dias > 180) return { backgroundColor: "#d6f5d6" };
    return { backgroundColor: "#f2f2f2" };
  };

  const estiloBolinha = data => {
    if (!data) return { backgroundColor: "#cccccc" };
    const hoje = new Date();
    const dias = (data - hoje) / (1000 * 60 * 60 * 24);

    if (dias < 30) return { backgroundColor: "#b71c1c" };
    if (dias >= 30 && dias <= 90) return { backgroundColor: "#f44336" };
    if (dias > 90 && dias <= 180) return { backgroundColor: "#ff9800" };
    if (dias > 180) return { backgroundColor: "#4caf50" };
    return { backgroundColor: "#cccccc" };
  };

  const exportarParaExcel = () => {
    const dadosParaExportar = dadosFiltrados.map(item => ({
      EAN: item.ean,
      Descrição: item.descricao,
      Marca: item.marca,
      Quantidade: item.quantidade,
      SaldoLoja: item.saldoLoja,
      Validade: item.validade
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Validades");

    XLSX.writeFile(workbook, "painel-validade.xlsx");
  };

  const anosDisponiveis = Array.from(
    new Set(
      estoque
        .map(item => item.validade)
        .filter(Boolean)
        .map(data => {
          const ano = new Date(data + "T00:00:00").getFullYear();
          return !isNaN(ano) ? ano : null;
        })
        .filter(Boolean)
    )
  ).sort((a, b) => a - b);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📊 Painel de Validade</h2>
      <p style={{ fontStyle: "italic", marginBottom: "1rem" }}>
        Produtos ordenados por vencimento. Cores indicam faixas de atenção:
        <br />
        <span style={{ color: "#b71c1c" }}>🔴 Vencido ou &lt; 30 dias</span> |{" "}
        <span style={{ color: "#f44336" }}>🔴 30–90 dias</span> |{" "}
        <span style={{ color: "#ff9800" }}>🟠 91–180 dias</span> |{" "}
        <span style={{ color: "#4caf50" }}>🟢 +180 dias</span>
      </p>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <div style={{
          backgroundColor: "#f0f4f8",
          padding: "0.75rem 1.25rem",
          borderRadius: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          minWidth: "160px",
          textAlign: "center"
        }}>
          <h4 style={{ margin: 0, fontSize: "1rem" }}>📦 Saldo Total</h4>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#2e7d32", margin: 0 }}>
            {dadosFiltrados.reduce((acc, item) => acc + item.quantidade, 0)}
          </p>
        </div>
        <div style={{
          backgroundColor: "#f0f4f8",
          padding: "0.75rem 1.25rem",
          borderRadius: "6px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          minWidth: "160px",
          textAlign: "center"
        }}>
                    <h4 style={{ margin: 0, fontSize: "1rem" }}>🔢 EANs Únicos</h4>
          <p style={{ fontSize: "1.4rem", fontWeight: "bold", color: "#2e7d32", margin: 0 }}>
            {new Set(dadosFiltrados.map(item => item.ean)).size}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Filtrar por EAN"
          value={filtroEAN}
          onChange={e => setFiltroEAN(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por Marca"
          value={filtroMarca}
          onChange={e => setFiltroMarca(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por Descrição"
          value={filtroDescricao}
          onChange={e => setFiltroDescricao(e.target.value)}
        />
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
          <option value="">Mês</option>
          {[...Array(12)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {String(i + 1).padStart(2, "0")}
            </option>
          ))}
        </select>
        <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
          <option value="">Ano</option>
          {anosDisponiveis.map(ano => (
            <option key={ano} value={ano}>
              {ano}
            </option>
          ))}
        </select>
        <select value={filtroQtdLojaOperador} onChange={e => setFiltroQtdLojaOperador(e.target.value)}>
          <option value="">Operador</option>
          <option value="=">=</option>
          <option value="<>">{"<>"}</option>
          <option value="<">{"<"}</option>
          <option value="<=">{"<="}</option>
          <option value=">">{">"}</option>
          <option value=">=">{">="}</option>
        </select>
        <input
          type="number"
          placeholder="Qtd Loja valor"
          value={filtroQtdLojaValor}
          onChange={e => setFiltroQtdLojaValor(e.target.value)}
        />
        <button onClick={exportarParaExcel}>📥 Exportar</button>
      </div>

      {erro && <p style={{ color: "red" }}>{erro}</p>}

      {dadosFiltrados.length === 0 ? (
        <p>Nenhum produto encontrado com os filtros aplicados.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f0f0f0" }}>
            <tr>
              <th>EAN</th>
              <th>Descrição</th>
              <th>Marca</th>
              <th>Qtd Galpão</th>
              <th>Qtd Loja</th>
              <th>Validade</th>
            </tr>
          </thead>
          <tbody>
            {dadosFiltrados.map((item, index) => (
              <tr key={index} style={estiloValidadeFaixa(item.validadeRaw)}>
                <td>{item.ean}</td>
                <td style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      ...estiloBolinha(item.validadeRaw)
                    }}
                  ></div>
                  {item.descricao}
                </td>
                <td>{item.marca}</td>
                <td>{item.quantidade}</td>
                <td>{item.saldoLoja}</td>
                <td>{item.validade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}