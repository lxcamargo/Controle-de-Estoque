import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "./supabaseClient";

const ScannerInventario = ({ usuarioId, onProdutoSelecionado }) => {
  const [ean, setEan] = useState("");

  useEffect(() => {
    const scanner = new Html5QrcodeScanner("ean-scanner", {
      fps: 10,
      qrbox: { width: 250, height: 100 },
      aspectRatio: 1.5,
    });

    scanner.render(
      async (codigo) => {
        await scanner.clear();
        buscarProdutoPorEan(codigo);
      },
      (errorMessage) => {
        if (errorMessage.includes("NotFoundException")) return;
        console.warn("Erro de leitura:", errorMessage);
      }
    );

    return () => {
      scanner.clear().catch((err) => console.error("Erro ao limpar scanner:", err));
    };
  }, []);

  const buscarProdutoPorEan = async (codigoEan) => {
    const codigoLimpo = codigoEan.replace(/[^\d]/g, "");
    setEan(codigoLimpo);

    const { data: estoques, error } = await supabase
      .from("estoque")
      .select("quantidade, validade, nome, marca")
      .eq("ean", codigoLimpo)
      .gt("quantidade", 0);

    if (error || !estoques || estoques.length === 0) {
      alert("Produto não encontrado ou sem saldo disponível.");
      return;
    }

    const estoqueValido = estoques.find((item) => item.nome && item.marca) || estoques[0];

    const validadesUnicas = Array.from(
      new Set(
        estoques
          .map((item) =>
            item.validade ? new Date(item.validade).toISOString().slice(0, 10) : null
          )
          .filter(Boolean)
      )
    );

    if (onProdutoSelecionado) {
      onProdutoSelecionado({
        ean: codigoLimpo,
        descricao: estoqueValido.nome || "",
        marca: estoqueValido.marca || "",
        validade: validadesUnicas[0] || "",
        validades: validadesUnicas,
      });
    }
  };

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div id="ean-scanner" style={{ width: "100%" }}></div>
    </div>
  );
};

export default ScannerInventario;