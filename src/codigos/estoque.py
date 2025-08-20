from datetime import datetime
import json
from src.codigos.config_supabase import supabase
from src.codigos.auth import registrar_movimentacao
from src.codigos.validacao_produto import validar_campos  # usamos apenas validar_campos aqui

# 📥 Entrada de Produtos com validação
def entrada_produto(ean, validade, quantidade, usuario_id, descricao, marca):
    try:
        produto = {
            "ean": ean,
            "validade": validade,
            "quantidade": quantidade,
            "nome": descricao or "GENÉRICO",
            "marca": marca or "Marca desconhecida"
        }

        produto = validar_campos(produto)

        if not produto or not all(k in produto for k in ["ean", "validade", "quantidade", "nome", "marca"]):
            raise ValueError("Produto inválido após validação")

        validade_formatada = produto["validade"]

        estoque = supabase.table("estoque").select("*") \
            .eq("ean", produto["ean"]) \
            .eq("validade", validade_formatada).execute()

        if estoque.data:
            registro = estoque.data[0]
            novo_saldo = registro["saldo"] + produto["quantidade"]
            supabase.table("estoque").update({"saldo": novo_saldo}).eq("id", registro["id"]).execute()
        else:
            novo = {
                "ean": produto["ean"],
                "validade": validade_formatada,
                "saldo": produto["quantidade"],
                "nome": produto["nome"],
                "marca": produto["marca"]
            }

            print("📦 JSON enviado ao Supabase:")
            print(json.dumps(novo, indent=2))

            try:
                resposta = supabase.table("estoque").insert([novo]).execute()
                print("📨 Resposta do Supabase:")
                print(resposta)
            except Exception as e:
                print("❌ Erro ao inserir no Supabase:")
                print(str(e))
                raise e

        registrar_movimentacao(usuario_id, "entrada", produto["quantidade"])

        historico = {
            "ean": produto["ean"],
            "validade": validade_formatada,
            "quantidade": produto["quantidade"],
            "usuario_id": usuario_id,
            "nome": produto["nome"],
            "marca": produto["marca"],
            "timestamp": datetime.now().isoformat()
        }
        supabase.table("entrada").insert([historico]).execute()

        return {"sucesso": True}

    except ValueError as ve:
        return {"erro": f"Validação: {str(ve)}"}
    except Exception as e:
        return {"erro": f"Erro inesperado: {str(e)}"}

# 📤 Saída de Produtos
def saida_produto(ean, validade, quantidade, usuario_id):
    try:
        estoque = supabase.table("estoque").select("*") \
            .eq("ean", ean) \
            .eq("validade", validade).execute()

        if not estoque.data:
            return {"erro": "Produto com EAN e validade não encontrado"}

        produto = estoque.data[0]
        if produto["saldo"] < quantidade:
            return {"erro": "Saldo insuficiente"}

        novo_saldo = produto["saldo"] - quantidade
        supabase.table("estoque").update({"saldo": novo_saldo}).eq("id", produto["id"]).execute()

        registrar_movimentacao(usuario_id, "saida", quantidade)

        historico = {
            "ean": ean,
            "validade": validade,
            "quantidade": quantidade,
            "usuario_id": usuario_id,
            "timestamp": datetime.now().isoformat()
        }
        supabase.table("saida").insert([historico]).execute()

        return {"sucesso": True}

    except Exception as e:
        return {"erro": f"Erro inesperado: {str(e)}"}

# 📊 Consultar saldo por EAN
def consultar_estoque_por_ean(ean):
    try:
        res = supabase.table("estoque").select("*") \
            .eq("ean", ean) \
            .order("validade", desc=False).execute()
        return res.data
    except Exception as e:
        return {"erro": f"Erro ao consultar estoque: {str(e)}"}

# 📋 Listar todos os produtos em estoque
def listar_estoque_completo():
    try:
        res = supabase.table("estoque").select("*").order("validade", desc=False).execute()
        return res.data
    except Exception as e:
        return {"erro": f"Erro ao listar estoque: {str(e)}"}