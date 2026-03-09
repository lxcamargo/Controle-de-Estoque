import React, { useState } from "react";
import axios from "axios";

const AjusteEstoqueLojaBaixar = () => {
  const [mensagem, setMensagem] = useState("");

  const handleBaixa = async () => {
    try {
      const response = await axios.post("http://localhost:3000/api/realizar-baixa-ajuste");
      setMensagem(response.data);
    } catch (error) {
      setMensagem("Erro ao realizar baixa de estoque.");
      console.error(error);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h2>📉 Realizar Baixa de Estoque com Base na Planilha</h2>
      <button onClick={handleBaixa}>Executar Baixa</button>
      {mensagem && <p>{mensagem}</p>}
    </div>
  );
};

export default AjusteEstoqueLojaBaixar;