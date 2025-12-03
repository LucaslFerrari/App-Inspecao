import bcrypt from "bcryptjs";
import { query } from "../db/pool.js";

export async function login(req, res) {
  try {
    const { login, senha } = req.body || {};

    if (!login || !senha) {
      return res.status(400).json({ error: "login e senha são obrigatórios" });
    }

    const rows = await query(
      `SELECT 
         u.id,
         u.login,
         u.nome,
         u.senha_hash,
         u.empresa_id,
         u.contrato_id,
         u.ativo,
         g.id   AS grupo_id,
         g.nome AS grupo_nome
       FROM usuarios u
       LEFT JOIN grupos_usuarios g ON g.id = u.grupo_id
       WHERE u.login = ?
       LIMIT 1`,
      [login],
    );

    if (!rows.length) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }

    const user = rows[0];

    if (!user.ativo) {
      return res.status(403).json({ error: "Usuário inativo" });
    }

    const ok = await bcrypt.compare(senha, user.senha_hash || "");
    if (!ok) {
      return res.status(401).json({ error: "Usuário ou senha inválidos" });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        login: user.login,
        nome: user.nome,
        empresa_id: user.empresa_id,
        contrato_id: user.contrato_id,
        grupo: user.grupo_id ? { id: user.grupo_id, nome: user.grupo_nome } : null,
      },
    });
  } catch (err) {
    console.error("[auth/login] Erro:", err);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
}
