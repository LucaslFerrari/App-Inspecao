"use client"

import { forwardRef, useImperativeHandle, useState, useEffect, useRef } from "react"
import Section from "./components/ui/Section"
import ResponsiveHeader from "./components/responsive/ResponsiveHeader"
import { buildMetadataRows, statusFromCritic } from "./lib/exportUtils"

import { useAreas, useCorreias, toOptions as toDomOptions, useAutoFillArea } from "./hooks/useDomain"
import { useCatalog } from "./hooks/useCatalog"
import { safeId } from "./lib/safeId"

const cx = (...c) => c.filter(Boolean).join(" ")
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
 * Seleção múltipla via modal (mesmo padrão das outras páginas).
 * Mantém o valor como array de códigos.
 */
function CellMultiSelect({ label, catalog, values, onChange, placeholder = "Selecionar..." }) {
  const [open, setOpen] = useState(false)
  const [tempValues, setTempValues] = useState(values || [])

  const list = normalizeCatalog(catalog)

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

  const summary =
    values && values.length ? mapCodesToLabels(catalog, values) : "Nenhum selecionado"

  return (
    <>
      {/* botão dentro da célula */}
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

      {/* modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full mx-4 max-h[80vh] md:max-h-[80vh] flex flex-col">
            {/* header */}
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

            {/* body */}
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

            {/* footer */}
            <div className="flex justify-end gap-2 border-top px-4 py-3 border-t">
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
  parte: "",
  elementos: [],
  danos: [],
  servicos: [],
  critic: "",
  limpeza: "",
  andaime: "", // N / I / E, por exemplo
  local: "",
  obs: "",
})

/* ===================== COMPONENTE PRINCIPAL ===================== */

