import { createClient } from "@supabase/supabase-js";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

// 🔗 Conexão com Supabase
const supabase = createClient(
  "https://hejiipyxvufhnzeyfhdd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlamlpcHl4dnVmaG56ZXlmaGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzNjQxNTAsImV4cCI6MjA2ODk0MDE1MH0.fq4G4b7lQktCRreV_CLem06221ZuOlY-miaVilcqfGE"
);

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro("");

    const emailLimpo = email.trim().toLowerCase();
    const senhaLimpa = senha.trim();

    try {
      const { data, error } = await supabase
        .from("cadastro_user")
        .select("*")
        .eq("email", emailLimpo)
        .limit(1);

      const usuario = data?.[0];

      if (error || !usuario) {
        setErro("E-mail não encontrado.");
        return;
      }

      const ativoValido =
        usuario.ativo === true || usuario.ativo === "true" || usuario.ativo === 1;
      if (!ativoValido) {
        setErro("Usuário inativo.");
        return;
      }

      if (usuario.senha !== senhaLimpa) {
        setErro("Senha incorreta.");
        return;
      }

      // ✅ Salva dados no localStorage
      localStorage.removeItem("usuarioEmail");
      localStorage.setItem("usuarioEmail", usuario.email);
      localStorage.setItem("tipoUsuario", usuario.tipo?.toLowerCase()); // compatível com adm_loja e adm_galpao

      // ✅ NOVO: salva também o usuário logado para a tela de contagem
      localStorage.setItem("usuarioLogado", usuario.email);

      console.log("🔐 Login realizado por:", usuario.email);

      // ✅ Redirecionamento universal para dashboard
      navigate("/dashboard");
    } catch (err) {
      console.error("Erro inesperado:", err);
      setErro("Erro ao tentar login. Tente novamente.");
    }
  };

  return (
    <div className="login-container">
      <h2>🔐 Login - Sistema</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Seu e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Sua senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
        />
        <button type="submit">Entrar</button>
      </form>
      {erro && <p className="login-error">{erro}</p>}
    </div>
  );
}