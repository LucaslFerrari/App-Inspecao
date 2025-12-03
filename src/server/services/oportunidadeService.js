import { getPool, query } from "../db/pool.js";

const STATUS_ABERTA = "aberta";
const STATUS_EXECUTADA = "executada";

function normalizeCritic(value) {
  if (value == null) return "";
  return String(value).trim();
}

function normalizeStatus(value) {
  if (value === true) return STATUS_EXECUTADA;
  if (value === false) return STATUS_ABERTA;

  const raw = (value || "").toString().toLowerCase();
  if (raw === STATUS_EXECUTADA) return STATUS_EXECUTADA;
  return STATUS_ABERTA;
}

function isCritical(value) {
  const critic = normalizeCritic(value);
  if (!critic) return false;
  const lower = critic.toLowerCase();
  if (lower === "ok" || lower === "0") return false;
  return true;
}

function parseJson(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function joinList(raw, labelsMap) {
  const arr = Array.isArray(raw) ? raw : parseJson(raw);
  if (!arr.length) return "";
  return arr
    .map((code) => {
      const k = String(code);
      return labelsMap.get(k) || k;
    })
    .join(", ");
}

async function resolveCorreiaId(conn, equipCode, cache) {
  if (!equipCode) return null;
  const key = String(equipCode).trim();
  if (cache.has(key)) return cache.get(key);

  const [rows] = await conn.query(
    `SELECT id FROM correias WHERE code = ? LIMIT 1`,
    [key],
  );
  const id = rows?.[0]?.id ?? null;
  cache.set(key, id);
  return id;
}

async function carregarCatalogosMap(conn) {
  const labels = new Map();
  try {
    const [rows] = await conn.query(`SELECT code, label FROM catalogos`);
    for (const r of rows || []) {
      labels.set(String(r.code), r.label || r.code);
    }
  } catch (err) {
    console.warn("[oportunidades] falha ao carregar catalogos, usando códigos brutos:", err);
  }
  return labels;
}

async function coletarOportunidades(conn, { inspecaoId, equipPadrao }) {
  const cacheCorreia = new Map();
  const oportunidades = [];
  const labelsMap = await carregarCatalogosMap(conn);

  // Pagina 1 - Rolos
  const [rolos] = await conn.query(
    `SELECT
       id, equip, baliza, limp, critic,
       carga_E, carga_C, carga_D,
       impacto_E, impacto_C, impacto_D,
       retorno_RB, retorno_RP, retorno_RT,
       verticais_EC, verticais_DC, verticais_ER, verticais_DR,
       suportes_CAR, suportes_AAC, suportes_RET, suportes_AAR, suportes_CAL
     FROM pagina1_rolos
    WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  for (const r of rolos) {
    if (!isCritical(r.critic)) continue;
    const correiaId = await resolveCorreiaId(conn, r.equip || equipPadrao, cacheCorreia);
    const descParts = [];
    if (r.limp) descParts.push(`Limpeza: ${labelsMap.get(String(r.limp)) || r.limp}`);

    const gruposRolo = [
      ["Carga E", r.carga_E],
      ["Carga C", r.carga_C],
      ["Carga D", r.carga_D],
      ["Impacto E", r.impacto_E],
      ["Impacto C", r.impacto_C],
      ["Impacto D", r.impacto_D],
      ["Retorno RB", r.retorno_RB],
      ["Retorno RP", r.retorno_RP],
      ["Retorno RT", r.retorno_RT],
      ["Verticais EC", r.verticais_EC],
      ["Verticais DC", r.verticais_DC],
      ["Verticais ER", r.verticais_ER],
      ["Verticais DR", r.verticais_DR],
      ["Suportes CAR", r.suportes_CAR],
      ["Suportes AAC", r.suportes_AAC],
      ["Suportes RET", r.suportes_RET],
      ["Suportes AAR", r.suportes_AAR],
      ["Suportes CAL", r.suportes_CAL],
    ];

    for (const [label, valores] of gruposRolo) {
      const joined = joinList(valores, labelsMap);
      if (joined) descParts.push(`${label}: ${joined}`);
    }

    oportunidades.push({
      inspecao_id: inspecaoId,
      correia_id: correiaId,
      pagina: 1,
      registro_id: r.id,
      equip: r.equip || equipPadrao || "",
      titulo: `Rolos - baliza ${r.baliza ?? "-"}`,
      descricao: descParts.join(" | "),
      critic: normalizeCritic(r.critic),
      status: STATUS_ABERTA,
    });
  }

  // Pagina 2 - Calhas
  const [calhas] = await conn.query(
    `SELECT id, equip, ponto_transferencia, letra, critic, limpeza
       FROM pagina2_calhas
      WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  for (const c of calhas) {
    if (!isCritical(c.critic)) continue;
    const correiaId = await resolveCorreiaId(conn, c.equip || equipPadrao, cacheCorreia);
    const desc = [
      c.ponto_transferencia ? `Ponto: ${c.ponto_transferencia}` : null,
      c.letra ? `Letra: ${c.letra}` : null,
      c.limpeza ? `Limpeza: ${c.limpeza}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    oportunidades.push({
      inspecao_id: inspecaoId,
      correia_id: correiaId,
      pagina: 2,
      registro_id: c.id,
      equip: c.equip || equipPadrao || "",
      titulo: "Calhas",
      descricao: desc,
      critic: normalizeCritic(c.critic),
      status: STATUS_ABERTA,
    });
  }

  // Pagina 2 - Vedacao
  const [vedacao] = await conn.query(
    `SELECT id, equip, ponto_carga, critic, dano, servico, posicao
       FROM pagina2_vedacao
      WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  for (const v of vedacao) {
    if (!isCritical(v.critic)) continue;
    const correiaId = await resolveCorreiaId(conn, v.equip || equipPadrao, cacheCorreia);
    const desc = [
      v.ponto_carga ? `Ponto: ${v.ponto_carga}` : null,
      joinList(v.dano, labelsMap) ? `Dano: ${joinList(v.dano, labelsMap)}` : null,
      joinList(v.servico, labelsMap) ? `Servico: ${joinList(v.servico, labelsMap)}` : null,
      joinList(v.posicao, labelsMap) ? `Posicao: ${joinList(v.posicao, labelsMap)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    oportunidades.push({
      inspecao_id: inspecaoId,
      correia_id: correiaId,
      pagina: 2,
      registro_id: v.id,
      equip: v.equip || equipPadrao || "",
      titulo: "Vedacao",
      descricao: desc,
      critic: normalizeCritic(v.critic),
      status: STATUS_ABERTA,
    });
  }

  // Pagina 2 - Raspadores
  const [raspadores] = await conn.query(
    `SELECT id, equip, ponto_baliza, critic, dano, servico, posicao
       FROM pagina2_raspadores
      WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  for (const r of raspadores) {
    if (!isCritical(r.critic)) continue;
    const correiaId = await resolveCorreiaId(conn, r.equip || equipPadrao, cacheCorreia);
    const desc = [
      r.ponto_baliza ? `Ponto: ${r.ponto_baliza}` : null,
      joinList(r.dano, labelsMap) ? `Dano: ${joinList(r.dano, labelsMap)}` : null,
      joinList(r.servico, labelsMap) ? `Servico: ${joinList(r.servico, labelsMap)}` : null,
      joinList(r.posicao, labelsMap) ? `Posicao: ${joinList(r.posicao, labelsMap)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    oportunidades.push({
      inspecao_id: inspecaoId,
      correia_id: correiaId,
      pagina: 2,
      registro_id: r.id,
      equip: r.equip || equipPadrao || "",
      titulo: "Raspadores",
      descricao: desc,
      critic: normalizeCritic(r.critic),
      status: STATUS_ABERTA,
    });
  }

  // Pagina 2 - Mesas
  const [mesas] = await conn.query(
    `SELECT id, equip, ponto_carga, critic, dano, servico, posicao, modelo
       FROM pagina2_mesas
      WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  for (const m of mesas) {
    if (!isCritical(m.critic)) continue;
    const correiaId = await resolveCorreiaId(conn, m.equip || equipPadrao, cacheCorreia);
    const desc = [
      m.ponto_carga ? `Ponto: ${m.ponto_carga}` : null,
      m.modelo ? `Modelo: ${m.modelo}` : null,
      joinList(m.dano, labelsMap) ? `Dano: ${joinList(m.dano, labelsMap)}` : null,
      joinList(m.servico, labelsMap) ? `Servico: ${joinList(m.servico, labelsMap)}` : null,
      joinList(m.posicao, labelsMap) ? `Posicao: ${joinList(m.posicao, labelsMap)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    oportunidades.push({
      inspecao_id: inspecaoId,
      correia_id: correiaId,
      pagina: 2,
      registro_id: m.id,
      equip: m.equip || equipPadrao || "",
      titulo: "Mesas",
      descricao: desc,
      critic: normalizeCritic(m.critic),
      status: STATUS_ABERTA,
    });
  }

  // Pagina 3 - Correia
  const [correias] = await conn.query(
    `SELECT id, equip, baliza, tramo, lado, tipo, critic, desalinhada, tipo_emenda, cond_emenda
       FROM pagina3_correia
      WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  for (const c of correias) {
    if (!isCritical(c.critic)) continue;
    const correiaId = await resolveCorreiaId(conn, c.equip || equipPadrao, cacheCorreia);
    const desc = [
      c.tramo ? `Tramo: ${c.tramo}` : null,
      c.lado ? `Lado: ${c.lado}` : null,
      c.tipo ? `Tipo: ${c.tipo}` : null,
      c.desalinhada ? `Desalinhada: ${c.desalinhada}` : null,
      c.tipo_emenda ? `Emenda: ${c.tipo_emenda}` : null,
      c.cond_emenda ? `Cond. emenda: ${c.cond_emenda}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    oportunidades.push({
      inspecao_id: inspecaoId,
      correia_id: correiaId,
      pagina: 3,
      registro_id: c.id,
      equip: c.equip || equipPadrao || "",
      titulo: `Correia - baliza ${c.baliza ?? "-"}`,
      descricao: desc,
      critic: normalizeCritic(c.critic),
      status: STATUS_ABERTA,
    });
  }

  // Pagina 4 - Tambores
  const [tambores] = await conn.query(
    `SELECT id, equip, tambor, critic, revest_dano, carcaca_dano, mancais_sintomas
       FROM pagina4_tambores
      WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  for (const t of tambores) {
    if (!isCritical(t.critic)) continue;
    const correiaId = await resolveCorreiaId(conn, t.equip || equipPadrao, cacheCorreia);
    const desc = [
      t.tambor ? `Tambor: ${t.tambor}` : null,
      joinList(t.revest_dano, labelsMap) ? `Revest.: ${joinList(t.revest_dano, labelsMap)}` : null,
      joinList(t.carcaca_dano, labelsMap) ? `Carcaca: ${joinList(t.carcaca_dano, labelsMap)}` : null,
      joinList(t.mancais_sintomas, labelsMap) ? `Mancais: ${joinList(t.mancais_sintomas, labelsMap)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    oportunidades.push({
      inspecao_id: inspecaoId,
      correia_id: correiaId,
      pagina: 4,
      registro_id: t.id,
      equip: t.equip || equipPadrao || "",
      titulo: "Tambores",
      descricao: desc,
      critic: normalizeCritic(t.critic),
      status: STATUS_ABERTA,
    });
  }

  // Pagina 5 - Estrutura
  const [estrutura] = await conn.query(
    `SELECT id, equip, parte, local, critic, elementos, dano, servico
       FROM pagina5_estrutura
      WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  for (const e of estrutura) {
    if (!isCritical(e.critic)) continue;
    const correiaId = await resolveCorreiaId(conn, e.equip || equipPadrao, cacheCorreia);
    const desc = [
      e.parte ? `Parte: ${e.parte}` : null,
      e.local ? `Local: ${e.local}` : null,
      joinList(e.elementos, labelsMap) ? `Elementos: ${joinList(e.elementos, labelsMap)}` : null,
      joinList(e.dano, labelsMap) ? `Dano: ${joinList(e.dano, labelsMap)}` : null,
      joinList(e.servico, labelsMap) ? `Servico: ${joinList(e.servico, labelsMap)}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    oportunidades.push({
      inspecao_id: inspecaoId,
      correia_id: correiaId,
      pagina: 5,
      registro_id: e.id,
      equip: e.equip || equipPadrao || "",
      titulo: "Estrutura",
      descricao: desc,
      critic: normalizeCritic(e.critic),
      status: STATUS_ABERTA,
    });
  }

  return oportunidades;
}

export async function gerarOportunidadesParaInspecao(conn, { inspecaoId, equipPadrao }) {
  if (!inspecaoId) return;

  const [existentes] = await conn.query(
    `SELECT pagina, registro_id, status
       FROM inspecao_oportunidades
      WHERE inspecao_id = ?`,
    [inspecaoId],
  );
  const statusMap = new Map();
  if (Array.isArray(existentes)) {
    for (const row of existentes) {
      const key = `${row.pagina}:${row.registro_id}`;
      statusMap.set(key, normalizeStatus(row.status));
    }
  }

  // Evita duplicidade ao reprocessar a mesma inspecao
  await conn.execute(
    `DELETE FROM inspecao_oportunidades WHERE inspecao_id = ?`,
    [inspecaoId],
  );

  const oportunidades = await coletarOportunidades(conn, { inspecaoId, equipPadrao });
  for (const o of oportunidades) {
    await conn.execute(
      `INSERT INTO inspecao_oportunidades
        (inspecao_id, correia_id, pagina, registro_id, equip, titulo, descricao, critic, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        o.inspecao_id,
        o.correia_id,
        o.pagina,
        o.registro_id,
        o.equip,
        o.titulo,
        o.descricao || "",
        o.critic,
        statusMap.get(`${o.pagina}:${o.registro_id}`) || o.status,
      ],
    );
  }

  return oportunidades.length;
}

export async function listarOportunidadesPorCorreia(correiaId, { incluirExecutadas = true } = {}) {
  const cid = Number(correiaId);
  if (!Number.isInteger(cid) || cid <= 0) return [];

  return query(
    `SELECT id, inspecao_id, correia_id, pagina, registro_id, equip, titulo, descricao, critic, status, criado_em
       FROM inspecao_oportunidades
      WHERE correia_id = ?
      ORDER BY CAST(critic AS UNSIGNED) ASC, criado_em DESC, id DESC`,
    [cid],
  );
}

export async function atualizarStatusOportunidades(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    return { updated: 0 };
  }

  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let updated = 0;

    for (const item of updates) {
      const id = Number(item?.id);
      if (!Number.isInteger(id) || id <= 0) continue;
      const status = normalizeStatus(item?.status);
      const [res] = await conn.execute(
        `UPDATE inspecao_oportunidades SET status = ? WHERE id = ?`,
        [status, id],
      );
      updated += res.affectedRows || 0;
    }

    await conn.commit();
    return { updated };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