const Pagina5Estrutura = forwardRef(function Pagina5Estrutura(
  { header, onHeaderChange },
  ref,
) {
  // Cabeçalho (igual outras páginas)
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

  const [rows, setRows] = useState([makeEmptyRow()])
  const [porEquip, setPorEquip] = useState({})
  const lastEquipRef = useRef(equip || NO_EQUIP_KEY)

  // Catálogos
  const catParte = useCatalog("estrutura_parte") // principal, contrapeso, passarela, proteção, cobertura, borracha/vedação
  const catItem = useCatalog("estrutura_item") // sapata, viga, longarina, grade piso, corrimão, etc
  const catDano = useCatalog("estrutura_dano") // corrosão, trinca, empeno, furo, etc
  const catServico = useCatalog("estrutura_servico") // reforçar, trocar, soldar, limpar...
  const catCritic = useCatalog("criticidade")
  const catLimpeza = useCatalog("limpeza")
  const catAndaime = useCatalog("andaime_tipo") // se não tiver, você pode criar ou trocar por um catálogo existente

  const loading =
    catParte?.loading ||
    catItem?.loading ||
    catDano?.loading ||
    catServico?.loading ||
    catCritic?.loading ||
    catLimpeza?.loading ||
    catAndaime?.loading

  /* ---------- Cabeçalho ---------- */

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
    else if (fieldId === "equip") {
      onHeaderChange("equip", value)
    }

    else if (fieldId === "area") onHeaderChange("area", value)
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
        <span>5/5</span>
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
      parte: r.parte || "",
      elementos: r.elementos || [],
      danos: r.danos || [],
      servicos: r.servicos || [],
      critic: r.critic || "",
      limpeza: r.limpeza || "",
      andaime: r.andaime || "",
      local: r.local || "",
      obs: r.obs || "",
    }))
  }

  function buildExportSheet() {
    const metadata = buildMetadataRows({
      inspetor,
      data,
      equip,
      area,
      extra: [["Seção", "Estrutura / Proteções / Cobertura / Borrachas"]],
    })

  const header = [
      "Parte da Estrutura",
      "Elementos",
      "Danos",
      "Serviços",
      "Critic.",
      "Limpeza",
      "Andaime",
      "Localização",
      "Observações",
      "Status",
    ]

    const dataRows =
      rows && rows.length
        ? rows.map((r) => [
            mapCodesToLabels(catParte, [r.parte].filter(Boolean)),
            mapCodesToLabels(catItem, r.elementos),
            mapCodesToLabels(catDano, r.danos),
            mapCodesToLabels(catServico, r.servicos),
            r.critic || "",
            mapCodesToLabels(catLimpeza, [r.limpeza].filter(Boolean)),
            mapCodesToLabels(catAndaime, [r.andaime].filter(Boolean)),
            r.local || "",
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
      const estrutura = buildRowsForForm(rows)
      const currentKey = equip || NO_EQUIP_KEY
      const mapa = { ...porEquip, [currentKey]: rows }
      const multiEquip = Object.entries(mapa)
        .filter(([k, r]) => k !== NO_EQUIP_KEY && Array.isArray(r) && r.length)
        .map(([equipCode, r]) => ({
          equip: equipCode,
          estrutura: buildRowsForForm(r),
        }))

      return {
        clear: clearAll,
        getFormData: () => ({
          inspetor,
          data,
          equip,
          area,
          estrutura,
          multiEquip,
        }),
        getExportSheets: () => [
          {
            name: "Página 5 - Estrutura",
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
      id="p5"
      title="Estrutura, Proteções, Cobertura e Borrachas"
      description="Página 5 — Estrutura da correia transportadora, passarelas, contrapeso e vedações."
    >
      <ResponsiveHeader
        fields={headerFields}
        onFieldChange={handleHeaderChange}
        rightContent={rightContent}
        status={pageStatus}
      />

      <p className="text-xs md:text-sm text-slate-600 mt-3">
        Utilize esta página para registrar a condição da estrutura principal, contrapeso,
        passarelas, proteções, cobertura e borrachas/vedações da correia selecionada.
      </p>

      {loading && (
        <p className="text-xs text-slate-500 mt-2">
          Carregando catálogos de estrutura…
        </p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-[0.7rem] md:text-xs border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr className="text-center">
              <th className="border px-2 py-1">Parte</th>
              <th className="border px-2 py-1">Elementos</th>
              <th className="border px-2 py-1">Danos</th>
              <th className="border px-2 py-1">Serviços</th>
              <th className="border px-2 py-1">Critic.</th>
              <th className="border px-2 py-1">Limpeza</th>
              <th className="border px-2 py-1">Andaime</th>
              <th className="border px-2 py-1">Local</th>
              <th className="border px-2 py-1">Obs.</th>
              <th className="border px-2 py-1 w-10">–</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="align-top hover:bg-slate-50">
                {/* Parte */}
                <td className="border px-1 py-1">
                  <SelectField
                    value={r.parte}
                    onChange={(v) => setRow(r.id, { parte: v })}
                    options={catParte}
                    placeholder="Parte"
                  />
                </td>

                {/* Elementos */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="Elementos"
                    catalog={catItem}
                    values={r.elementos}
                    onChange={(vals) => setRow(r.id, { elementos: vals })}
                  />
                </td>

                {/* Danos */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="Danos"
                    catalog={catDano}
                    values={r.danos}
                    onChange={(vals) => setRow(r.id, { danos: vals })}
                  />
                </td>

                {/* Serviços */}
                <td className="border px-1 py-1">
                  <CellMultiSelect
                    label="Serviços"
                    catalog={catServico}
                    values={r.servicos}
                    onChange={(vals) => setRow(r.id, { servicos: vals })}
                  />
                </td>

                {/* Critic. */}
                <td className="border px-1 py-1">
                  <SelectField
                    value={r.critic}
                    onChange={(v) => setRow(r.id, { critic: v })}
                    options={catCritic}
                  />
                </td>

                {/* Limpeza */}
                <td className="border px-1 py-1">
                  <SelectField
                    value={r.limpeza}
                    onChange={(v) => setRow(r.id, { limpeza: v })}
                    options={catLimpeza}
                  />
                </td>

                {/* Andaime */}
                <td className="border px-1 py-1">
                  <SelectField
                    value={r.andaime}
                    onChange={(v) => setRow(r.id, { andaime: v })}
                    options={catAndaime}
                  />
                </td>

                {/* Local */}
                <td className="border px-1 py-1">
                  <input
                    className="w-full border rounded-2xl px-2 py-1 text-[0.7rem] md:text-xs"
                    value={r.local || ""}
                    onChange={(e) => setRow(r.id, { local: e.target.value })}
                    placeholder="Ex.: passarela lado descarga"
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
            + Adicionar registro de estrutura
          </button>
        </div>
      </div>

      {/* Checklist textual para orientar a inspeção */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 text-xs md:text-sm text-slate-600">
        <div className="border rounded-2xl p-3 bg-slate-50/60">
          <h3 className="font-semibold mb-2">Estrutura principal / Contrapeso / Carro tensor</h3>
          <ul className="list-disc ml-4 space-y-1">
            <li>Sapata de sustentação, vigas e longarinas: corrosão, trincas, empeno, amassados.</li>
            <li>Guias do contrapeso: empenadas, fissuras, soltas, corrosão.</li>
            <li>Caixa do contrapeso: corrosão, furos, risco de vazamento.</li>
            <li>Cabos, olhais e roldanas (carro tensor): rompimento de tramas, travamentos, ferrugem.</li>
          </ul>
        </div>

        <div className="border rounded-2xl p-3 bg-slate-50/60">
          <h3 className="font-semibold mb-2">Passarelas, Proteções e Cobertura</h3>
          <ul className="list-disc ml-4 space-y-1">
            <li>Grade de piso, corrimão, rodapé, escadas: soldas quebradas, corrosão, furos, falta de parafusos.</li>
            <li>Proteção do contrapeso e tambor de cauda: acúmulo de material, fixação, trincas, rupturas.</li>
            <li>Cobertura: pontos quebrados/amassados, falta de chapas, vedação lateral e traseira.</li>
            <li>Borrachas/vedações: desgaste, ajuste, garra de fixação travando corretamente.</li>
          </ul>
        </div>
      </div>
    </Section>
  )
})

export default Pagina5Estrutura
