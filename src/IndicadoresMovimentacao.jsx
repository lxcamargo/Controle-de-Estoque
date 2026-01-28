import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function IndicadoresMovimentacao() {
  const [totalEntrada, setTotalEntrada] = useState(0);
  const [totalSaida, setTotalSaida] = useState(0);
  const [totalInventario, setTotalInventario] = useState(0);
  const [entradasDiarias, setEntradasDiarias] = useState([]);
  const [saidasDiarias, setSaidasDiarias] = useState([]);

  // filtros
  const [filtroAno, setFiltroAno] = useState("");
  const [filtroMes, setFiltroMes] = useState("");

  useEffect(() => {
    document.title = "Indicadores de Movimentação";

    const carregarKpis = async () => {
      try {
        // 📥 Entradas
        const { data: entradas, error: erroEntrada } = await supabase
          .from("entrada_historico")
          .select("quantidade, data_entrada");

        if (erroEntrada) throw erroEntrada;

        const somaEntrada = entradas?.reduce((acc, item) => acc + item.quantidade, 0) || 0;
        setTotalEntrada(somaEntrada);

        // 📤 Saídas
        const { data: saidas, error: erroSaida } = await supabase
          .from("saida_historico")
          .select("quantidade, data_saida");

        if (erroSaida) throw erroSaida;

        const somaSaida = saidas?.reduce((acc, item) => acc + item.quantidade, 0) || 0;
        setTotalSaida(somaSaida);

        // 📋 Inventário
        const { count: inventariados, error: erroInventario } = await supabase
          .from("inventario")
          .select("*", { count: "exact", head: true });

        if (erroInventario) throw erroInventario;
        setTotalInventario(inventariados || 0);

        // 🔄 Agrupamento diário de entradas
        const entradasAgrupadas = {};
        entradas?.forEach(e => {
          const data = new Date(e.data_entrada);
          const dia = data.toLocaleDateString("pt-BR");
          const ano = data.getFullYear();
          const mes = data.getMonth() + 1;

          if ((filtroAno === "" || ano === Number(filtroAno)) &&
              (filtroMes === "" || mes === Number(filtroMes))) {
            entradasAgrupadas[dia] = (entradasAgrupadas[dia] || 0) + e.quantidade;
          }
        });

        // 🔄 Agrupamento diário de saídas
        const saidasAgrupadas = {};
        saidas?.forEach(s => {
          const data = new Date(s.data_saida);
          const dia = data.toLocaleDateString("pt-BR");
          const ano = data.getFullYear();
          const mes = data.getMonth() + 1;

          if ((filtroAno === "" || ano === Number(filtroAno)) &&
              (filtroMes === "" || mes === Number(filtroMes))) {
            saidasAgrupadas[dia] = (saidasAgrupadas[dia] || 0) + s.quantidade;
          }
        });

        setEntradasDiarias(
          Object.keys(entradasAgrupadas)
            .sort((a, b) => {
              const [dA, mA, yA] = a.split("/");
              const [dB, mB, yB] = b.split("/");
              return new Date(`${yA}-${mA}-${dA}`) - new Date(`${yB}-${mB}-${dB}`);
            })
            .map(dia => ({ dia, quantidade: entradasAgrupadas[dia] }))
        );

        setSaidasDiarias(
          Object.keys(saidasAgrupadas)
            .sort((a, b) => {
              const [dA, mA, yA] = a.split("/");
              const [dB, mB, yB] = b.split("/");
              return new Date(`${yA}-${mA}-${dA}`) - new Date(`${yB}-${mB}-${dB}`);
            })
            .map(dia => ({ dia, quantidade: saidasAgrupadas[dia] }))
        );
      } catch (err) {
        console.error("Erro ao carregar indicadores:", err);
      }
    };

    carregarKpis();
  }, [filtroAno, filtroMes]);

  const chartEntradas = {
    labels: entradasDiarias.map(e => e.dia),
    datasets: [
      {
        label: "Entradas",
        data: entradasDiarias.map(e => e.quantidade),
        borderColor: "green",
        backgroundColor: "rgba(0,128,0,0.3)",
        tension: 0.2
      }
    ]
  };

  const chartSaidas = {
    labels: saidasDiarias.map(s => s.dia),
    datasets: [
      {
        label: "Saídas",
        data: saidasDiarias.map(s => s.quantidade),
        borderColor: "red",
        backgroundColor: "rgba(255,0,0,0.3)",
        tension: 0.2
      }
    ]
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>📊 Indicadores de Movimentação</h1>

      {/* Filtros */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}>
          <option value="">Ano</option>
          {[2024, 2025, 2026].map(ano => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
          <option value="">Mês</option>
          {[...Array(12)].map((_, i) => (
            <option key={i+1} value={i+1}>{String(i+1).padStart(2,"0")}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "2rem", marginTop: "2rem" }}>
        <div style={cardStyle}>
          <h2>📥 Entradas</h2>
          <p style={valorStyle}>{totalEntrada}</p>
        </div>
        <div style={cardStyle}>
          <h2>📤 Saídas</h2>
          <p style={valorStyle}>{totalSaida}</p>
        </div>
        <div style={cardStyle}>
          <h2>📋 Inventariados</h2>
          <p style={valorStyle}>{totalInventario}</p>
        </div>
      </div>

      {/* Gráfico de entradas */}
      <div style={{ marginTop: "3rem" }}>
        <h2>📈 Entradas Diárias</h2>
        <Line data={chartEntradas} />
      </div>

      {/* Gráfico de saídas */}
      <div style={{ marginTop: "3rem" }}>
        <h2>📉 Saídas Diárias</h2>
        <Line data={chartSaidas} />
      </div>
    </div>
  );
}

const cardStyle = {
  backgroundColor: "#f4f4f4",
  padding: "1.5rem",
  borderRadius: "8px",
  width: "200px",
  textAlign: "center",
  boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
};

const valorStyle = {
  fontSize: "2rem",
  fontWeight: "bold",
  marginTop: "0.5rem"
};