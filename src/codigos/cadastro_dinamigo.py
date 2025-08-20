from supabase import create_client
from config_supabase import supabase

# ✅ Valida se o EAN é um código numérico de 13 dígitos
def ean_valido(ean):
    ean = str(ean).strip()
    return ean.isdigit() and len(ean) == 13

# 🔍 Verifica se produto está cadastrado na tabela produto
def produto_cadastrado(ean):
    ean = str(ean).strip()
    try:
        res = supabase.table("produto").select("id").eq("ean", ean).execute()
        return bool(res.data)
    except Exception as e:
        print(f"❌ Erro ao verificar produto: {e}")
        return False

# 🆕 Cadastra novo produto
def cadastrar_produto(ean, descricao, marca):
    ean = str(ean).strip()
    novo = {
        "ean": ean,
        "descricao": descricao,
        "marca": marca
    }
    try:
        supabase.table("produto").insert(novo).execute()
        return {"sucesso": True}
    except Exception as e:
        print(f"Erro ao cadastrar produto: {e}")
        return {"sucesso": False, "erro": str(e)}

# 🚚 Cadastra produto (se necessário) e registra entrada no estoque
def cadastrar_e_dar_entrada(ean, descricao, marca, validade, quantidade, usuario_id):
    ean = str(ean).strip()
    if not ean_valido(ean):
        return {"erro": "EAN inválido"}

    try:
        # Verifica se produto está cadastrado
        if not produto_cadastrado(ean):
            print("⚠️ Produto não cadastrado. Tentando cadastro dinâmico...")
            if descricao and marca:
                resultado = cadastrar_produto(ean, descricao, marca)
                if not resultado.get("sucesso"):
                    return {"erro": "Falha ao cadastrar produto", "detalhes": resultado.get("erro")}
            else:
                return {"erro": "Produto não cadastrado e dados ausentes para cadastro"}

        # Verifica se já existe entrada no estoque com mesmo EAN e validade
        estoque_res = supabase.table("estoque").select("id") \
            .eq("ean", ean).eq("validade", validade).execute()

        if estoque_res.data:
            return {"erro": "Entrada já registrada para este produto e validade"}

        # Insere no estoque
        entrada = {
            "ean": ean,
            "validade": validade,
            "quantidade": quantidade,
            "usuario_id": usuario_id
        }
        supabase.table("estoque").insert(entrada).execute()

        return {"sucesso": True, "mensagem": "Produto cadastrado e entrada registrada"}

    except Exception as e:
        print(f"Erro ao registrar entrada: {e}")
        return {"erro": "Falha na operação", "detalhes": str(e)}