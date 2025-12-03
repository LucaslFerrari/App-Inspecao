
import { storageUpload } from "../../../lib/storage/storage.js";
import { getPool, query } from "../db/pool.js";
import { gerarOportunidadesParaInspecao } from "../services/oportunidadeService.js";
import { parseDataUrl } from "../utils/dataUrl.js";

function parseJson(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasText(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) && value !== 0;
}

export async function salvarInspecao(req, res) {
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const {
      inspetor,
      data,
      equip,
      area,
      lat,
      lng,
      gpsAccuracy,
      usuario_id,
      empresa_id,
      contrato_id,
      pagina1 = {},
      pagina2 = {},
      pagina3 = {},
      pagina4 = {},
      pagina5 = {},
      evidencias = [],
    } = req.body;

    const [resultInsp] = await conn.execute(
      `INSERT INTO inspecoes
      (inspetor, data, equip, area, lat, lng, gps_accuracy,
        usuario_id, empresa_id, contrato_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        inspetor || null,
        data || null,
        equip || null,
        area || null,
        lat ?? null,
        lng ?? null,
        gpsAccuracy ?? null,
        usuario_id ?? null,
        empresa_id ?? null,
        contrato_id ?? null,
      ],
    );

    const inspecaoId = resultInsp.insertId;

    if (Array.isArray(pagina1.multiEquipRolos) && pagina1.multiEquipRolos.length) {
      for (const bloco of pagina1.multiEquipRolos) {
        const equipCode = bloco.equip || equip || null;

        if (!Array.isArray(bloco.rolos)) continue;

        for (const r of bloco.rolos) {
          await conn.execute(
            `INSERT INTO pagina1_rolos 
             (inspecao_id, equip, baliza, limp, critic,
              carga_E, carga_C, carga_D,
              impacto_E, impacto_C, impacto_D,
              retorno_RB, retorno_RP, retorno_RT,
              verticais_EC, verticais_DC, verticais_ER, verticais_DR,
              suportes_CAR, suportes_AAC, suportes_RET, suportes_AAR, suportes_CAL)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inspecaoId,
              equipCode,
              r.baliza,
              r.limp || "",
              r.critic || "",
              JSON.stringify(r.carga_E || []),
              JSON.stringify(r.carga_C || []),
              JSON.stringify(r.carga_D || []),
              JSON.stringify(r.impacto_E || []),
              JSON.stringify(r.impacto_C || []),
              JSON.stringify(r.impacto_D || []),
              JSON.stringify(r.retorno_RB || []),
              JSON.stringify(r.retorno_RP || []),
              JSON.stringify(r.retorno_RT || []),
              JSON.stringify(r.verticais_EC || []),
              JSON.stringify(r.verticais_DC || []),
              JSON.stringify(r.verticais_ER || []),
              JSON.stringify(r.verticais_DR || []),
              JSON.stringify(r.suportes_CAR || []),
              JSON.stringify(r.suportes_AAC || []),
              JSON.stringify(r.suportes_RET || []),
              JSON.stringify(r.suportes_AAR || []),
              JSON.stringify(r.suportes_CAL || []),
            ],
          );
        }
      }
    } else if (Array.isArray(pagina1.rolos)) {
      const equipCode = equip || null;

      for (const r of pagina1.rolos) {
        await conn.execute(
          `INSERT INTO pagina1_rolos 
           (inspecao_id, equip, baliza, limp, critic,
            carga_E, carga_C, carga_D,
            impacto_E, impacto_C, impacto_D,
            retorno_RB, retorno_RP, retorno_RT,
            verticais_EC, verticais_DC, verticais_ER, verticais_DR,
            suportes_CAR, suportes_AAC, suportes_RET, suportes_AAR, suportes_CAL)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inspecaoId,
            equipCode,
            r.baliza,
            r.limp || "",
            r.critic || "",
            JSON.stringify(r.carga_E || []),
            JSON.stringify(r.carga_C || []),
            JSON.stringify(r.carga_D || []),
            JSON.stringify(r.impacto_E || []),
            JSON.stringify(r.impacto_C || []),
            JSON.stringify(r.impacto_D || []),
            JSON.stringify(r.retorno_RB || []),
            JSON.stringify(r.retorno_RP || []),
            JSON.stringify(r.retorno_RT || []),
            JSON.stringify(r.verticais_EC || []),
            JSON.stringify(r.verticais_DC || []),
            JSON.stringify(r.verticais_ER || []),
            JSON.stringify(r.verticais_DR || []),
            JSON.stringify(r.suportes_CAR || []),
            JSON.stringify(r.suportes_AAC || []),
            JSON.stringify(r.suportes_RET || []),
            JSON.stringify(r.suportes_AAR || []),
            JSON.stringify(r.suportes_CAL || []),
          ],
        );
      }
    }
    if (Array.isArray(pagina2.multiEquip) && pagina2.multiEquip.length) {
      for (const bloco of pagina2.multiEquip) {
        const equipCode = bloco.equip || equip || null;

        if (Array.isArray(bloco.calhas)) {
          for (const c of bloco.calhas) {
            await conn.execute(
              `INSERT INTO pagina2_calhas 
               (inspecao_id, equip, ponto_transferencia, letra, pontos, item, dano, servico, critic, limpeza, andaime, obs)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                inspecaoId,
                equipCode,
                c.ponto ?? null,
                c.letra || null,
                JSON.stringify(c.pontos || []),
                JSON.stringify(c.item || []),
                JSON.stringify(c.dano || []),
                JSON.stringify(c.servico || []),
                c.critic || "",
                c.limpeza || "",
                c.andaime || "",
                c.obs || "",
              ],
            );
          }
        }

        if (Array.isArray(bloco.vedacao)) {
          for (const v of bloco.vedacao) {
            await conn.execute(
              `INSERT INTO pagina2_vedacao 
               (inspecao_id, equip, ponto_carga, critic, dano, item, servico, posicao, limpeza, andaime, obs)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                inspecaoId,
                equipCode,
                v.ponto || "",
                v.critic || "",
                JSON.stringify(v.dano || []),
                JSON.stringify(v.item || []),
                JSON.stringify(v.servico || []),
                JSON.stringify(v.posicao || []),
                v.limpeza || "",
                v.andaime || "",
                v.obs || "",
              ],
            );
          }
        }

        if (Array.isArray(bloco.raspadores)) {
          for (const r of bloco.raspadores) {
            await conn.execute(
              `INSERT INTO pagina2_raspadores 
               (inspecao_id, equip, ponto_baliza, critic, dano, item, servico, posicao, limpeza, andaime, obs)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                inspecaoId,
                equipCode,
                r.ponto || "",
                r.critic || "",
                JSON.stringify(r.dano || []),
                JSON.stringify(r.item || []),
                JSON.stringify(r.servico || []),
                JSON.stringify(r.posicao || []),
                r.limpeza || "",
                r.andaime || "",
                r.obs || "",
              ],
            );
          }
        }

        if (Array.isArray(bloco.mesas)) {
          for (const m of bloco.mesas) {
            await conn.execute(
              `INSERT INTO pagina2_mesas 
               (inspecao_id, equip, ponto_carga, critic, dano, item, servico, posicao, limpeza, andaime, modelo, obs)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                inspecaoId,
                equipCode,
                m.ponto || "",
                m.critic || "",
                JSON.stringify(m.dano || []),
                JSON.stringify(m.item || []),
                JSON.stringify(m.servico || []),
                JSON.stringify(m.posicao || []),
                m.limpeza || "",
                m.andaime || "",
                m.modelo || "",
                m.obs || "",
              ],
            );
          }
        }
      }
    } else {
      const equipCode = equip || null;

      if (Array.isArray(pagina2.calhas)) {
        for (const c of pagina2.calhas) {
          await conn.execute(
            `INSERT INTO pagina2_calhas 
             (inspecao_id, equip, ponto_transferencia, letra, pontos, item, dano, servico, critic, limpeza, andaime, obs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inspecaoId,
              equipCode,
              c.ponto ?? null,
              c.letra || null,
              JSON.stringify(c.pontos || []),
              JSON.stringify(c.item || []),
              JSON.stringify(c.dano || []),
              JSON.stringify(c.servico || []),
              c.critic || "",
              c.limpeza || "",
              c.andaime || "",
              c.obs || "",
            ],
          );
        }
      }

      if (Array.isArray(pagina2.vedacao)) {
        for (const v of pagina2.vedacao) {
          await conn.execute(
            `INSERT INTO pagina2_vedacao 
             (inspecao_id, equip, ponto_carga, critic, dano, item, servico, posicao, limpeza, andaime, obs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inspecaoId,
              equipCode,
              v.ponto || "",
              v.critic || "",
              JSON.stringify(v.dano || []),
              JSON.stringify(v.item || []),
              JSON.stringify(v.servico || []),
              JSON.stringify(v.posicao || []),
              v.limpeza || "",
              v.andaime || "",
              v.obs || "",
            ],
          );
        }
      }

      if (Array.isArray(pagina2.raspadores)) {
        for (const r of pagina2.raspadores) {
          await conn.execute(
            `INSERT INTO pagina2_raspadores 
             (inspecao_id, equip, ponto_baliza, critic, dano, item, servico, posicao, limpeza, andaime, obs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inspecaoId,
              equipCode,
              r.ponto || "",
              r.critic || "",
              JSON.stringify(r.dano || []),
              JSON.stringify(r.item || []),
              JSON.stringify(r.servico || []),
              JSON.stringify(r.posicao || []),
              r.limpeza || "",
              r.andaime || "",
              r.obs || "",
            ],
          );
        }
      }

      if (Array.isArray(pagina2.mesas)) {
        for (const m of pagina2.mesas) {
          await conn.execute(
            `INSERT INTO pagina2_mesas 
             (inspecao_id, equip, ponto_carga, critic, dano, item, servico, posicao, limpeza, andaime, modelo, obs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inspecaoId,
              equipCode,
              m.ponto || "",
              m.critic || "",
              JSON.stringify(m.dano || []),
              JSON.stringify(m.item || []),
              JSON.stringify(m.servico || []),
              JSON.stringify(m.posicao || []),
              m.limpeza || "",
              m.andaime || "",
              m.modelo || "",
              m.obs || "",
            ],
          );
        }
      }
    }

    if (
      Array.isArray(pagina3.multiEquipCorreias) &&
      pagina3.multiEquipCorreias.length
    ) {
      for (const bloco of pagina3.multiEquipCorreias) {
        const equipCode = bloco.equip || equip || null;

        if (!Array.isArray(bloco.correias)) continue;

        for (const c of bloco.correias) {
          await conn.execute(
            `INSERT INTO pagina3_correia 
             (inspecao_id, equip, baliza, tramo, lado, tipo, dano, servico, critic, limpeza, andaime,
              eh_emenda, tipo_emenda, cond_emenda, grampos_faltando, desalinhada, obs)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              inspecaoId,
              equipCode,
              c.baliza,
              c.tramo || "",
              c.lado || "",
              c.tipo || "",
              JSON.stringify(c.dano || []),
              JSON.stringify(c.servico || []),
              c.critic || "",
              c.limpeza || "",
              c.andaime || "",
              Boolean(c.eh_emenda) ? 1 : 0,
              c.tipo_emenda || "",
              c.cond_emenda || "",
              Number.isFinite(Number(c.grampos_faltando))
                ? Number(c.grampos_faltando)
                : 0,
              c.desalinhada || "",
              c.obs || "",
            ],
          );
        }
      }
    } else if (Array.isArray(pagina3.correias)) {
      const equipCode = equip || null;

      for (const c of pagina3.correias) {
        await conn.execute(
          `INSERT INTO pagina3_correia 
           (inspecao_id, equip, baliza, tramo, lado, tipo, dano, servico, critic, limpeza, andaime,
            eh_emenda, tipo_emenda, cond_emenda, grampos_faltando, desalinhada, obs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inspecaoId,
            equipCode,
            c.baliza,
            c.tramo || "",
            c.lado || "",
            c.tipo || "",
            JSON.stringify(c.dano || []),
            JSON.stringify(c.servico || []),
            c.critic || "",
            c.limpeza || "",
            c.andaime || "",
            Boolean(c.eh_emenda) ? 1 : 0,
            c.tipo_emenda || "",
            c.cond_emenda || "",
            Number.isFinite(Number(c.grampos_faltando))
              ? Number(c.grampos_faltando)
              : 0,
            c.desalinhada || "",
            c.obs || "",
          ],
        );
      }
    }

    if (Array.isArray(pagina4?.multiEquip) && pagina4.multiEquip.length) {
      for (const bloco of pagina4.multiEquip) {
        const equipCode = bloco.equip || equip || null;
        if (Array.isArray(bloco.tambores)) {
          for (const t of bloco.tambores) {
            await conn.execute(
              `INSERT INTO pagina4_tambores
               (inspecao_id, equip, tambor, critic, revest_dano, revest_servico,
                carcaca_dano, carcaca_servico, mancais_sintomas, mancais_causas, obs)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                inspecaoId,
                equipCode,
                t.tambor || "",
                t.critic || "",
                JSON.stringify(t.revestDano || []),
                JSON.stringify(t.revestServico || []),
                JSON.stringify(t.carcacaDano || []),
                JSON.stringify(t.carcacaServico || []),
                JSON.stringify(t.mancaisSintomas || []),
                JSON.stringify(t.mancaisCausas || []),
                t.obs || "",
              ],
            );
          }
        }
      }
    } else if (Array.isArray(pagina4?.tambores)) {
      const equipCode = pagina4?.equip || equip || null;
      for (const t of pagina4.tambores) {
        await conn.execute(
          `INSERT INTO pagina4_tambores
           (inspecao_id, equip, tambor, critic, revest_dano, revest_servico,
            carcaca_dano, carcaca_servico, mancais_sintomas, mancais_causas, obs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inspecaoId,
            equipCode,
            t.tambor || "",
            t.critic || "",
            JSON.stringify(t.revestDano || []),
            JSON.stringify(t.revestServico || []),
            JSON.stringify(t.carcacaDano || []),
            JSON.stringify(t.carcacaServico || []),
            JSON.stringify(t.mancaisSintomas || []),
            JSON.stringify(t.mancaisCausas || []),
            t.obs || "",
          ],
        );
      }
    }

    if (Array.isArray(pagina5?.multiEquip) && pagina5.multiEquip.length) {
      for (const bloco of pagina5.multiEquip) {
        const equipCode = bloco.equip || equip || null;
        if (Array.isArray(bloco.estrutura)) {
          for (const e of bloco.estrutura) {
            await conn.execute(
              `INSERT INTO pagina5_estrutura
               (inspecao_id, equip, parte, elementos, dano, servico, critic, limpeza, andaime, local, obs)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                inspecaoId,
                equipCode,
                e.parte || "",
                JSON.stringify(e.elementos || []),
                JSON.stringify(e.danos || []),
                JSON.stringify(e.servicos || []),
                e.critic || "",
                e.limpeza || "",
                e.andaime || "",
                e.local || "",
                e.obs || "",
              ],
            );
          }
        }
      }
    } else if (Array.isArray(pagina5?.estrutura)) {
      const equipCode = pagina5?.equip || equip || null;
      for (const e of pagina5.estrutura) {
        await conn.execute(
          `INSERT INTO pagina5_estrutura
           (inspecao_id, equip, parte, elementos, dano, servico, critic, limpeza, andaime, local, obs)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            inspecaoId,
            equipCode,
            e.parte || "",
            JSON.stringify(e.elementos || []),
            JSON.stringify(e.danos || []),
            JSON.stringify(e.servicos || []),
            e.critic || "",
            e.limpeza || "",
            e.andaime || "",
            e.local || "",
            e.obs || "",
          ],
        );
      }
    }

    const parsedEvidencias = [];

    if (Array.isArray(evidencias)) {
      for (const ev of evidencias) {
        if (!ev || !ev.dataUrl) continue;

        const parsed = parseDataUrl(ev.dataUrl);
        if (!parsed) continue;

        parsedEvidencias.push({
          ...ev,
          mimeType: parsed.mimeType,
          sizeBytes: parsed.buffer.length,
          _buffer: parsed.buffer,
        });
      }
    }

    const uploadedEvidencias = [];

    for (const ev of parsedEvidencias) {
      const uploaded = await storageUpload({
        buffer: ev._buffer,
        mimeType: ev.mimeType,
        originalName: ev.fileName || ev.photoName || "evidencia",
      });

      uploadedEvidencias.push({
        ...ev,
        storageUrl: uploaded.url,
        storagePath: uploaded.path,
        storageFileName: uploaded.fileName,
      });
    }

    for (const ev of uploadedEvidencias) {
      if (ev.pagina == null || !ev.secao) {
        throw new Error("Evidência sem 'pagina' ou 'secao' no payload");
      }
      const codesJson = JSON.stringify(ev.codes || []);

      await conn.execute(
        `INSERT INTO evidencias (
          inspecao_id,
          pagina,
          secao,
          tipo,
          baliza,
          ponto,
          linha,
          coluna,
          codes_json,
          original_name,
          file_path,
          mime_type,
          tamanho_bytes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          inspecaoId,

          ev.pagina,
          ev.secao,
          ev.tipo || "imagem",

          ev.baliza ?? null,
          ev.ponto ?? null,
          ev.linha ?? null,
          ev.coluna ?? null,

          codesJson,

          ev.fileName || ev.storageFileName || "evidencia",
          ev.storageUrl,
          ev.mimeType || "image/jpeg",
          ev.sizeBytes ?? null,
        ],
      );
    }

    await gerarOportunidadesParaInspecao(conn, {
      inspecaoId,
      equipPadrao: equip || null,
    });

    await conn.commit();
    res.json({ success: true, id: inspecaoId });
  } catch (error) {
    console.error("[server] Erro ao salvar inspeção:", error);
    try {
      await conn.rollback();
    } catch {}
    res.status(500).json({ error: error.message });
  } finally {
    conn.release();
  }
}

