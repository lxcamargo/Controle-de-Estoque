from datetime import datetime
from config_supabase import supabase

def gerar_painel_validade():
    hoje = datetime.now().date()
    estoque = supabase.table("estoque").select("*").execute().data

    painel = []
    for produto in estoque:
        validade = datetime.strptime(produto["validade"], "%Y-%m-%d").date()
        dias_para_vencer = (validade - hoje).days

        if dias_para_vencer <= 90:
            cor = "🔴"
        elif dias_para_vencer <= 180:
            cor = "🟠"
        else:
            cor = "🟢"

        painel.append({
            "ean": produto["ean"],
            "validade": produto["validade"],
            "quantidade": produto["quantidade"],
            "vencimento_em_dias": dias_para_vencer,
            "faixa": cor
        })

    painel_ordenado = sorted(painel, key=lambda x: x["vencimento_em_dias"])
    return painel_ordenado