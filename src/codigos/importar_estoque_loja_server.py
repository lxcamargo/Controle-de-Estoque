from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile, os
from importar_estoque_loja_excel import importar_estoque_excel

app = Flask(__name__)
CORS(app)

@app.route('/importar-estoque-loja', methods=['POST'])
def importar_estoque_loja():
    if 'file' not in request.files:
        return jsonify({"erro": "Arquivo não enviado"}), 400

    file = request.files['file']
    if file.filename == '' or not file.filename.lower().endswith('.xlsx'):
        return jsonify({"erro": "Arquivo inválido. Envie um .xlsx"}), 400

    temp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as temp:
            file.save(temp.name)
            temp_path = temp.name

        resultado = importar_estoque_excel(temp_path)

        return jsonify({
            "mensagem": "✅ Importação concluída",
            "registros_importados": resultado.get("registros_importados", 0),
            "erros": resultado.get("erros", [])
        })

    except Exception as e:
        return jsonify({"erro": f"Erro interno: {str(e)}"}), 500

    finally:
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as cleanup_error:
                print(f"⚠️ Erro ao remover arquivo: {cleanup_error}")

if __name__ == '__main__':
    print("🔥 Servidor rodando na porta 8002")
    app.run(port=8002)