export async function reprocessarOportunidades(req, res) {
  const idsBody = Array.isArray(req.body?.inspecao_ids)
    ? req.body.inspecao_ids
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0)
    : [];

  const pool = getPool();
  const conn = await pool.getConnection();

  try {
    const inspRows = idsBody.length
      ? await conn.query(
          `SELECT id, equip FROM inspecoes WHERE id IN (${idsBody.map(() => "?").join(",")})`,
          idsBody,
        )
      : await conn.query(`SELECT id, equip FROM inspecoes`);

    const lista = Array.isArray(inspRows?.[0]) ? inspRows[0] : [];
    let oportunidadesCriadas = 0;
    let inspecoesProcessadas = 0;
    const erros = [];

    for (const insp of lista) {
      try {
        await conn.beginTransaction();
        const count = await gerarOportunidadesParaInspecao(conn, {
          inspecaoId: insp.id,
          equipPadrao: insp.equip || null,
        });
        await conn.commit();
        oportunidadesCriadas += count || 0;
        inspecoesProcessadas += 1;
      } catch (e) {
        try {
          await conn.rollback();
        } catch {}
        erros.push({ id: insp.id, error: e?.message || "erro desconhecido" });
      }
    }

    res.json({
      success: true,
      inspecoesProcessadas,
      oportunidadesCriadas,
      erros,
    });
  } catch (err) {
    console.error("[inspecoes] erro ao reprocessar oportunidades:", err);
    res.status(500).json({ error: "Erro ao reprocessar oportunidades" });
  } finally {
    conn.release();
  }
}
export async function listarInspecoes(req, res) {
  try {
    let {
      page = "1",
      pageSize = "20",

      empresa_id,
      contrato_id,

      data_de,
      data_ate,
      equip,
      area,
      inspetor,
    } = req.query;

    if (!empresa_id) {
      return res
        .status(400)
        .json({ error: "empresa_id é obrigatório na consulta de inspeções" });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20));
    const offset = (pageNum - 1) * limit;

    const where = [];
    const params = [];

    where.push("i.empresa_id = ?");
    params.push(empresa_id);

    if (contrato_id) {
      where.push("i.contrato_id = ?");
      params.push(contrato_id);
    }

    if (data_de) {
      where.push("i.data >= ?");
      params.push(data_de);
    }

    if (data_ate) {
      where.push("i.data <= ?");
      params.push(data_ate);
    }

    if (equip) {
      where.push("i.equip LIKE ?");
      params.push(`%${equip}%`);
    }

    if (area) {
      where.push("i.area LIKE ?");
      params.push(`%${area}%`);
    }

    if (inspetor) {
      where.push("i.inspetor LIKE ?");
      params.push(`%${inspetor}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalRows = await query(
      `SELECT COUNT(*) AS total
       FROM inspecoes i
       ${whereSql}`,
      params,
    );
    const total = totalRows[0]?.total ?? 0;

    const lista = await query(
      `SELECT
         i.id,
         i.inspetor,
         i.data,
         i.equip,
         i.area,
         i.criado_em,
         i.lat,
         i.lng,
         i.gps_accuracy,
         i.usuario_id,
         i.empresa_id,
         i.contrato_id,
         u.nome  AS usuario_nome,
         u.login AS usuario_login,
         (
           SELECT COUNT(*) FROM evidencias e
           WHERE e.inspecao_id = i.id
         ) AS evidencias_count
       FROM inspecoes i
       LEFT JOIN usuarios u ON u.id = i.usuario_id
       ${whereSql}
       ORDER BY i.data DESC, i.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return res.json({
      items: lista,
      total,
      page: pageNum,
      pageSize: limit,
    });
  } catch (err) {
    console.error("[GET /api/inspecoes] Erro:", err);
    return res.status(500).json({ error: "Erro ao listar inspeções" });
  }
}

export async function getInspecao(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "ID de inspeção inválido" });
    }

    const rowsInsp = await query(
      `SELECT 
         i.*,
         u.login      AS usuario_login,
         u.nome       AS usuario_nome,
         e.nome       AS empresa_nome,
         c.nome       AS contrato_nome
       FROM inspecoes i
       LEFT JOIN usuarios  u ON u.id = i.usuario_id
       LEFT JOIN empresas  e ON e.id = i.empresa_id
       LEFT JOIN contratos c ON c.id = i.contrato_id
       WHERE i.id = ?
       LIMIT 1`,
      [id],
    );

    if (!rowsInsp.length) {
      return res.status(404).json({ error: "Inspeção não encontrada" });
    }

    const insp = rowsInsp[0];

    const [totais] = await query(
      `SELECT
         (SELECT COUNT(*) FROM pagina1_rolos      WHERE inspecao_id = ?) AS pagina1_rolos,
         (SELECT COUNT(*) FROM pagina2_calhas     WHERE inspecao_id = ?) AS pagina2_calhas,
         (SELECT COUNT(*) FROM pagina2_vedacao    WHERE inspecao_id = ?) AS pagina2_vedacao,
         (SELECT COUNT(*) FROM pagina2_raspadores WHERE inspecao_id = ?) AS pagina2_raspadores,
         (SELECT COUNT(*) FROM pagina2_mesas      WHERE inspecao_id = ?) AS pagina2_mesas,
         (SELECT COUNT(*) FROM pagina3_correia    WHERE inspecao_id = ?) AS pagina3_correia,
         (SELECT COUNT(*) FROM pagina4_tambores   WHERE inspecao_id = ?) AS pagina4_tambores,
         (SELECT COUNT(*) FROM pagina5_estrutura  WHERE inspecao_id = ?) AS pagina5_estrutura,
         (SELECT COUNT(*) FROM evidencias         WHERE inspecao_id = ?) AS evidencias
       `,
      [id, id, id, id, id, id, id, id, id],
    );

    const rolos = await query(
      `SELECT id, baliza, limp, critic
       FROM pagina1_rolos
       WHERE inspecao_id = ?
       ORDER BY baliza
       LIMIT 10`,
      [id],
    );

    const estruturas = await query(
      `SELECT id, parte, local, critic
       FROM pagina5_estrutura
       WHERE inspecao_id = ?
       ORDER BY id
       LIMIT 10`,
      [id],
    );

    res.json({
      insp: {
        id: insp.id,
        data: insp.data,
        equip: insp.equip,
        area: insp.area,
        inspetor: insp.inspetor,
        lat: insp.lat,
        lng: insp.lng,
        gps_accuracy: insp.gps_accuracy,
        criado_em: insp.criado_em,
        usuario: {
          id: insp.usuario_id,
          login: insp.usuario_login,
          nome: insp.usuario_nome,
        },
        empresa: {
          id: insp.empresa_id,
          nome: insp.empresa_nome,
        },
        contrato: {
          id: insp.contrato_id,
          nome: insp.contrato_nome,
        },
      },
      totais,
      amostras: {
        rolos,
        estruturas,
      },
    });
  } catch (err) {
    console.error("[inspecoes/:id] erro ao carregar detalhe:", err);
    res.status(500).json({ error: "Erro ao buscar detalhes da inspeção" });
  }
}

