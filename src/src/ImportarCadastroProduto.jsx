import React, { useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient("https://hejiipyxvufhnzeyfhdd.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlamlpcHl4dnVmaG56ZXlmaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjQxNTAsImV4cCI6MjA2ODk0MDE1MH0.fq4G4b7lQktCRreV_CLem06221ZuOlY-miaVilcqfGE");

export default function ImportarCadastroProduto() {
  const [arquivo, setArquivo] = useState(null);
  const [mensagem, setMensagem] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!arquivo) {
      setMensagem("⚠️ Selecione uma planilha Excel (.xlsx).");
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        const produtos = jsonData.map((row) => ({
          ean: row.ean,
          descricao: row["descrição"] || row.descricao,
          marca: row.marca,
        }));

        const { data: inserted, error } = await supabase
          .from("produto")
          .insert(produtos);

        if (error) {
          console.error("Erro ao inserir:", error);
          setMensagem("❌ Erro ao importar os dados.");
        } else {
          setMensagem(`✅ ${inserted.length} produtos importados com sucesso!`);
        }
      };

      reader.readAsArrayBuffer(arquivo);
    } catch (error) {
      setMensagem(`❌ Erro ao processar arquivo: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h2>📥 Importar Cadastro de Produtos</h2>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setArquivo(e.target.files[0])}
          style={{ marginBottom: "1rem" }}
        />
        <br />
        <button
          type="submit"
          style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
        >
          Importar
        </button>
      </form>
      {mensagem && (
        <p style={{ marginTop: "1rem", fontWeight: "bold" }}>{mensagem}</p>
      )}
    </div>
  );
}