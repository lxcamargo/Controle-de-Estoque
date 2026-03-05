import { useState, useEffect, useRef } from "react";
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
  const videoRef = useRef(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // ✅ inicia o detector de código de barras
        if ("BarcodeDetector" in window) {
          const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8"] });

          async function scan() {
            if (videoRef.current) {
              try {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0) {
                  const codigo = barcodes[0].rawValue;
                  if (codigo !== ean) { // evita chamar repetidamente
                    console.log("EAN detectado:", codigo);
                    setEan(codigo);
                    buscarProduto(codigo); // ✅ chama automaticamente
                  }
                }
              } catch (err) {
                console.error("Erro ao detectar código:", err);
              }
            }
            requestAnimationFrame(scan);
          }
          scan();
        } else {
          console.warn("BarcodeDetector não suportado neste navegador.");
        }
      } catch (err) {
        console.error("Erro ao acessar câmera traseira:", err);
      }
    }
    startCamera();
  }, []);

  const buscarProduto = async (codigo = null) => {
    const eanFinal = (codigo || ean).trim();
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
        descricao: data[0].descricao
      });

      const validadesComSaldo = data
        .filter(item => item.quantidade > 0)
        .map(item => item.validade);

      const validadesUnicas = [...new Set(validadesComSaldo)];
      setValidadesDisponiveis(validadesUnicas);

      setValidadeSelecionada("");
      setValidadeDigitada("");
      setUsarValidadeManual(false);
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
      data_contagem: new Date().toISOString()
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
    }
  };

  return (
    <div className="contagem-container">
      <h2>📱 Contagem de Estoque - Loja</h2>

      <div className="camera-box">
        <video ref={videoRef} autoPlay playsInline />
      </div>

      <div className="input-row">
        <input
          type="text"
          value={ean}
          onChange={(e) => setEan(e.target.value)}
          placeholder="Digite ou bipar EAN"
        />
        <button onClick={() => buscarProduto()}>Buscar Produto</button>
      </div>

      {produto && (
        <div className="produto-info">
          <p><strong>Nome:</strong> {produto.nome}</p>
          <p><strong>Marca:</strong> {produto.marca}</p>
          <p><strong>Descrição:</strong> {produto.descricao}</p>
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