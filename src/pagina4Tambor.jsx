"use client"

import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from "react"
import Section from "./components/ui/Section"
import ResponsiveHeader from "./components/responsive/ResponsiveHeader"
import { buildMetadataRows, statusFromCritic } from "./lib/exportUtils"

import { useAreas, useCorreias, toOptions as toDomOptions, useAutoFillArea } from "./hooks/useDomain"
import { useCatalog } from "./hooks/useCatalog"
import { safeId } from "./lib/safeId"

const cx = (...c) => c.filter(Boolean).join(" ")

// chave usada quando não tiver equip selecionado (mesma ideia da Página 2)
const NO_EQUIP_KEY = "__SEM_EQUIP__"

/* ===================== HELPERS DE CATÁLOGO ===================== */

function normalizeCatalog(cat) {
  if (!cat) return []
  const data = Array.isArray(cat) ? cat : cat.data || cat.items || []
  return data.map((row) => {
    const code = row.code ?? row.value ?? row.id
    const label = row.label ?? row.nome ?? row.name ?? String(code)
    return { code, label }
  })
}

function mapCodesToLabels(cat, codes) {
  const list = normalizeCatalog(cat)
  const map = new Map(list.map((c) => [c.code, c.label]))
  return (codes || []).map((c) => map.get(c) || c).join(", ")
}

/* ===================== COMPONENTES SIMPLES ===================== */

