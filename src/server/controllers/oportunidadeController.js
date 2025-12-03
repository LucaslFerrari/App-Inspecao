import {
  atualizarStatusOportunidades,
  listarOportunidadesPorCorreia,
} from "../services/oportunidadeService.js";

export async function getOportunidadesPorCorreia(req, res) {
  const correiaId = Number(req.params.correiaId);
  if (!Number.isInteger(correiaId) || correiaId <= 0) {
    return res.status(400).json({ error: "correiaId invalido" });
  }

  try {
    const incluirExecutadas =
      String(req.query?.incluirExecutadas).toLowerCase() === "true";
    const items = await listarOportunidadesPorCorreia(correiaId, {
      incluirExecutadas,
    });
    return res.json({ items });
  } catch (err) {
    console.error("[oportunidades] erro ao listar:", err);
    return res.status(500).json({ error: "Erro ao listar oportunidades" });
  }
}

export async function patchStatusOportunidades(req, res) {
  try {
    const bodyUpdates = Array.isArray(req.body?.updates) ? req.body.updates : [];

    let updates = bodyUpdates;
    if ((!updates || updates.length === 0) && Array.isArray(req.body?.ids) && req.body.status) {
      updates = req.body.ids.map((id) => ({ id, status: req.body.status }));
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return res
        .status(400)
        .json({ error: "Envie pelo menos uma oportunidade para atualizar" });
    }

    const { updated } = await atualizarStatusOportunidades(updates);
    return res.json({ success: true, updated });
  } catch (err) {
    console.error("[oportunidades] erro ao atualizar status:", err);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar status das oportunidades" });
  }
}