export async function getInspecaoDetalhes(req, res) {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "ID da inspeção é obrigatório" });
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [inspRows] = await conn.query(
      `SELECT 
         i.*,
         u.nome        AS usuario_nome,
         u.login       AS usuario_login,
         e.nome        AS empresa_nome,
         c.nome        AS contrato_nome
       FROM inspecoes i
       LEFT JOIN usuarios u ON u.id = i.usuario_id
       LEFT JOIN empresas e ON e.id = i.empresa_id
       LEFT JOIN contratos c ON c.id = i.contrato_id
       WHERE i.id = ?
       LIMIT 1`,
      [id],
    );

    if (!inspRows.length) {
      await conn.rollback();
      return res.status(404).json({ error: "Inspeção não encontrada" });
    }

    const inspecao = inspRows[0];

    const [rolosRows] = await conn.query(
      `SELECT *
         FROM pagina1_rolos
        WHERE inspecao_id = ?`,
      [id],
    );

    const rolosParsed = rolosRows.map((r) => {
      const parsed = {
        ...r,
        carga_E: parseJson(r.carga_E),
        carga_C: parseJson(r.carga_C),
        carga_D: parseJson(r.carga_D),
        impacto_E: parseJson(r.impacto_E),
        impacto_C: parseJson(r.impacto_C),
        impacto_D: parseJson(r.impacto_D),
        retorno_RB: parseJson(r.retorno_RB),
        retorno_RP: parseJson(r.retorno_RP),
        retorno_RT: parseJson(r.retorno_RT),
        verticais_EC: parseJson(r.verticais_EC),
        verticais_DC: parseJson(r.verticais_DC),
        verticais_ER: parseJson(r.verticais_ER),
        verticais_DR: parseJson(r.verticais_DR),
        suportes_CAR: parseJson(r.suportes_CAR),
        suportes_AAC: parseJson(r.suportes_AAC),
        suportes_RET: parseJson(r.suportes_RET),
        suportes_AAR: parseJson(r.suportes_AAR),
        suportes_CAL: parseJson(r.suportes_CAL),
      };

      const hasData =
        hasText(parsed.limp) ||
        hasText(parsed.critic) ||
        hasArray(parsed.carga_E) ||
        hasArray(parsed.carga_C) ||
        hasArray(parsed.carga_D) ||
        hasArray(parsed.impacto_E) ||
        hasArray(parsed.impacto_C) ||
        hasArray(parsed.impacto_D) ||
        hasArray(parsed.retorno_RB) ||
        hasArray(parsed.retorno_RP) ||
        hasArray(parsed.retorno_RT) ||
        hasArray(parsed.verticais_EC) ||
        hasArray(parsed.verticais_DC) ||
        hasArray(parsed.verticais_ER) ||
        hasArray(parsed.verticais_DR) ||
        hasArray(parsed.suportes_CAR) ||
        hasArray(parsed.suportes_AAC) ||
        hasArray(parsed.suportes_RET) ||
        hasArray(parsed.suportes_AAR) ||
        hasArray(parsed.suportes_CAL);

      return { ...parsed, _hasData: hasData };
    });

    const rolosComDados = rolosParsed.filter((r) => r._hasData);

    const [calhasRows] = await conn.query(
      `SELECT * FROM pagina2_calhas WHERE inspecao_id = ?`,
      [id],
    );
    const [vedacaoRows] = await conn.query(
      `SELECT * FROM pagina2_vedacao WHERE inspecao_id = ?`,
      [id],
    );
    const [raspadoresRows] = await conn.query(
      `SELECT * FROM pagina2_raspadores WHERE inspecao_id = ?`,
      [id],
    );
    const [mesasRows] = await conn.query(
      `SELECT * FROM pagina2_mesas WHERE inspecao_id = ?`,
      [id],
    );

    const calhasParsed = calhasRows
      .map((r) => {
        const parsed = {
          ...r,
          pontos: parseJson(r.pontos),
          item: parseJson(r.item),
          dano: parseJson(r.dano),
          servico: parseJson(r.servico),
        };
        const hasData =
          hasText(parsed.critic) ||
          hasText(parsed.limpeza) ||
          hasText(parsed.andaime) ||
          hasArray(parsed.pontos) ||
          hasArray(parsed.item) ||
          hasArray(parsed.dano) ||
          hasArray(parsed.servico);
        return { ...parsed, _hasData: hasData };
      })
      .filter((r) => r._hasData);

    const vedacaoParsed = vedacaoRows
      .map((r) => {
        const parsed = {
          ...r,
          dano: parseJson(r.dano),
          item: parseJson(r.item),
          servico: parseJson(r.servico),
          posicao: parseJson(r.posicao),
        };
        const hasData =
          hasText(parsed.critic) ||
          hasText(parsed.limpeza) ||
          hasText(parsed.andaime) ||
          hasArray(parsed.dano) ||
          hasArray(parsed.item) ||
          hasArray(parsed.servico) ||
          hasArray(parsed.posicao);
        return { ...parsed, _hasData: hasData };
      })
      .filter((r) => r._hasData);

    const raspadoresParsed = raspadoresRows
      .map((r) => {
        const parsed = {
          ...r,
          dano: parseJson(r.dano),
          item: parseJson(r.item),
          servico: parseJson(r.servico),
          posicao: parseJson(r.posicao),
        };
        const hasData =
          hasText(parsed.critic) ||
          hasText(parsed.limpeza) ||
          hasText(parsed.andaime) ||
          hasArray(parsed.dano) ||
          hasArray(parsed.item) ||
          hasArray(parsed.servico) ||
          hasArray(parsed.posicao);
        return { ...parsed, _hasData: hasData };
      })
      .filter((r) => r._hasData);

    const mesasParsed = mesasRows
      .map((r) => {
        const parsed = {
          ...r,
          dano: parseJson(r.dano),
          item: parseJson(r.item),
          servico: parseJson(r.servico),
          posicao: parseJson(r.posicao),
        };
        const hasData =
          hasText(parsed.critic) ||
          hasText(parsed.limpeza) ||
          hasText(parsed.andaime) ||
          hasText(parsed.modelo) ||
          hasArray(parsed.dano) ||
          hasArray(parsed.item) ||
          hasArray(parsed.servico) ||
          hasArray(parsed.posicao);
        return { ...parsed, _hasData: hasData };
      })
      .filter((r) => r._hasData);

    const [correiasRows] = await conn.query(
      `SELECT * FROM pagina3_correia WHERE inspecao_id = ?`,
      [id],
    );

    const correiasParsed = correiasRows
      .map((r) => {
        const parsed = {
          ...r,
          dano: parseJson(r.dano),
          servico: parseJson(r.servico),
        };
        const grampos = Number(parsed.grampos_faltando ?? 0);
        const hasData =
          hasText(parsed.critic) ||
          hasText(parsed.limpeza) ||
          hasText(parsed.andaime) ||
          hasText(parsed.desalinhada) ||
          hasText(parsed.tipo_emenda) ||
          hasText(parsed.cond_emenda) ||
          hasNumber(grampos) ||
          Boolean(parsed.eh_emenda) ||
          hasArray(parsed.dano) ||
          hasArray(parsed.servico);
        return { ...parsed, grampos_faltando: grampos, _hasData: hasData };
      })
      .filter((r) => r._hasData);

    const [tamboresRows] = await conn.query(
      `SELECT * FROM pagina4_tambores WHERE inspecao_id = ?`,
      [id],
    );

    const tamboresParsed = tamboresRows
      .map((r) => {
        const parsed = {
          ...r,
          revest_dano: parseJson(r.revest_dano),
          revest_servico: parseJson(r.revest_servico),
          carcaca_dano: parseJson(r.carcaca_dano),
          carcaca_servico: parseJson(r.carcaca_servico),
          mancais_sintomas: parseJson(r.mancais_sintomas),
          mancais_causas: parseJson(r.mancais_causas),
        };
        const hasData =
          hasText(parsed.critic) ||
          hasText(parsed.obs) ||
          hasArray(parsed.revest_dano) ||
          hasArray(parsed.revest_servico) ||
          hasArray(parsed.carcaca_dano) ||
          hasArray(parsed.carcaca_servico) ||
          hasArray(parsed.mancais_sintomas) ||
          hasArray(parsed.mancais_causas);
        return { ...parsed, _hasData: hasData };
      })
      .filter((r) => r._hasData);

    const [estruturaRows] = await conn.query(
      `SELECT * FROM pagina5_estrutura WHERE inspecao_id = ?`,
      [id],
    );

    const estruturaParsed = estruturaRows
      .map((r) => {
        const parsed = {
          ...r,
          elementos: parseJson(r.elementos),
          dano: parseJson(r.dano),
          servico: parseJson(r.servico),
        };
        const hasData =
          hasText(parsed.critic) ||
          hasText(parsed.limpeza) ||
          hasText(parsed.andaime) ||
          hasText(parsed.local) ||
          hasText(parsed.obs) ||
          hasArray(parsed.elementos) ||
          hasArray(parsed.dano) ||
          hasArray(parsed.servico);
        return { ...parsed, _hasData: hasData };
      })
      .filter((r) => r._hasData);

    const [evidRows] = await conn.query(
      `SELECT 
         id, pagina, secao, tipo, baliza, ponto, linha, coluna,
         original_name, file_path, mime_type, tamanho_bytes,
         codes_json, criado_em
       FROM evidencias
       WHERE inspecao_id = ?
       ORDER BY pagina, secao, id`,
      [id],
    );

    const evidencias = evidRows.map((e) => ({
      ...e,
      codes: parseJson(e.codes_json),
    }));

    await conn.commit();

    res.json({
      inspecao: {
        id: inspecao.id,
        data: inspecao.data,
        equip: inspecao.equip,
        area: inspecao.area,
        inspetor: inspecao.inspetor,
        criado_em: inspecao.criado_em,
        lat: inspecao.lat,
        lng: inspecao.lng,
        gps_accuracy: inspecao.gps_accuracy,
        usuario: {
          id: inspecao.usuario_id,
          nome: inspecao.usuario_nome,
          login: inspecao.usuario_login,
        },
        empresa: {
          id: inspecao.empresa_id,
          nome: inspecao.empresa_nome,
        },
        contrato: {
          id: inspecao.contrato_id,
          nome: inspecao.contrato_nome,
        },
      },

      resumo: {
        pagina1: {
          total: rolosParsed.length,
          comDados: rolosComDados.length,
        },
        pagina2: {
          calhas: { total: calhasRows.length, comDados: calhasParsed.length },
          vedacao: { total: vedacaoRows.length, comDados: vedacaoParsed.length },
          raspadores: {
            total: raspadoresRows.length,
            comDados: raspadoresParsed.length,
          },
          mesas: { total: mesasRows.length, comDados: mesasParsed.length },
        },
        pagina3: {
          total: correiasRows.length,
          comDados: correiasParsed.length,
        },
        pagina4: {
          total: tamboresRows.length,
          comDados: tamboresParsed.length,
        },
        pagina5: {
          total: estruturaRows.length,
          comDados: estruturaParsed.length,
        },
        evidencias: evidencias.length,
      },

      pagina1: {
        rolos: rolosComDados,
      },
      pagina2: {
        calhas: calhasParsed,
        vedacao: vedacaoParsed,
        raspadores: raspadoresParsed,
        mesas: mesasParsed,
      },
      pagina3: {
        correias: correiasParsed,
      },
      pagina4: {
        tambores: tamboresParsed,
      },
      pagina5: {
        estruturas: estruturaParsed,
      },
      evidencias,
    });
  } catch (err) {
    console.error("[detalhes-inspecao] Erro:", err);
    try {
      await conn.rollback();
    } catch {}
    res.status(500).json({ error: "Erro ao carregar detalhes da inspeção" });
  } finally {
    conn.release();
  }
}

