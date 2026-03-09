import pandas as pd
import os
from config_supabase import supabase
from datetime import datetime

def importar_estoque_excel(caminho_arquivo):
    if not os.path.exists(caminho_arquivo):
        print(f"❌ Arquivo não encontrado: {caminho_arquivo}")
        return {
            "registros_importados": 0,
            "erros": [f"Arquivo não encontrado: {caminho_arquivo}"]
        }

    try:
        df = pd.read_excel(caminho_arquivo, engine="openpyxl")
        print("✅ Arquivo lido com sucesso. Colunas encontradas:", df.columns.tolist())

        df.columns = [col.lower().strip() for col in df.columns]

        registros_importados = 0
        erros = []

        for i, linha in df.iterrows():
            try:
                ean = str(linha.get("ean", "")).strip()
                validade_raw = linha.get("validade", "")
                quantidade_raw = linha.get("quantidade", "")
                descricao = str(linha.get("descricao", "")).strip()
                marca = str(linha.get("marca", "")).strip()

                if not all([ean, validade_raw, quantidade_raw]):
                    raise ValueError("Campos obrigatórios ausentes")

                quantidade = int(quantidade_raw) if not pd.isnull(quantidade_raw) else 0
                if quantidade <= 0:
                    raise ValueError("Quantidade inválida ou zero")

                validade = pd.to_datetime(validade_raw, errors="coerce")
                if pd.isnull(validade):
                    raise ValueError(f"Data de validade inválida: {validade_raw}")
                validade = validade.date().isoformat()

                # 🔍 Buscar id_produto pelo EAN
                produto_resp = supabase.table("produto").select("id_produto").eq("ean", ean).single().execute()
                id_produto = produto_resp.data["id_produto"] if produto_resp.data else None

                if not id_produto:
                    raise ValueError(f"Produto com EAN {ean} não encontrado na tabela 'produto'")

                item = {
                    "id_produto": id_produto,
                    "ean": ean,
                    "descricao": descricao,
                    "marca": marca,
                    "validade": validade,
                    "quantidade": quantidade,
                }

                supabase.table("estoque").insert(item).execute()
                registros_importados += 1

            except Exception as erro_item:
                erro_msg = f"Linha {i+1}: {erro_item}"
                erros.append(erro_msg)
                print(f"❌ {erro_msg}")

        print(f"✅ Importação concluída com {registros_importados} registros.")
        if erros:
            print("🛑 Erros encontrados:")
            for erro in erros:
                print(erro)

        return {
            "registros_importados": registros_importados,
            "erros": erros
        }

    except Exception as erro_geral:
        erro_msg = f"Erro geral na importação: {erro_geral}"
        print(f"❌ {erro_msg}")
        return {
            "registros_importados": 0,
            "erros": [erro_msg]
        }