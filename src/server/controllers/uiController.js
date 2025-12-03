import { query } from "../db/pool.js";

export async function getInspecaoCampos(req, res) {
  try {
    const rows = await query(
      `SELECT 
         secao,
         campo,
         label,
         grupo_catalogo,
         eh_array,
         ordem
       FROM ui_inspecao_campos
       WHERE ativo = 1
       ORDER BY secao, ordem, id`,
    );

    const secoes = {};

    for (const r of rows) {
      if (!secoes[r.secao]) {
        secoes[r.secao] = [];
      }

      secoes[r.secao].push({
        campo: r.campo,
        label: r.label,
        grupo: r.grupo_catalogo || null,
        isArray: !!r.eh_array,
      });
    }

    res.json(secoes);
  } catch (err) {
    console.error("[GET /api/ui/inspecao-campos] Erro:", err);
    res.status(500).json({ error: "Erro ao carregar definição de campos da UI" });
  }
}
