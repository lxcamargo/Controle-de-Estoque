import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Html5QrcodeScanner } from "html5-qrcode";

const supabase = createClient(
  "https://hejiipyxvufhnzeyfhdd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlamlpcHl4dnVmaG56ZXlmaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjQxNTAsImV4cCI6MjA2ODk0MDE1MH0.fq4G4b7lQktCRreV_CLem06221ZuOlY-miaVilcqfGE"
);

function TelaPedido() {
  const [ean, setEan] = useState("");
  const [descricaoProduto, setDescricaoProduto] = useState("");
  const [marcaProduto, setMarcaProduto] = useState("");
  const [validadesLoja, setValidadesLoja] = useState([]);
  const [validadesGalpao, setValidadesGalpao] = useState([]);
  const [validadeLojaSelecionada, setValidadeLojaSelecionada] = useState("");
  const [validadeGalpaoSelecionada, setValidadeGalpaoSelecionada] = useState("");
  const [sugestao, setSugestao] = useState(null);
  const [quantidadePedido, setQuantidadePedido] = useState("");
  const [dadosCarregados, setDadosCarregados] = useState(false);

  const buscarDados = async (codigoEan) => {
    if (!codigoEan) return;
    setEan(codigoEan);

    const { data: loja } = await supabase
      .from("estoque_loja")
      .select("quantidade, validade")
      .eq("ean", codigoEan);
    setValidadesLoja(loja || []);

    const { data: galpao } = await supabase
      .from("estoque")
      .select("saldo, validade")
      .eq("ean", codigoEan);
    setValidadesGalpao(galpao || []);

    const { data: produto } = await supabase
      .from("produto")
      .select("descricao, marca")
      .eq("ean", codigoEan)
      .single();
    if (produto) {
      setDescricaoProduto(produto.descricao);
      setMarcaProduto(produto.marca);
    }

    const { data: historico } = await supabase
      .from("saida_loja_historico")
      .select("quantidade, data_saida")
      .eq("ean", codigoEan);
    if (historico && historico.length > 0) {
      const tresMesesAtras = new Date();
      tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
      const ultimos = historico.filter(h => new Date(h.data_saida) >= tresMesesAtras);
      const media = ultimos.reduce((acc, h) => acc + h.quantidade, 0) / (ultimos.length || 1);
      setSugestao(Math.ceil(media));
      setQuantidadePedido(Math.ceil(media));
    }

    setDadosCarregados(true);
  };

  const salvarPedido = async () => {
    if (!ean || !quantidadePedido || !validadeGalpaoSelecionada) return;

    const saldoLoja = validadesLoja.reduce((acc, l) => acc + l.quantidade, 0);
    const saldoGalpao = validadesGalpao.find(g => g.validade === validadeGalpaoSelecionada)?.saldo || 0;

    const { error } = await supabase
      .from("pedidos")
      .insert([{
        ean,
        descricao: descricaoProduto,
        marca: marcaProduto,
        saldo_loja: saldoLoja,
        saldo_galpao: saldoGalpao,
        quantidade: parseInt(quantidadePedido, 10),
        validade: validadeGalpaoSelecionada,
        data: new Date().toISOString()
      }]);

    if (error) {
      alert("Erro ao salvar pedido: " + error.message);
    } else {
      alert("Pedido salvo com sucesso!");
      setQuantidadePedido("");
      setSugestao(null);
      setEan("");
      setDescricaoProduto("");
      setMarcaProduto("");
      setValidadeLojaSelecionada("");
      setValidadeGalpaoSelecionada("");
      setValidadesLoja([]);
      setValidadesGalpao([]);
      setDadosCarregados(false);
    }
  };

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false);

    scanner.render(
      (decodedText) => {
        buscarDados(decodedText.trim());
      },
      (errorMessage) => {
        console.warn("Erro de leitura:", errorMessage);
      }
    );

    return () => {
      scanner.clear().catch(err => console.error("Erro ao limpar scanner", err));
    };
  }, []);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Reposição de Estoque</h2>

      <div style={styles.scanner}>
        <div id="reader" style={{ width: "100%" }}></div>
      </div>

      <div style={styles.inputRow}>
        <label style={styles.label}>
          Digite ou bipar EAN:
          <input
            type="text"
            value={ean}
            onChange={e => setEan(e.target.value)}
            style={styles.input}
          />
        </label>
        <button onClick={() => buscarDados(ean)} style={styles.button}>
          Buscar Produto
        </button>
      </div>

      {dadosCarregados && (
        <div style={styles.card}>
          <p style={styles.info}><strong>EAN:</strong> {ean}</p>
          <p style={styles.info}><strong>Descrição:</strong> {descricaoProduto}</p>
          <p style={styles.info}><strong>Marca:</strong> {marcaProduto}</p>

          <p style={styles.sectionTitle}>Selecione a validade da Loja:</p>
          <div style={styles.flexWrap}>
            {validadesLoja
              .filter(item => item.quantidade > 0)
              .map((item, idx) => (
                <div key={idx} style={styles.loteBox}>
                  <button
                    onClick={() => setValidadeLojaSelecionada(item.validade)}
                    style={{
                      ...styles.button,
                      backgroundColor: validadeLojaSelecionada === item.validade ? "#28a745" : "#007BFF",
                      color: "white"
                    }}
                  >
                    {item.validade}
                  </button>
                  <p style={styles.saldo}>Saldo: {item.quantidade}</p>
                </div>
              ))}
          </div>

          <p style={styles.sectionTitle}>Selecione a validade do Galpão:</p>
          <div style={styles.flexWrap}>
            {validadesGalpao
              .filter(item => item.saldo > 0)
              .map((item, idx) => (
                <div key={idx} style={styles.loteBox}>
                  <button
                    onClick={() => setValidadeGalpaoSelecionada(item.validade)}
                    style={{
                      ...styles.button,
                      backgroundColor: validadeGalpaoSelecionada === item.validade ? "#28a745" : "#007BFF",
                      color: "white"
                    }}
                  >
                    {item.validade}
                  </button>
                  <p style={styles.saldo}>Saldo: {item.saldo}</p>
                </div>
              ))}
          </div>

          <p style={styles.info}><strong>Sugestão de Pedido:</strong> {sugestao}</p>

          <label style={styles.label}>
            Quantidade a pedir:
            <input
              type="number"
              value={quantidadePedido}
              onChange={e => setQuantidadePedido(e.target.value)}
              style={styles.input}
            />
          </label>

          <button onClick={salvarPedido} style={{ ...styles.button, marginTop: 15 }}>
            Salvar Pedido
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { 
    padding: "10px", 
    maxWidth: "100%", 
    fontFamily: "Arial, sans-serif" 
  },
  title: { 
    fontSize: "22px", 
    textAlign: "center", 
    color: "#222", 
    marginBottom: "15px" 
  },
  scanner: { 
    display: "flex", 
    justifyContent: "center", 
    marginBottom: "15px" 
  },
  inputRow: { 
    display: "flex", 
    flexDirection: "column", 
    gap: "10px", 
    marginBottom: "15px" 
  },
  label: { 
    fontSize: "14px", 
    color: "#333", 
    fontWeight: "bold" 
  },
  input: { 
    width: "100%", 
    padding: "10px", 
    marginTop: "5px", 
    borderRadius: "5px", 
    border: "1px solid #ccc", 
    fontSize: "16px" 
  },
  button: { 
    padding: "12px", 
    borderRadius: "6px", 
    border: "none", 
    cursor: "pointer", 
    fontWeight: "bold", 
    width: "100%", 
    backgroundColor: "#007BFF", 
    color: "white", 
    fontSize: "16px" 
  },
  card: { 
    backgroundColor: "#fff", 
    padding: "15px", 
    borderRadius: "8px", 
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)", 
    color: "#222" 
  },
  info: { 
    fontSize: "16px", 
    marginBottom: "8px" 
  },
  sectionTitle: { 
    fontSize: "15px", 
    fontWeight: "bold", 
    marginTop: "12px", 
    marginBottom: "8px", 
    color: "#444" 
  },
  flexWrap: { 
    display: "flex", 
    flexWrap: "wrap", 
    gap: "10px" 
  },
  loteBox: { 
    flex: "1 1 100%", 
    textAlign: "center", 
    marginBottom: "10px" 
  },
  saldo: { 
    marginTop: "5px", 
    fontSize: "14px", 
    color: "#555" 
  }
};

export default TelaPedido;
