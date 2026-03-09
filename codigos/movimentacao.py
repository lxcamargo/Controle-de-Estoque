from config_supabase import supabase
from datetime import datetime
import pandas as pd

# 🔼 Entrada de produto
def registrar_entrada(ean, quantidade, usuario=None):
    try:
        if quantidade <= 0:
            return "A quantidade deve ser positiva."

        produto = supabase.table("estoque").select("quantidade").eq("ean", ean).execute().data
        if not produto:
            return f"Produto com EAN {ean} não encontrado."

        quantidade_atual = produto[0]["quantidade"]
        nova_quantidade = quantidade_atual + quantidade

        supabase.table("estoque").update({"quantidade": nova_quantidade}).eq("ean", ean).execute()

        entrada = {
            "ean": ean,
            "quantidade": quantidade,
            "tipo": "entrada",
            "data_mov": datetime.utcnow().isoformat()
        }

        if usuario:
            entrada["usuario"] = usuario

        supabase.table("movimentacoes").insert(entrada).execute()
        return f"Entrada registrada para {ean}. Nova quantidade: {nova_quantidade}"

    except Exception as e:
        return f"Erro ao registrar entrada: {str(e)}"

# 🔽 Saída de produto
def registrar_saida(ean, quantidade, usuario=None):
    try:
        if quantidade <= 0:
            return "A quantidade deve ser positiva."

        produto = supabase.table("estoque").select("quantidade").eq("ean", ean).execute().data
        if not produto:
            return f"Produto com EAN {ean} não encontrado."

        quantidade_atual = produto[0]["quantidade"]
        if quantidade > quantidade_atual:
            return f"Quantidade insuficiente. Quantidade atual: {quantidade_atual}"

        nova_quantidade = quantidade_atual - quantidade

        supabase.table("estoque").update({"quantidade": nova_quantidade}).eq("ean", ean).execute()

        saida = {
            "ean": ean,
            "quantidade": quantidade,
            "tipo": "saida",
            "data_mov": datetime.utcnow().isoformat()
        }

        if usuario:
            saida["usuario"] = usuario

        supabase.table("movimentacoes").insert(saida).execute()
        return f"Saída registrada para {ean}. Nova quantidade: {nova_quantidade}"

    except Exception as e:
        return f"Erro ao registrar saída: {str(e)}"

# 📋 Listar todas as movimentações
def listar_movimentacoes(limite=100):
    try:
        dados = supabase.table("movimentacoes").select("*").order("data_mov", desc=True).limit(limite).execute().data
        return dados if dados else []
    except Exception as e:
        return f"Erro ao listar movimentações: {str(e)}"

# 🔍 Filtros por tipo, EAN ou intervalo de datas
def filtrar_movimentacoes(ean=None, tipo=None, data_inicio=None, data_fim=None):
    try:
        query = supabase.table("movimentacoes").select("*")

        if ean:
            query = query.eq("ean", ean)
        if tipo:
            query = query.eq("tipo", tipo)
        if data_inicio:
            query = query.gte("data_mov", data_inicio)
        if data_fim:
            query = query.lte("data_mov", data_fim)

        dados = query.order("data_mov", desc=True).execute().data
        return dados if dados else []
    except Exception as e:
        return f"Erro ao filtrar movimentações: {str(e)}"

# 📈 Gerar dados para gráfico (ex: entrada/saída total)
def gerar_dados_grafico():
    try:
        movs = listar_movimentacoes()
        if isinstance(movs, str):
            return {"erro": movs}

        entradas = sum(m["quantidade"] for m in movs if m["tipo"] == "entrada")
        saidas = sum(m["quantidade"] for m in movs if m["tipo"] == "saida")

        return {
            "labels": ["Entrada", "Saída"],
            "datasets": [{
                "label": "Movimentações totais",
                "data": [entradas, saidas],
                "backgroundColor": ["#4CAF50", "#F44336"]
            }]
        }
    except Exception as e:
        return {"erro": f"Erro ao gerar gráfico: {str(e)}"}

# 🧾 Exportar movimentações (com opção de filtro)
def exportar_movimentacoes_excel(nome_arquivo="movimentacoes.xlsx", ean=None, tipo=None, data_inicio=None, data_fim=None):
    dados = filtrar_movimentacoes(ean, tipo, data_inicio, data_fim)
    if isinstance(dados, str):
        return dados

    try:
        df = pd.DataFrame(dados)
        df.to_excel(nome_arquivo, index=False)
        return f"Movimentações exportadas para {nome_arquivo}"
    except Exception as e:
        return f"Erro na exportação: {str(e)}"