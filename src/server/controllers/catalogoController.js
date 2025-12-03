import { query } from "../db/pool.js";

export async function getCatalogo(req, res) {
  try {
    const { grupo } = req.query;
    if (!grupo) return res.status(400).json({ error: "grupo é obrigatório" });
    const rows = await query(
      `SELECT code, label, COALESCE(ordem,9999) ord
       FROM catalogos WHERE grupo=? AND ativo=1
       ORDER BY ord, label`,
      [grupo],
    );
    res.set("Cache-Control", "public, max-age=300");
    res.json(rows.map((r) => ({ code: r.code, label: r.label })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao buscar catálogo" });
  }
}

export async function getCatalogoBatch(req, res) {
  try {
    const grupos = Array.isArray(req.body?.grupos) ? req.body.grupos : [];
    if (!grupos.length) return res.json({});
    const qs = grupos.map(() => "?").join(",");
    const rows = await query(
      `SELECT grupo, code, label, COALESCE(ordem,9999) ord
       FROM catalogos WHERE grupo IN (${qs}) AND ativo=1
       ORDER BY grupo, ord, label`,
      grupos,
    );
    const out = {};
    for (const r of rows) (out[r.grupo] ||= []).push({ code: r.code, label: r.label });
    res.set("Cache-Control", "public, max-age=300");
    res.json(out);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "erro ao buscar catálogos" });
  }
}
