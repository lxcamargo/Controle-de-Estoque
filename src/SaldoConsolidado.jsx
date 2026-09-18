import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import * as XLSX from "xlsx";

// Normaliza valores para comparação segura (remove diferenças de tipo/espaço)
const normalizar = (valor) => String(valor ?? "").trim();

export default function SaldoConsolidado() {
  const [estoque, setEstoque] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [saldoWMS, setSaldoWMS] = useState([]);
  const [erro, setErro] = useState(null);

  const [filtroEAN, setFiltroEAN] = useState("");
  const [filtroMarca, setFiltroMarca] = useState("");
  const [filtroDescricao, setFiltroDescricao] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");

  useEffect(() => {
    document.title = "Saldo Consolidado";
  }, []);

  useEffect(() => {
    // ✅ Busca todas as páginas de uma tabela, contornando o limite padrão
    // de 1000 linhas por consulta do Supabase
    const buscarTodosRegistros = async (tabela, aplicarFiltro) => {
      const TAMANHO_PAGINA = 1000;
      let pagina = 0;
      let todos = [];

      while (true) {
        let query = supabase.from(tabela).select("*");
        if (aplicarFiltro) query = aplicarFiltro(query);
        query = query.range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);

        const { data, error } = await query;
        if (error) throw error;
        if (!data || data.length === 0) break;

        todos = todos.concat(data);
        if (data.length < TAMANHO_PAGINA) break; // última página
        pagina++;
      }

      return todos;
    };

    const carregarDados = async () => {
      try {
        const [dadosEstoque, dadosProdutos, dadosWMS] = await Promise.all([
          buscarTodosRegistros("estoque", (q) => q.gt("quantidade", 0)),
          buscarTodosRegistros("produto"),
          buscarTodosRegistros("saldo_wms"),
        ]);

        // 🔎 LOGS DE DEPURAÇÃO — veja no console (F12) a estrutura real dos dados
        console.log(`Total estoque: ${dadosEstoque.length} | produto: ${dadosProdutos.length} | saldo_wms: ${dadosWMS.length}`);

        setEstoque(dadosEstoque);
        setProdutos(dadosProdutos);
        setSaldoWMS(dadosWMS);
        setErro(null);
      } catch (err) {
        setErro("Erro ao carregar dados.");
        setEstoque([]);
        setProdutos([]);
        setSaldoWMS([]);
      }
    };

    carregarDados();
  }, []);

  // ✅ Mapas de busca rápida, com chaves normalizadas (string + trim)
  // A tabela estoque já vem com o EAN direto — o match com produto deve ser por EAN,
  // não por id_produto (esse campo não existe na tabela estoque).
  const produtoPorEan = produtos.reduce((mapa, p) => {
    mapa[normalizar(p.ean)] = p;
    return mapa;
  }, {});

  const wmsPorEan = saldoWMS.reduce((mapa, w) => {
    const chaveW = normalizar(w.ean);
    if (!mapa[chaveW]) {
      mapa[chaveW] = { quantidade: 0 };
    }
    // ✅ Soma o saldo de todas as linhas do mesmo EAN (pode haver mais de um galpão)
    mapa[chaveW].quantidade += w.quantidade || 0;
    return mapa;
  }, {});

  const dadosAgrupados = Object.values(
    estoque.reduce((acc, item) => {
      const chave = normalizar(item.ean) || "—";
      const produto = produtoPorEan[chave];

      if (!acc[chave]) {
        const wms = wmsPorEan[chave];
        acc[chave] = {
          ean: chave,
          descricao: produto?.descricao || item.nome || "—",
          marca: produto?.marca || item.marca || "—",
          quantidade: 0,
          quantidadeWMS: wms?.quantidade || 0,
          status: ""
        };
      } else {
        // ✅ Se ainda não temos descrição/marca (ex: primeiro lote sem essa info),
        // tenta completar usando os dados de outro lote do mesmo EAN
        if (acc[chave].descricao === "—" && (produto?.descricao || item.nome)) {
          acc[chave].descricao = produto?.descricao || item.nome;
        }
        if (acc[chave].marca === "—" && (produto?.marca || item.marca)) {
          acc[chave].marca = produto?.marca || item.marca;
        }
      }

      acc[chave].quantidade += item.quantidade || 0;

      // ✅ Lógica do status
      if (acc[chave].quantidade > acc[chave].quantidadeWMS) {
        acc[chave].status = "Saldo WMS menor";
      } else if (acc[chave].quantidade < acc[chave].quantidadeWMS) {
        acc[chave].status = "Saldo WMS maior";
      } else {
        acc[chave].status = "Saldo OK";
      }

      return acc;
    }, {})
  );

  const dadosFiltrados = dadosAgrupados.filter(item =>
    item.ean.toLowerCase().includes(filtroEAN.toLowerCase()) &&
    item.marca.toLowerCase().includes(filtroMarca.toLowerCase()) &&
    item.descricao.toLowerCase().includes(filtroDescricao.toLowerCase()) &&
    (filtroStatus === "" || item.status === filtroStatus)
  );

  const exportarParaExcel = () => {
    const dadosParaExportar = dadosFiltrados.map(item => ({
      EAN: item.ean,
      Descrição: item.descricao,
      Marca: item.marca,
      "Quantidade Estoque": item.quantidade,
      "Quantidade - WMS": item.quantidadeWMS,
      Status: item.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Saldo Consolidado");

    XLSX.writeFile(workbook, "saldo-consolidado.xlsx");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📦 Saldo Consolidado</h2>

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
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos os Status</option>
          <option value="Saldo OK">Saldo OK</option>
          <option value="Saldo WMS menor">Saldo WMS menor</option>
          <option value="Saldo WMS maior">Saldo WMS maior</option>
        </select>
        <button onClick={exportarParaExcel}>📥 Exportar</button>
      </div>

      {dadosFiltrados.length === 0 ? (
        <p>Nenhum produto encontrado com os filtros aplicados.</p>
      ) : (
        <table border="1" cellPadding="8" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f0f0f0" }}>
            <tr>
              <th>EAN</th>
              <th>Descrição</th>
              <th>Marca</th>
              <th>Quantidade</th>
              <th>Quantidade - WMS</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {dadosFiltrados.map((item, index) => (
              <tr key={index}>
                <td>{item.ean}</td>
                <td>{item.descricao}</td>
                <td>{item.marca}</td>
                <td>{item.quantidade}</td>
                <td>{item.quantidadeWMS}</td>
                <td>{item.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
