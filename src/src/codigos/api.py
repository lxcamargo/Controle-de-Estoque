from fastapi import FastAPI, Request, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io

from src.codigos.estoque import (
    entrada_produto,
    saida_produto,
    consultar_estoque_por_ean,
    listar_estoque_completo
)
from src.codigos.config_supabase import supabase

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def raiz():
    return {"mensagem": "🚀 API funcionando com sucesso!"}

@app.post("/importar-planilha")
async def importar_planilha(file: UploadFile = File(...)):
    try:
        contents = await file.read()

        if not contents:
            return {"erro": "Arquivo vazio ou não enviado."}

        if file.filename.endswith(".xlsx"):
            df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
        elif file.filename.endswith(".csv"):
            df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
        else:
            return {"erro": "Formato inválido. Use .csv ou .xlsx"}

        df.columns = [col.lower().strip() for col in df.columns]

        registros_importados = 0
        erros = []

        for i, linha in df.iterrows():
            try:
                ean = str(linha.get("ean", "")).strip()
                validade_raw = linha.get("validade", "")
                quantidade_raw = linha.get("quantidade", "")
                usuario_id = linha.get("usuario_id", "sistema")
                descricao = str(linha.get("descricao", "Produto sem descrição")).strip()
                marca = str(linha.get("marca", "Marca desconhecida")).strip()

                if not all([ean, validade_raw, quantidade_raw]):
                    raise ValueError("Campos obrigatórios ausentes")

                quantidade = int(quantidade_raw) if str(quantidade_raw).strip().isdigit() else 0
                if quantidade <= 0:
                    raise ValueError("Quantidade inválida ou zero")

                validade = pd.to_datetime(validade_raw, errors="coerce")
                if pd.isnull(validade):
                    raise ValueError(f"Data inválida: {validade_raw}")
                validade = validade.date().isoformat()

                resultado = entrada_produto(
                    ean, validade, quantidade, usuario_id, descricao, marca
                )

                if "erro" not in resultado:
                    registros_importados += 1
                else:
                    raise ValueError(resultado["erro"])

            except Exception as erro_item:
                erros.append(f"Linha {i+1}: {erro_item}")

        return {
            "mensagem": "Importação concluída",
            "registros_importados": registros_importados,
            "erros": erros
        }

    except Exception as e:
        return {"erro": f"Falha na importação: {str(e)}"}

@app.get("/estoque")
async def visualizar_estoque(
    ean: str = Query(None),
    marca: str = Query(None),
    validade: str = Query(None)
):
    try:
        query = supabase.table("estoque").select("*")

        if ean:
            query = query.eq("ean", ean)
        if marca:
            query = query.ilike("marca", f"%{marca}%")
        if validade:
            query = query.eq("validade", validade)

        resultado = query.order("validade", desc=False).execute()

        if resultado.data:
            return {"estoque": resultado.data}
        else:
            return {"estoque": [], "mensagem": "Nenhum item encontrado"}

    except Exception as e:
        return {"erro": f"Erro ao consultar estoque: {str(e)}"}

class ProdutoSchema(BaseModel):
    ean: str
    nome: str
    marca: str

class SaidaSchema(BaseModel):
    ean: str
    quantidade: int
    validade: str
    lote: str = None
    usuario_id: str = "sistema"

class UsuarioSchema(BaseModel):
    nome: str
    email: str
    senha: str

@app.post("/cadastrar-usuario")
async def cadastrar_usuario(usuario: UsuarioSchema):
    try:
        auth_res = supabase.auth.sign_up({
            "email": usuario.email,
            "password": usuario.senha
        })

        if not auth_res or not auth_res.user:
            raise HTTPException(status_code=400, detail="Erro ao criar usuário no Supabase Auth.")

        dados_usuario = {
            "id_auth": auth_res.user.id,
            "nome": usuario.nome,
            "email": usuario.email
        }

        supabase.table("usuarios").insert(dados_usuario).execute()

        return {"mensagem": f"Usuário {usuario.nome} cadastrado com sucesso!"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao cadastrar usuário: {str(e)}")

def produto_existe(ean: str):
    res = supabase.table("produto").select("*").eq("ean", ean).execute()
    return bool(res.data)

def cadastrar_produto(ean: str, nome: str, marca: str):
    novo = {
        "ean": ean,
        "descricao": nome,
        "marca": marca
    }
    supabase.table("produto").insert(novo).execute()
    return {"sucesso": True}

def obter_ou_cadastrar_produto(ean: str, nome: str = None, marca: str = None):
    if produto_existe(ean):
        return {"status": "existente"}
    if nome and marca:
        cadastrar_produto(ean, nome, marca)
        return {"status": "cadastrado"}
    return {"erro": "Produto não encontrado e dados incompletos"}

@app.post("/produto")
def api_cadastrar_produto(produto: ProdutoSchema):
    resultado = obter_ou_cadastrar_produto(produto.ean, produto.nome, produto.marca)

    if resultado.get("erro"):
        raise HTTPException(status_code=400, detail=resultado["erro"])
    if resultado["status"] == "existente":
        raise HTTPException(status_code=400, detail="Produto já cadastrado.")

    return {"id": produto.ean, "mensagem": "Produto cadastrado com sucesso!"}

@app.post("/saida")
def registrar_saida(saida: SaidaSchema):
    try:
        produto_res = supabase.table("produto").select("*").eq("ean", saida.ean).execute()
        if not produto_res.data:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")

        produto = produto_res.data[0]
        id_produto = produto["id_produto"]

        estoque_res = supabase.table("estoque").select("*")\
            .eq("id_produto", id_produto)\
            .eq("validade", saida.validade)\
            .limit(1)\
            .execute()

        if not estoque_res.data:
            raise HTTPException(status_code=404, detail="Estoque com essa validade não encontrado.")

        estoque = estoque_res.data[0]
        id_estoque = estoque["id"]
        quantidade_disponivel = estoque["quantidade"]

        if saida.quantidade > quantidade_disponivel:
            raise HTTPException(status_code=400, detail=f"Estoque insuficiente. Disponível: {quantidade_disponivel}")

        registro = {
            "id_produto": id_produto,
            "id_estoque": id_estoque,
            "ean": saida.ean,
            "quantidade": saida.quantidade,
            "validade": saida.validade,
            "lote": saida.lote,
            "data_saida": pd.Timestamp.now().isoformat(),
            "usuario_id": saida.usuario_id
        }

        supabase.table("saida").insert(registro).execute()

        novo_estoque = quantidade_disponivel - saida.quantidade
        supabase.table("estoque").update({"quantidade": novo_estoque})\
            .eq("id", id_estoque)\
            .execute()

        return {"mensagem": "✅ Saída registrada com sucesso!"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao registrar saída: {str(e)}")

@app.get("/saidas")
def listar_saidas(
    ean: str = Query(None),
    validade: str = Query(None),
    lote: str = Query(None),
    usuario_id: str = Query(None)
):
    try:
        query = supabase.table("saida").select("*")

        if ean:
            query = query.eq("ean", ean)
        if validade:
            query = query.eq("validade", validade)
        if lote:
            query = query.eq("lote", lote)
        if usuario_id:
            query = query.eq("usuario_id", usuario_id)

        resultado = query.order("data_saida", desc=True).execute()

        if resultado.data:
            return {"saidas": resultado.data}
        else:
            return {"saidas": [], "mensagem": "Nenhuma saída encontrada"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar saídas: {str(e)}")