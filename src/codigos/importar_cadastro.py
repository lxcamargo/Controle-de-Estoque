import pandas as pd
from config_supabase import supabase

def ean_valido(ean):
    ean = str(ean).strip()
    return ean.isdigit() and len(ean) == 13

def importar_cadastro_excel(caminho_arquivo):
    try:
        df = pd.read_excel(caminho_arquivo)
        df.columns = [col.lower().strip() for col in df.columns]

        registros_importados = 0
        registros_duplicados = 0
        registros_invalidos = 0

        for _, linha in df.iterrows():
            try:
                ean = str(linha["ean"]).strip().upper()
                marca = str(linha["marca"]).strip().title()
                descricao = str(linha["descricao"]).strip().title()

                if not ean_valido(ean) or not marca or not descricao:
                    registros_invalidos += 1
                    continue

                # Verifica se já existe
                res = supabase.table("produto").select("id").eq("ean", ean).execute()
                if res.data:
                    registros_duplicados += 1
                    continue

                produto = {
                    "ean": ean,
                    "marca": marca,
                    "descricao": descricao
                }

                supabase.table("produto").insert(produto).execute()
                registros_importados += 1

            except Exception as item_erro:
                print(f"❌ Erro ao importar produto: {item_erro}")
                registros_invalidos += 1

        print(f"\n✅ Importação finalizada:")
        print(f"📦 {registros_importados} produtos importados")
        print(f"🔁 {registros_duplicados} já estavam cadastrados")
        print(f"⚠️ {registros_invalidos} registros ignorados por erro ou dados inválidos")

    except Exception as erro:
        print(f"❌ Erro geral na importação: {erro}")