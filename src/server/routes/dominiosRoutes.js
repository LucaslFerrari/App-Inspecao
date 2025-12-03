import express from "express";
import { query } from "../db/pool.js";

const router = express.Router();

router.get("/areas", async (_req, res) => {
  const rows = await query(`SELECT id, code, label FROM areas ORDER BY label`);
  res.set("Cache-Control", "public, max-age=300");
  res.json(rows);
});

router.get("/tramos", async (_req, res) => {
  const rows = await query(`SELECT id, code, label FROM tramos ORDER BY id`);
  res.set("Cache-Control", "public, max-age=300");
  res.json(rows);
});

router.get("/lados", async (_req, res) => {
  const rows = await query(`SELECT id, code, label FROM lados ORDER BY id`);
  res.set("Cache-Control", "public, max-age=300");
  res.json(rows);
});

router.get("/tipos-correia", async (_req, res) => {
  const rows = await query(`SELECT id, code, label FROM tipos_correia ORDER BY id`);
  res.set("Cache-Control", "public, max-age=300");
  res.json(rows);
});

router.get("/modelos-mesa", async (_req, res) => {
  const rows = await query(`SELECT id, code, label FROM modelos_mesa ORDER BY id`);
  res.set("Cache-Control", "public, max-age=300");
  res.json(rows);
});

router.get("/correias", async (req, res) => {
  try {
    const areaId = Number(req.query.area_id);
    const rows = Number.isInteger(areaId)
      ? await query(
          `SELECT id, code, label, area_id 
           FROM correias 
           WHERE ativo=1 AND area_id=? 
           ORDER BY label`,
          [areaId],
        )
      : await query(
          `SELECT id, code, label, area_id 
           FROM correias 
           WHERE ativo=1 
           ORDER BY label`,
        );

    res.set("Cache-Control", "public, max-age=300");
    res.json(rows);
  } catch (err) {
    console.error("[dominios] Erro /correias:", err);
    res.status(500).json({ error: "erro ao buscar correias" });
  }
});

router.get("/correias/:id/balizas", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: "id inválido" });
  }

  try {
    const viewRows = await query(
      `SELECT baliza FROM v_correia_balizas WHERE correia_id=? ORDER BY baliza`,
      [id],
    );
    if (viewRows.length) {
      res.set("Cache-Control", "public, max-age=300");
      return res.json(viewRows.map((r) => r.baliza));
    }
  } catch (e) {
    console.warn(`[dominios] view v_correia_balizas ausente para correia ${id}, usando fallback.`);
  }

  try {
    const ivs = await query(
      `SELECT inicio, fim FROM correia_baliza_intervalos WHERE correia_id=?`,
      [id],
    );
    const out = [];
    for (const { inicio, fim } of ivs) {
      for (let n = inicio; n <= fim; n++) out.push(n);
    }
    res.set("Cache-Control", "public, max-age=300");
    res.json(out);
  } catch (err) {
    console.error("[dominios] Erro /balizas:", err);
    res.status(500).json({ error: "erro ao buscar balizas" });
  }
});

export default router;
