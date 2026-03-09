# validacao_produto.py

def validar_campos(produto):
    """
    Verifica se os campos obrigatórios estão presentes e limpa os dados.
    """
    campos_obrigatorios = ["nome", "ean", "validade", "quantidade"]
    for campo in campos_obrigatorios:
        if not produto.get(campo):
            raise ValueError(f"Campo obrigatório '{campo}' está ausente.")

    if produto["quantidade"] < 0:
        raise ValueError("Quantidade não pode ser negativa.")

    produto["nome"] = produto["nome"].strip().upper()
    produto["ean"] = produto["ean"].strip()
    produto["validade"] = produto["validade"].strip()

    return produto


def lote_existe(conexao, ean, validade):
    """
    Verifica se o lote com EAN + validade já existe no banco de dados.
    """
    cursor = conexao.cursor()
    cursor.execute("""
        SELECT 1 FROM estoque
        WHERE ean = %s AND validade = %s
    """, (ean, validade))
    return cursor.fetchone() is not None


def quantidade_valida(quantidade):
    """
    Confirma que a quantidade é um número não negativo.
    """
    if quantidade is None or not isinstance(quantidade, (int, float)):
        raise ValueError("Quantidade deve ser um número.")
    if quantidade < 0:
        raise ValueError("Quantidade não pode ser negativa.")
    return True