import bcrypt
from datetime import datetime
from supabase import create_client
from src.codigos.config_supabase import supabase  # arquivo onde você configura seu Supabase

# 🔐 Cadastrar novo usuário
def cadastrar_usuario(nome, email, senha, is_admin=False):
    senha_hash = bcrypt.hashpw(senha.encode(), bcrypt.gensalt()).decode()
    existe = supabase.table("usuarios").select("id").eq("email", email).execute()
    if existe.data:
        return {"erro": "Email já cadastrado"}
    novo = {
        "nome": nome,
        "email": email,
        "senha_hash": senha_hash,
        "is_admin": is_admin
    }
    supabase.table("usuarios").insert(novo).execute()
    return {"sucesso": True}


# 🔐 Autenticar login
def autenticar_usuario(email, senha):
    res = supabase.table("usuarios").select("*").eq("email", email).execute()
    if not res.data:
        return {"erro": "Usuário não encontrado"}
    user = res.data[0]
    if bcrypt.checkpw(senha.encode(), user["senha_hash"].encode()):
        return {"sucesso": True, "usuario": user}
    else:
        return {"erro": "Senha incorreta"}


# 🔑 Alterar senha de usuário existente
def alterar_senha(usuario_id, senha_nova):
    nova_hash = bcrypt.hashpw(senha_nova.encode(), bcrypt.gensalt()).decode()
    supabase.table("usuarios").update({"senha_hash": nova_hash}).eq("id", usuario_id).execute()
    return {"sucesso": True}


# 👥 Listar todos os usuários (admin)
def listar_usuarios():
    res = supabase.table("usuarios").select("*").execute()
    return res.data


# 📊 Registrar produtividade (movimentações de estoque)
from datetime import datetime

def registrar_movimentacao(usuario_id, tipo, quantidade):
    entrada = {
        "usuario_id": usuario_id,
        "tipo": tipo,  # "entrada" ou "saida"
        "quantidade": quantidade,
        "timestamp": datetime.now().isoformat()
    }
    supabase.table("produtividade").insert(entrada).execute()