from fastapi import FastAPI, Request, HTTPException
from config_supabase import supabase
from datetime import datetime
import hashlib
import re

app = FastAPI()

# 🔐 Função para gerar hash da senha
def hash_senha(senha):
    return hashlib.sha256(senha.encode()).hexdigest()

# 📧 Validação básica de e-mail
def email_valido(email):
    return re.match(r"[^@]+@[^@]+\.[^@]+", email)

# 🧠 Função principal de cadastro
def cadastrar_usuario(nome, email, senha):
    try:
        if not nome or not email or not senha:
            return {"status": "erro", "mensagem": "Todos os campos são obrigatórios."}
        if not email_valido(email):
            return {"status": "erro", "mensagem": "E-mail inválido."}
        if len(senha) < 6:
            return {"status": "erro", "mensagem": "A senha deve ter pelo menos 6 caracteres."}

        # Padroniza o e-mail antes de salvar
        email = email.strip().lower()
        senha_hash = hash_senha(senha)

        print(f"🔎 Buscando e-mail: {email} na tabela cadastro_user")
        existente = supabase.table("cadastro_user").select("*").eq("email", email).execute().data
        if existente:
            return {"status": "erro", "mensagem": f"E-mail {email} já está cadastrado."}

        novo_usuario = {
            "nome": nome,
            "email": email,
            "senha": senha_hash,
            "criado_em": datetime.now().isoformat()
        }

        supabase.table("cadastro_user").insert(novo_usuario).execute()

        return {"status": "sucesso", "mensagem": f"Usuário {nome} cadastrado com sucesso!"}

    except Exception as e:
        print("❌ Erro ao cadastrar usuário:", e)
        return {"status": "erro", "mensagem": f"Erro inesperado: {str(e)}"}

# 🚀 Rota de cadastro via POST
@app.post("/cadastrar-usuario")
async def api_cadastrar_usuario(request: Request):
    try:
        raw_body = await request.body()
        print("📦 Corpo bruto recebido:", raw_body)

        body = await request.json()
        print("✅ JSON decodificado:", body)

        nome = body.get("nome")
        email = body.get("email")
        senha = body.get("senha")

        resultado = cadastrar_usuario(nome, email, senha)

        if resultado["status"] == "erro":
            raise HTTPException(status_code=400, detail=resultado["mensagem"])

        return {"mensagem": resultado["mensagem"]}

    except Exception as e:
        print("❌ Erro ao processar requisição:", e)
        raise HTTPException(status_code=500, detail=f"Erro inesperado: {str(e)}")