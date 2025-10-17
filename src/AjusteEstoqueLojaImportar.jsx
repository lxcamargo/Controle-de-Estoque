import React, { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

const AjusteEstoqueLojaImportar = () => {
  const [arquivo, setArquivo] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [dadosPlanilha, setDadosPlanilha] = useState([]);

  const handleUpload = async () => {
    if (!arquivo) {
      setMensagem("Selecione um arquivo primeiro.");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const primeiraAba = workbook.SheetNames[0];
        const planilha = workbook.Sheets[primeiraAba];
        const dados = XLSX.utils.sheet_to_json(planilha, { raw: true });

        const dadosConvertidos = dados.map((linha) => {
          let validadeFormatada = linha.validade;

          if (typeof linha.validade === "number") {
            const parsed = XLSX.SSF.parse_date_code(linha.validade);
            if (parsed) {
              const { y, m, d } = parsed;
              validadeFormatada = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            }
          }

          return {
            ean: linha.EAN,
            nome: linha.nome,
            marca: linha.marca,
            quantidade: linha.quantidade,
            validade: validadeFormatada,
          };
        });

        setDadosPlanilha(dadosConvertidos);
        setMensagem("✅ Planilha carregada com sucesso.");

        // Enviar para o banco via Supabase
        const { error } = await supabase
          .from("ajuste_estoque_loja")
          .insert(dadosConvertidos);

        if (error) {
          console.error("Erro ao gravar no banco:", error.message);
          setMensagem("❌ Erro ao gravar os dados no banco.");
        } else {
          setMensagem("✅ Dados gravados com sucesso na tabela ajuste_estoque_loja.");
        }
      };
      reader.readAsArrayBuffer(arquivo);
    } catch (error) {
      setMensagem("Erro ao ler a planilha.");
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📥 Importar Planilha de Ajuste de Estoque</h2>

      <p style={{ marginBottom: "1rem" }}>
        A planilha deve conter os seguintes cabeçalhos na primeira linha:
      </p>

      <table style={{ borderCollapse: "collapse", marginBottom: "1rem" }}>
        <thead>
          <tr>
            <th style={th}>EAN</th>
            <th style={th}>nome</th>
            <th style={th}>marca</th>
            <th style={th}>quantidade</th>
            <th style={th}>validade</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>7891234567890</td>
            <td style={td}>Álcool 70%</td>
            <td style={td}>Zulu</td>
            <td style={td}>5</td>
            <td style={td}>2025-11-30</td>
          </tr>
        </tbody>
      </table>

      <input type="file" accept=".xlsx" onChange={(e) => setArquivo(e.target.files[0])} />
      <button onClick={handleUpload} style={{ marginLeft: "1rem" }}>
        Ler e Gravar
      </button>

      {mensagem && <p style={{ marginTop: "1rem" }}>{mensagem}</p>}

      {dadosPlanilha.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3>📋 Dados da Planilha:</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={th}>EAN</th>
                <th style={th}>nome</th>
                <th style={th}>marca</th>
                <th style={th}>quantidade</th>
                <th style={th}>validade</th>
              </tr>
            </thead>
            <tbody>
              {dadosPlanilha.map((linha, index) => (
                <tr key={index}>
                  <td style={td}>{linha.ean}</td>
                  <td style={td}>{linha.nome}</td>
                  <td style={td}>{linha.marca}</td>
                  <td style={td}>{linha.quantidade}</td>
                  <td style={td}>{linha.validade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const th = {
  border: "1px solid #ccc",
  padding: "8px",
  backgroundColor: "#f0f0f0",
  fontWeight: "bold"
};

const td = {
  border: "1px solid #ccc",
  padding: "8px"
};

export default AjusteEstoqueLojaImportar;