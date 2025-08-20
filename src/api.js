import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8002", // atualize para a porta correta
  // Remova o Content-Type fixo
});

export default api;