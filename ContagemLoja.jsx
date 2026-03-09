import { useState, useEffect } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "./supabaseClient";
import "./contagemLoja.css"; // ✅ novo CSS responsivo

export default function ContagemLoja() {
  const [ean, setEan] = useState("");
  const [produto, setProduto] = useState(null);
  const [validadeSelecionada, setValidadeSelecionada] = useState("");
  const [validadesDisponiveis, setValidadesDisponiveis] = useState([]);
  const [validadeDigitada, setValidadeDigitada] = useState("");
  const [usarValidadeManual, setUsarValidadeManual] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const [consolidado, setConsolidado] = useState([]); // ✅ novo estado

  // ✅ função para iniciar scanner
  const iniciarScanner = () => {
    const scanner = new Html5QrcodeScanner("ean-scanner", {
      fps: 10,
      qrbox: { width: 250, height: 100 },
      aspectRatio: 1.5,
    });

    scanner.render(
      async (codigo) => {
        await scanner.clear();
        const codigoLimpo = codigo.replace(/[^\d]/g, "").trim();
        console.log("EAN detectado:", codigoLimpo);
        setEan(codigoLimpo);
        buscarProduto(codigoLimpo);
        buscarConsolidado(codigoLimpo); // ✅ busca consolidado também
      },
      (errorMessage) => {
        if (errorMessage.includes("NotFoundException")) return;
        console.warn("Erro de leitura:", errorMessage);
      }
    );
  };

  useEffect(() => {
    iniciarScanner();
    buscarConsolidado(); // ✅ carrega consolidação ao abrir
    return () => {
      const scanner = new Html5QrcodeScanner("ean-scanner", {});
      scanner.clear().catch((err) => console.error("Erro ao limpar scanner:", err));
    };
  }, []);

  const buscarProduto = async (codigo = null) => {
    const eanFinal = (codigo || ean).replace(/[^\d]/g, "").trim();
    if (!eanFinal) return;

    const { data, error } = await supabase
      .from("estoque_loja")
      .select("nome, marca, descricao, validade, quantidade")
      .eq("ean", eanFinal);

    if (error || !data || data.length === 0) {
      alert("Produto não encontrado!");
      setProduto(null);
      setValidadesDisponiveis([]);
      setValidadeDigitada("");
    } else {
      setProduto({
        nome: data[0].nome,
        marca: data[0].marca,
        descricao: data[0].descricao,
      });

      const validadesComSaldo = data
        .filter((item) => item.quantidade > 0)
        .map((item) => item.validade);

      const validadesUnicas = [...new Set(validadesComSaldo)];
      setValidadesDisponiveis(validadesUnicas);

      setValidadeSelecionada("");
      setValidadeDigitada("");
      setUsarValidadeManual(false);
    }
  };

  // ✅ consolida direto no React
  const consolidarDados = (dados) => {
    const mapa = {};
    dados.forEach((item) => {
      const chave = `${item.ean}-${item.validade}`;
      if (!mapa[chave]) {
        mapa[chave] = {
          ean: item.ean,
          validade: item.validade,
          descricao: item.descricao,
          marca: item.marca,
          quantidade: 0,
        };
      }
      mapa[chave].quantidade += item.quantidade;
    });
    return Object.values(mapa);
  };

  const buscarConsolidado = async (codigo = null) => {
    const eanFinal = (codigo || ean).replace(/[^\d]/g, "").trim();

    let query = supabase.from("contagem_loja")
      .select("ean, validade, descricao, marca, quantidade");

    if (eanFinal) {
      query = query.eq("ean", eanFinal);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao buscar consolidado:", error);
      setConsolidado([]);
    } else {
      const dadosConsolidados = consolidarDados(data);
      setConsolidado(dadosConsolidados);
    }
  };

  const salvarContagem = async () => {
    const validadeFinal = usarValidadeManual ? validadeDigitada : validadeSelecionada;

    if (!ean || !validadeFinal || !quantidade) {
      alert("Preencha todos os campos!");
      return;
    }

    const { error } = await supabase.from("contagem_loja").insert({
      ean: ean.trim(),
      descricao: produto?.descricao || "",
      marca: produto?.marca || "",
      validade: validadeFinal,
      quantidade: parseInt(quantidade, 10),
      data_contagem: new Date().toISOString(),
    });

    if (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar contagem!");
    } else {
      alert("Contagem salva com sucesso!");
      setEan("");
      setProduto(null);
      setValidadeSelecionada("");
      setValidadesDisponiveis([]);
      setValidadeDigitada("");
      setUsarValidadeManual(false);
      setQuantidade("");
      buscarConsolidado(); // ✅ atualiza consolidação após salvar
      iniciarScanner();
    }
  };

  return (
    <div className="contagem-container">
      <h2>📱 Contagem de Estoque - Loja</h2>

      <div className="camera-box">
        <div id="ean-scanner" style={{ width: "100%" }}></div>
      </div>

      <div className="input-row">
        <input
          type="text"
          value={ean}
          onChange={(e) => setEan(e.target.value)}
          placeholder="Digite ou bipar EAN"
        />
        <button onClick={() => { buscarProduto(); buscarConsolidado(); }}>
          Buscar Produto
        </button>
      </div>

      {produto && (
        <div className="produto-info">
          <p><strong>Nome:</strong> {produto.nome}</p>
          <p><strong>Marca:</strong> {produto.marca}</p>
          <p><strong>Descrição:</strong> {produto.descricao}</p>
        </div>
      )}

      {/* ✅ bloco novo para mostrar consolidação */}
      {consolidado && consolidado.length > 0 && (
        <div className="consolidado-box">
          <h3>📊 Ajuste de Inventário Consolidado</h3>
          {consolidado.map((item, idx) => (
            <p key={idx}>
              <strong>EAN:</strong> {item.ean} | 
              <strong>Validade:</strong> {item.validade} | 
              <strong>Total:</strong> {item.quantidade}
            </p>
          ))}
        </div>
      )}

      <div className="checkbox-row">
        <label>
          <input
            type="checkbox"
            checked={usarValidadeManual}
            onChange={(e) => {
              setUsarValidadeManual(e.target.checked);
              setValidadeSelecionada("");
              setValidadeDigitada("");
            }}
          /> Digitar validade manualmente
        </label>
      </div>

      {!usarValidadeManual && validadesDisponiveis.length > 0 && (
        <div className="validades-box">
          <label>Selecione a validade:</label>
          <div className="validades-list">
            {validadesDisponiveis.map((val, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setValidadeSelecionada(val);
                  setValidadeDigitada("");
                }}
                className={validadeSelecionada === val ? "val-btn selected" : "val-btn"}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      )}

      {usarValidadeManual && (
        <div className="input-box">
          <label>Digite a validade:</label>
          <input
            type="date"
            value={validadeDigitada}
            onChange={(e) => {
              setValidadeDigitada(e.target.value);
              setValidadeSelecionada("");
            }}
          />
        </div>
      )}

      <div className="input-box">
        <label>Quantidade:</label>
        <input
          type="number"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          placeholder="Digite a quantidade"
        />
      </div>

      <button className="salvar-btn" onClick={salvarContagem}>
        Salvar Contagem
      </button>
    </div>
  );
}