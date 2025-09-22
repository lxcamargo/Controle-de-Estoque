import React, { useState } from 'react';
import axios from 'axios';
import './ImportarProdutos.css';
import planilhaIcon from './planilha-icon.svg';

function ImportarEstoqueLoja() {
  const [arquivo, setArquivo] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erros, setErros] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [resumo, setResumo] = useState(null);

  const handleArquivoChange = (e) => {
    const file = e.target.files[0];
    setArquivo(file);
    setMensagem('');
    setErros([]);
    setResumo(null);
  };

  const handleImportar = async () => {
    if (!arquivo) {
      setMensagem('❗ Selecione um arquivo primeiro.');
      return;
    }

    if (!arquivo.name.toLowerCase().endsWith('.xlsx')) {
      setMensagem('⚠️ Apenas arquivos .xlsx são aceitos.');
      return;
    }

    if (arquivo.size === 0) {
      setMensagem('⚠️ O arquivo está vazio.');
      return;
    }

    const formData = new FormData();
    formData.append('file', arquivo);

    try {
      setCarregando(true);
      const response = await axios.post('http://127.0.0.1:8002/importar-estoque-loja', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const resultado = response.data;

      if (resultado.registros_importados > 0) {
        setMensagem(`✅ ${resultado.registros_importados} registros importados com sucesso!`);
        localStorage.setItem("estoqueLojaImportado", resultado.registros_importados);
      } else {
        setMensagem('⚠️ Nenhum registro foi importado.');
      }

      setErros(resultado.erros || []);
      setResumo({
        total: resultado.registros_importados || 0,
        erros: resultado.erros?.length || 0,
      });

    } catch (error) {
      if (error.code === 'ERR_NETWORK') {
        setMensagem('🚫 Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 8002.');
      } else if (error.response) {
        setMensagem(`⚠️ Erro do servidor: ${error.response.data?.erro || 'Verifique o arquivo.'}`);
      } else {
        setMensagem(`❌ Erro inesperado: ${error.message}`);
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="importar-container">
      <div className="titulo-area">
        <img src={planilhaIcon} alt="Ícone de planilha" className="icone" />
        <h2>Importar Estoque Inicial - Loja</h2>
      </div>

      <div className="upload-area">
        <label className="arquivo-label">
          Escolher arquivo
          <input type="file" accept=".xlsx" onChange={handleArquivoChange} />
        </label>
        <span className="arquivo-nome">
          {arquivo ? (
            <>
              <img src={planilhaIcon} alt="Arquivo selecionado" className="icone-pequeno" />
              {arquivo.name}
            </>
          ) : 'Nenhum arquivo escolhido'}
        </span>
      </div>

      <button
        className="botao-importar"
        onClick={handleImportar}
        disabled={!arquivo || carregando}
      >
        {carregando ? '⏳ Importando...' : 'IMPORTAR PLANILHA'}
      </button>

      {mensagem && (
        <p className="mensagem" role="alert" aria-label="Mensagem de status">
          {mensagem}
        </p>
      )}

      {resumo && (
        <div className="resumo-area">
          <p>📦 Registros importados: <strong>{resumo.total}</strong></p>
          <p>⚠️ Erros encontrados: <strong>{resumo.erros}</strong></p>
        </div>
      )}

      {erros.length > 0 && (
        <div className="erros-area">
          <h4>📝 Erros encontrados:</h4>
          <ul>
            {erros.map((erro, index) => (
              <li key={index}>{erro}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ImportarEstoqueLoja;