function SelectField({ value, onChange, options, placeholder = "", className = "" }) {
  const list = normalizeCatalog(options)
  return (
    <select
      className={cx(
        "w-full border rounded-2xl px-2 py-1 text-xs md:text-sm",
        className,
      )}
      value={value || ""}
      onChange={(e) => onChange(e.target.value || "")}
    >
      <option value="">{placeholder || "–"}</option>
      {list.map((opt) => (
        <option key={opt.code} value={opt.code}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

/**
 * Componente de seleção múltipla via modal (estilo das outras páginas).
 * Mantém o valor como array de códigos (mesmo shape que já existe no state).
 */
function CellMultiSelect({ label, catalog, values, onChange, placeholder = "Selecionar..." }) {
  const [open, setOpen] = useState(false)
  const [tempValues, setTempValues] = useState(values || [])

  const list = normalizeCatalog(catalog)

  // sempre que abrir o modal, sincroniza com o valor atual
  useEffect(() => {
    if (open) {
      setTempValues(values || [])
    }
  }, [open, values])

  function toggleValue(code) {
    setTempValues((curr) =>
      curr.includes(code) ? curr.filter((c) => c !== code) : [...curr, code],
    )
  }

  function handleSave() {
    onChange(tempValues || [])
    setOpen(false)
  }

  const summary = values && values.length
    ? mapCodesToLabels(catalog, values)
    : "Nenhum selecionado"

  return (
    <>
      {/* Botão na célula */}
      <button
        type="button"
        className="w-full rounded-2xl border px-2 py-1 text-[0.7rem] md:text-xs text-left truncate"
        onClick={() => setOpen(true)}
      >
        {placeholder}
      </button>
      <div className="mt-1 text-[0.65rem] md:text-[0.7rem] text-slate-500 line-clamp-2">
        {summary}
      </div>

      {/* Modal simples */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-sm md:text-base font-semibold">
                Selecionar — {label}
              </h2>
              <button
                type="button"
                className="text-slate-500 hover:text-slate-700 text-lg leading-none"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-4 space-y-3 overflow-y-auto">
              {list.length ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {list.map((opt) => {
                    const isActive = tempValues.includes(opt.code)
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => toggleValue(opt.code)}
                        className={cx(
                          "border rounded-2xl px-2 py-1 text-[0.75rem] md:text-xs text-left transition",
                          isActive
                            ? "border-sky-500 bg-sky-50 font-semibold"
                            : "border-slate-300 hover:border-slate-400",
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Sem itens no catálogo.</p>
              )}

              <p className="text-xs text-slate-500">
                Selecionados:{" "}
                {tempValues && tempValues.length
                  ? mapCodesToLabels(catalog, tempValues)
                  : "nenhum"}
              </p>
            </div>

            {/* Rodapé */}
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <button
                type="button"
                className="px-3 py-1 text-xs md:text-sm rounded-2xl border hover:bg-slate-50"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-3 py-1 text-xs md:text-sm rounded-2xl bg-sky-600 text-white hover:bg-sky-700"
                onClick={handleSave}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
/* ===================== LINHA / ESTADO ===================== */

const makeEmptyRow = () => ({
  id: safeId(),
  tambor: "",

  critic: "",

  revestDano: [],
  revestServico: [],

  carcacaDano: [],
  carcacaServico: [],

  mancaisSintomas: [],
  mancaisCausas: [],

  obs: "",
})

/* ===================== COMPONENTE PRINCIPAL ===================== */

const Pagina4Tambor = forwardRef(function Pagina4Tambor(
  { header, onHeaderChange },
  ref,
) {
  // Cabeçalho
  const { inspetor, data, equip, area } = header
  const { data: areas } = useAreas()
  const { data: correias } = useCorreias()

  useAutoFillArea({
    correias,
    areas,
    equipCode: equip,
    currentArea: area,
    onChange: (val) => onHeaderChange?.("area", val),
  })

  // Estado por correia: para cada correia, uma lista de tambores
  const [porEquip, setPorEquip] = useState({})
  const [rows, setRows] = useState([makeEmptyRow()])
  const lastEquipRef = useRef(equip || NO_EQUIP_KEY)

  // Catálogos
  const catTamborPos = useCatalog("tambores_posicao") // Cabeça, Cauda, Desvio, etc
  const catCritic = useCatalog("criticidade")

  const catRevestDano = useCatalog("tambores_revest_dano")
  const catRevestServ = useCatalog("tambores_revest_servico") // ou "tambores_servico"

  const catCarcacaDano = useCatalog("tambores_carcaca_dano")
  const catCarcacaServ = useCatalog("tambores_carcaca_servico") // ou reaproveitar o mesmo de revest

  const catMancSintoma = useCatalog("mancais_sintoma") // vibração, aquecimento, labirinto solto
  const catMancCausa = useCatalog("mancais_causa") // folga, falta de lubrificação, eixo gasto...

  const loading =
    catTamborPos?.loading ||
    catCritic?.loading ||
    catRevestDano?.loading ||
    catRevestServ?.loading ||
    catCarcacaDano?.loading ||
    catCarcacaServ?.loading ||
    catMancSintoma?.loading ||
    catMancCausa?.loading

  /* ---------- Cabeçalho / troca de correia ---------- */

  const headerFields = [
    {
      id: "inspetor",
      label: "Inspetor",
      type: "text",
      value: inspetor,
      placeholder: "NOME",
    },
    { id: "data", label: "Data", type: "date", value: data },
    {
      id: "equip",
      label: "Equip",
      type: "select",
      value: equip,
      options: [
        { value: "", label: "" },
        ...toDomOptions(correias, { valueKey: "code", labelKey: "label" }),
      ],
    },
    {
      id: "area",
      label: "Área",
      type: "select",
      value: area,
      options: [
        { value: "", label: "" },
        ...toDomOptions(areas, { valueKey: "code", labelKey: "label" }),
      ],
    },
  ]

  function handleHeaderChange(fieldId, value) {
    if (fieldId === "inspetor") onHeaderChange("inspetor", value)
    else if (fieldId === "data") onHeaderChange("data", value)
    else if (fieldId === "area") onHeaderChange("area", value)
    else if (fieldId === "equip") {
      onHeaderChange("equip", value)
    }

  }

  // sincroniza quando o equipamento muda fora desta página
  useEffect(() => {
    const currentKey = lastEquipRef.current || NO_EQUIP_KEY
    const nextKey = equip || NO_EQUIP_KEY
    if (nextKey === currentKey) return

    setPorEquip(prev => {
      const novoMapa = {
        ...prev,
        [currentKey]: rows,
      }

      const snap = novoMapa[nextKey]

      if (snap && snap.length) {
        setRows(snap)
      } else {
        setRows([makeEmptyRow()])
      }

      return novoMapa
    })

    lastEquipRef.current = nextKey
  }, [equip])


  const rightContent = (
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span>Código:</span>
        <strong>FM-GTO-057</strong>
      </div>
      <div className="flex justify-between">
        <span>Folha:</span>
        <span>4/5</span>
      </div>
      <div className="flex justify-between">
        <span>Revisão:</span>
        <span>-</span>
      </div>
    </div>
  )

  /* ---------- CRUD de linhas ---------- */

  function setRow(id, patch) {
    setRows((curr) => curr.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows((curr) => [...curr, makeEmptyRow()])
  }

  function removeRow(id) {
    setRows((curr) => (curr.length > 1 ? curr.filter((r) => r.id !== id) : curr))
  }

  /* ---------- BUILD DATA / EXPORT ---------- */

  function buildRowsForForm(sourceRows) {
    return (sourceRows || []).map((r) => ({
      tambor: r.tambor || "",
      critic: r.critic || "",
      revestDano: r.revestDano || [],
      revestServico: r.revestServico || [],
      carcacaDano: r.carcacaDano || [],
      carcacaServico: r.carcacaServico || [],
      mancaisSintomas: r.mancaisSintomas || [],
      mancaisCausas: r.mancaisCausas || [],
      obs: r.obs || "",
    }))
  }

  function buildAllPerEquip() {
    const currentKey = equip || NO_EQUIP_KEY
    const fullMap = {
      ...porEquip,
      [currentKey]: rows,
    }

    return Object.entries(fullMap)
      .filter(([k]) => k !== NO_EQUIP_KEY)
      .map(([equipCode, r]) => ({
        equip: equipCode,
        tambores: buildRowsForForm(r || []),
      }))
  }

  function buildExportSheet() {
    const ctx = { inspetor, data, equip, area }

    const metadata = buildMetadataRows({
      inspetor: ctx.inspetor,
      data: ctx.data,
      equip: ctx.equip,
      area: ctx.area,
      extra: [["Seção", "Tambores e Mancais"]],
    })

    const header = [
      "Tambor",
      "Critic.",
      "Revest. – Danos",
      "Revest. – Serviços",
      "Carcaça – Danos",
      "Carcaça – Serviços",
      "Mancais – Sintomas",
      "Mancais – Causas",
      "Observações",
      "Status",
    ]

    const dataRows =
      rows && rows.length
        ? rows.map((r) => [
            mapCodesToLabels(catTamborPos, [r.tambor].filter(Boolean)),
            r.critic || "",
            mapCodesToLabels(catRevestDano, r.revestDano),
            mapCodesToLabels(catRevestServ, r.revestServico),
            mapCodesToLabels(catCarcacaDano, r.carcacaDano),
            mapCodesToLabels(catCarcacaServ, r.carcacaServico),
            mapCodesToLabels(catMancSintoma, r.mancaisSintomas),
            mapCodesToLabels(catMancCausa, r.mancaisCausas),
            r.obs || "",
            statusFromCritic(r.critic),
          ])
        : [
            [
              "-",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "OK",
            ],
          ]

    return [...metadata, header, ...dataRows]
  }

  function clearAll() {
    onHeaderChange("inspetor", "")
    onHeaderChange("data", new Date().toISOString().slice(0, 10))
    onHeaderChange("equip", "")
    onHeaderChange("area", "")
    setRows([makeEmptyRow()])
    setPorEquip({})
  }

  useImperativeHandle(
    ref,
    () => {
      const tambores = buildRowsForForm(rows)
      const multiEquip = buildAllPerEquip()

      return {
        clear: clearAll,
        getFormData: () => ({
          inspetor,
          data,
          equip,
          area,
          tambores,
          multiEquip,
        }),
        getExportSheets: () => [
          {
            name: "Página 4 - Tambores",
            data: buildExportSheet(),
          },
        ],
        getEvidencias: () => [],
      }
    },
    [inspetor, data, equip, area, rows, porEquip],
  )

  const pageStatus =
    rows && rows.some((r) => r.critic && r.critic !== "OK" && r.critic !== "0")
      ? statusFromCritic("1")
      : statusFromCritic("0")

  /* ===================== RENDER ===================== */

  return (
    <Section
      id="p4"
      title="Tambores e Mancais"
      description="Página 4 — Avaliação dos tambores, revestimentos e mancais da correia transportadora."
    >
      <ResponsiveHeader
        fields={headerFields}
        onFieldChange={handleHeaderChange}
        rightContent={rightContent}
        status={pageStatus}
      />

      <p className="text-xs md:text-sm text-slate-600 mt-3">
        Nesta página você registra a condição dos tambores (revestimento e carcaça) e dos mancais
        (sintomas e causas) da correia selecionada.
      </p>

      {loading && (
        <p className="text-xs text-slate-500 mt-2">
          Carregando catálogos de tambores e mancais…
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-[0.7rem] md:text-xs border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr className="text-center">
              <th className="border px-2 py-1">Tambor</th>
              <th className="border px-2 py-1">Critic.</th>
              <th className="border px-2 py-1">Revest. — Danos</th>
              <th className="border px-2 py-1">Revest. — Serviços</th>
              <th className="border px-2 py-1">Carcaça — Danos</th>
              <th className="border px-2 py-1">Carcaça — Serviços</th>
              <th className="border px-2 py-1">Mancais — Sintomas</th>
              <th className="border px-2 py-1">Mancais — Causas</th>
              <th className="border px-2 py-1">Obs.</th>
              <th className="border px-2 py-1 w-10">–</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-slate-50">
                {/* Tambor */}
                <td className="border px-1 py-1">
                  <SelectField
                    value={r.tambor}
                    onChange={(v) => setRow(r.id, { tambor: v })}
                    options={catTamborPos}
                  />
                </td>

                {/* Criticidade */}
                <td className="border px-1 py-1">
                  <SelectField
                    value={r.critic}
                    onChange={(v) => setRow(r.id, { critic: v })}
                    options={catCritic}
                  />
                </td>

                {/* Revestimento – Danos */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="DANO — Revest."
                    catalog={catRevestDano}
                    values={r.revestDano}
                    onChange={(vals) => setRow(r.id, { revestDano: vals })}
                  />
                </td>

                {/* Revestimento – Serviços */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="SERVIÇO — Revest."
                    catalog={catRevestServ}
                    values={r.revestServico}
                    onChange={(vals) => setRow(r.id, { revestServico: vals })}
                  />
                </td>

                {/* Carcaça – Danos */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="DANO — Carcaça"
                    catalog={catCarcacaDano}
                    values={r.carcacaDano}
                    onChange={(vals) => setRow(r.id, { carcacaDano: vals })}
                  />
                </td>

                {/* Carcaça – Serviços */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="SERVIÇO — Carcaça"
                    catalog={catCarcacaServ}
                    values={r.carcacaServico}
                    onChange={(vals) => setRow(r.id, { carcacaServico: vals })}
                  />
                </td>

                {/* Mancais – Sintomas */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="SINTOMAS — Mancais"
                    catalog={catMancSintoma}
                    values={r.mancaisSintomas}
                    onChange={(vals) => setRow(r.id, { mancaisSintomas: vals })}
                  />
                </td>

                {/* Mancais – Causas */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="CAUSAS — Mancais"
                    catalog={catMancCausa}
                    values={r.mancaisCausas}
                    onChange={(vals) => setRow(r.id, { mancaisCausas: vals })}
                  />
                </td>

                {/* Obs */}
                <td className="border px-1 py-1">
                  <textarea
                    className="w-full border rounded-2xl px-2 py-1 text-[0.7rem] md:text-xs"
                    value={r.obs || ""}
                    onChange={(e) => setRow(r.id, { obs: e.target.value })}
                  />
                </td>

                {/* Remover */}
                <td className="border px-1 py-1 text-center">
                  <button
                    type="button"
                    className="text-red-500 text-xs"
                    onClick={() => removeRow(r.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3">
          <button
            type="button"
            className="px-3 py-1 text-xs md:text-sm border rounded-2xl bg-slate-50 hover:bg-slate-100"
            onClick={addRow}
          >
            + Adicionar tambor
          </button>
        </div>
      </div>
    </Section>
  )
})

export default Pagina4Tambor
