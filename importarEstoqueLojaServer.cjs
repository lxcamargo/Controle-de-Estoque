const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
  "https://YOUR_PROJECT_ID.supabase.co",
  "YOUR_SERVICE_ROLE_KEY"
);

app.post("/importar-estoque-loja", upload.single("file"), async (req, res) => {
  try {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const dados = XLSX.utils.sheet_to_json(sheet);

    const erros = [];
    let registrosImportados = 0;

    for (const item of dados) {
      const { ean, nome, marca, lote, validade, quantidade } = item;

      if (!ean || !nome || !quantidade) {
        erros.push(`Linha inválida: ${JSON.stringify(item)}`);
        continue;
      }

      const saldo = quantidade;

      const { error } = await supabase
        .from("estoque_loja")
        .insert([{ ean, nome, marca, lote, validade, quantidade, saldo }]);

      if (error) {
        erros.push(`Erro ao inserir ${ean}: ${error.message}`);
      } else {
        registrosImportados++;
      }
    }

    res.json({ registros_importados: registrosImportados, erros });
  } catch (err) {
    res.status(500).json({ erro: "Erro ao processar a planilha." });
  }
});

app.listen(8002, () => {
  console.log("🚀 Servidor de importação rodando na porta 8002");
});