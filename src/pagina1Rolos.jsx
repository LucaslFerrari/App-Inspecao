"use client"

// Pagina1Rolos.jsx (versão integrada com API de domínios e catálogos)
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import Section from "./components/ui/Section"
import ResponsiveHeader from "./components/responsive/ResponsiveHeader"
import ResponsiveModal from "./components/responsive/ResponsiveModal"
import OptionsGrid from "./components/responsive/OptionsGrid"
import { buildMetadataRows, statusFromCritic } from "./lib/exportUtils"

// HOOKS novos
import { useAreas, useCorreias, useBalizas, toOptions, useAutoFillArea } from "./hooks/useDomain"
import { useCatalog } from "./hooks/useCatalog"

// ================== COLUNAS / LAYOUT TABELA ================== //
const COLS = [
  { key: "baliza", label: "BALIZA", width: "w-20" },
  { key: "limp", label: "LIMP.", width: "w-16" },
  { key: "critic", label: "CRITIC.", width: "w-20" },
  // CARGA (E C D)
  { key: "carga_E", label: "ESQUERDA" },
  { key: "carga_C", label: "CENTRAL" },
  { key: "carga_D", label: "DIREITA" },
  // IMPACTO (E C D)
  { key: "impacto_E", label: "ESQUERDA" },
  { key: "impacto_C", label: "CENTRAL" },
  { key: "impacto_D", label: "DIREITA" },
  // RETORNO (RB RP RT)
  { key: "retorno_RB", label: "ROLO DE BORRACHA" },
  { key: "retorno_RP", label: "ROLO PLANO" },
  { key: "retorno_RT", label: "ROLO TENSOR" },
  // VERTICAIS (EC DC ER DR)
  { key: "verticais_EC", label: "ESQUERDA CARGA" },
  { key: "verticais_DC", label: "DIREITA CARGA" },
  { key: "verticais_ER", label: "ESQUERDA RETORNO" },
  { key: "verticais_DR", label: "DIREITA RETORNO" },
  // SUPORTES (CAR AAC RET AAR CAL)
  { key: "suportes_CAR", label: "CARGA" },
  { key: "suportes_AAC", label: "AUTO ALINHADOR CARGA" },
  { key: "suportes_RET", label: "RETORNO" },
  { key: "suportes_AAR", label: "AUTO ALINHADOR RETORNO" },
  { key: "suportes_CAL", label: "CALÇO" },
]

const HEAD_GROUPS = [
  { label: "BALIZA", span: 1 },
  { label: "LIMP.", span: 1 },
  { label: "CRITIC.", span: 1 },
  { label: "CARGA", span: 3 },
  { label: "IMPACTO", span: 3 },
  { label: "RETORNO", span: 3 },
  { label: "VERTICAIS", span: 4 },
  { label: "SUPORTES", span: 5 },
]

const classNames = (...c) => c.filter(Boolean).join(" ")

// ===== Helpers p/ célula ===== //
const getCodes = (cell) => {
  if (Array.isArray(cell)) return cell
  if (cell && Array.isArray(cell.codes)) return cell.codes
  return []
}

const cellText = (rows, b, key) => {
  const v = (rows[b] || {})[key]
  const codes = getCodes(v)

  // multi-select (carga, impacto, etc.)
  if (codes.length) {
    return codes.length === 1 ? codes[0] : `${codes[0]}+${codes.length - 1}`
  }

  // single-select (LIMP / CRITIC) — gravado como string
  if (typeof v === "string") return v || ""

  return ""
}

// chave "neutra" pra quando ainda não tem correia selecionada
const NO_EQUIP_KEY = "__sem_equip__"

const Pagina1Rolos = forwardRef(function Pagina1Rolos({ header, onHeaderChange }, ref) {
  // ================== Cabeçalho ================== //
  const { inspetor, data, equip, area } = header


  // Domínios dinâmicos
  const { data: areas } = useAreas()
  const { data: correias } = useCorreias()

  // Seleções do usuário
   // guarda code da área
   // guarda code da correia

  // Descobre o ID da correia selecionada (para buscar balizas)
  const correiaId = useMemo(() => {
    if (!Array.isArray(correias)) return null
    const found = correias.find((c) => c.code === equip)
    return found?.id ?? null
  }, [correias, equip])

  // Auto-preenche área quando o equipamento é escolhido
  useAutoFillArea({
    correias,
    areas,
    equipCode: equip,
    currentArea: area,
    onChange: (val) => onHeaderChange?.("area", val),
  })

  // Balizas vindas da API para a correia selecionada
  const { data: balizasLista } = useBalizas(correiaId)

  // ================== Estado por equipamento ================== //
  // Estado "visível" na tela (sempre do equip atual)
  const [rows, setRows] = useState({})
  const [manualStart, setManualStart] = useState(1)
  const [manualEnd, setManualEnd] = useState(1)

  // Mapa com o estado de TODAS as correias editadas
  // dadosPorEquip[equipCode] = { rows, manualStart, manualEnd, faixaStart, faixaEnd, faixaLista }
  const [dadosPorEquip, setDadosPorEquip] = useState({})
  const prevEquipKeyRef = useRef(equip || NO_EQUIP_KEY)

  // Faixa de balizas da correia atual (Apenas para o equip selecionado agora)
  const faixa = useMemo(() => {
    const lista =
      Array.isArray(balizasLista) && balizasLista.length
        ? balizasLista
        : Array.from(
            { length: Math.max(0, manualEnd - manualStart + 1) },
            (_, i) => manualStart + i,
          )

    const start = lista.length ? lista[0] : manualStart
    const end = lista.length ? lista[lista.length - 1] : manualEnd
    return { start, end, lista }
  }, [balizasLista, manualStart, manualEnd])

  // Quando muda a correia, salva o estado da anterior e carrega o da nova
  useEffect(() => {
    const prevKey = prevEquipKeyRef.current
    const newKey = equip || NO_EQUIP_KEY

    // salva o estado da correia anterior
    setDadosPorEquip((prev) => {
      const snapshotAnterior = {
        rows,
        manualStart,
        manualEnd,
        faixaStart: faixa.start,
        faixaEnd: faixa.end,
        faixaLista: faixa.lista,
      }

      const atualizado = { ...prev, [prevKey]: snapshotAnterior }
      const salvo = atualizado[newKey]

      // carrega o estado da nova correia (se existir)
      if (salvo) {
        setRows(salvo.rows || {})
        setManualStart(salvo.manualStart ?? 1)
        setManualEnd(salvo.manualEnd ?? 1)
      } else {
        // nova correia ainda sem dados
        setRows({})
        setManualStart(1)
        setManualEnd(1)
      }

      return atualizado
    })

    prevEquipKeyRef.current = newKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equip])

  // ================== Catálogos dinâmicos ================== //
  const { data: catLimp } = useCatalog("limpeza")
  const { data: catCritic } = useCatalog("criticidade")
  const { data: catRolos } = useCatalog("rolos_dano")
  const { data: catSuportes } = useCatalog("suportes_dano")

  const getCatalog = (key) => {
    if (key === "limp") return catLimp || []
    if (key === "critic") return catCritic || []
    if (key.startsWith("suportes_")) return catSuportes || []
    if (
      key.startsWith("carga_") ||
      key.startsWith("impacto_") ||
      key.startsWith("retorno_") ||
      key.startsWith("verticais_")
    ) {
      return catRolos || []
    }
    return []
  }

  // ================== Dados da tabela (correia atual) ================== //
  // Estrutura: rows[baliza] = { colKey: string | { codes:[], photoName?, photoDataUrl? } }

  // Estado do modal de seleção
  const [modal, setModal] = useState(null)
  // modal = { b:number, key:string, selected:Set<string>, photoName?, photoDataUrl? }
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  const handlePhotoFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      setModal((m) =>
        m
          ? {
              ...m,
              photoName: file.name,
              photoDataUrl: reader.result,
            }
          : m,
      )
    reader.readAsDataURL(file)
  }

  const onPhotoInput = (e) => {
    const file = e.target.files?.[0]
    handlePhotoFile(file)
    if (e.target) e.target.value = ""
  }

  const openModal = (b, key) => {
    const cell = (rows[b] || {})[key]
    const atual =
      typeof cell === "string"
        ? cell
          ? new Set([cell])
          : new Set()
        : new Set(getCodes(cell))
    setModal({
      b,
      key,
      selected: atual,
      photoName: cell?.photoName || null,
      photoDataUrl: cell?.photoDataUrl || null,
    })
  }

  const toggleCode = (code) => {
    setModal((m) => {
      if (!m) return m
      // single-select para limp/critic
      if (m.key === "limp" || m.key === "critic") {
        return { ...m, selected: new Set([code]) }
      }
      const sel = new Set(m.selected)
      if (sel.has(code)) sel.delete(code)
      else sel.add(code)
      return { ...m, selected: sel }
    })
  }

  const saveModal = () => {
    if (!modal) return
    const isSingle = modal.key === "limp" || modal.key === "critic"
    const value = Array.from(modal.selected)[0] || ""
    const payload = isSingle
      ? value
      : {
          codes: Array.from(modal.selected),
          photoName: modal.photoName,
          photoDataUrl: modal.photoDataUrl,
        }

    setRows((prev) => ({
      ...prev,
      [modal.b]: { ...(prev[modal.b] || {}), [modal.key]: payload },
    }))
    setModal(null)
  }

  const clearRow = (b) =>
    setRows((prev) => ({
      ...prev,
      [b]: {},
    }))

  const clearAll = () => {
    onHeaderChange("inspetor", "")
    onHeaderChange("data", new Date().toISOString().slice(0, 10))
    onHeaderChange("area", "")
    onHeaderChange("equip", "")
    setManualStart(1)
    setManualEnd(1)
    setRows({})
    setModal(null)
    setDadosPorEquip({})
    prevEquipKeyRef.current = NO_EQUIP_KEY
  }

  // ================== Export helpers (correia atual) ================== //
  const buildSheet = () => {
    const metadata = buildMetadataRows({
      inspetor,
      data,
      equip,
      area,
      extra: [["Faixa", `${faixa.start}-${faixa.end}`]],
    })

    const headerRow = [...COLS.map((c) => c.label), "Status"]

    const dataRows = faixa.lista.map((b) => {
      const current = rows[b] || {}
      const base = COLS.map((c) => {
        if (c.key === "baliza") return b
        const v = current[c.key]
        const codes = getCodes(v)
        if (codes.length) return codes.join(";")
        return typeof v === "string" ? v : ""
      })
      const status = statusFromCritic(current.critic)
      return [...base, status]
    })

    return [...metadata, headerRow, ...dataRows]
  }

  // ================== Evidências (fotos) — correia atual ================== //
  const buildEvidencias = () => {
    const evidencias = []

    faixa.lista.forEach((b) => {
      const row = rows[b] || {}

      COLS.forEach((c) => {
        if (c.key === "baliza" || c.key === "limp" || c.key === "critic") return

        const cell = row[c.key]
        if (!cell) return

        const codes = Array.isArray(cell.codes) ? cell.codes : []
        const dataUrl = cell.photoDataUrl
        const fileName = cell.photoName || null

        if (!dataUrl) return

        evidencias.push({
          pagina: 1,
          secao: "rolos",
          tipo: "celula",
          baliza: b,
          ponto: null,
          letra: null,
          coluna: c.key,
          codes,
          fileName,
          dataUrl,
        })
      })
    })

    return evidencias
  }
  useImperativeHandle(
    ref,
    () => {
      const currentKey = equip || NO_EQUIP_KEY
      const snapshotAtual = {
        rows,
        manualStart,
        manualEnd,
        faixaStart: faixa.start,
        faixaEnd: faixa.end,
        faixaLista: faixa.lista,
      }

      const allData = {
        ...dadosPorEquip,
        [currentKey]: snapshotAtual,
      }

      const multiRolos = Object.entries(allData)
        .filter(
          ([key, st]) =>
            key !== NO_EQUIP_KEY &&
            st &&
            Array.isArray(st.faixaLista) &&
            st.faixaLista.length,
        )
        .map(([equipCode, st]) => ({
          equip: equipCode,
          faixaInicio: st.faixaStart,
          faixaFim: st.faixaEnd,
          rolos: st.faixaLista.map((b) => {
            const r = (st.rows || {})[b] || {}
            return {
              equip: equipCode,
              baliza: b,
              limp: r.limp || "",
              critic: r.critic || "",
              carga_E: r.carga_E?.codes || [],
              carga_C: r.carga_C?.codes || [],
              carga_D: r.carga_D?.codes || [],
              impacto_E: r.impacto_E?.codes || [],
              impacto_C: r.impacto_C?.codes || [],
              impacto_D: r.impacto_D?.codes || [],
              retorno_RB: r.retorno_RB?.codes || [],
              retorno_RP: r.retorno_RP?.codes || [],
              retorno_RT: r.retorno_RT?.codes || [],
              verticais_EC: r.verticais_EC?.codes || [],
              verticais_DC: r.verticais_DC?.codes || [],
              verticais_ER: r.verticais_ER?.codes || [],
              verticais_DR: r.verticais_DR?.codes || [],
              suportes_CAR: r.suportes_CAR?.codes || [],
              suportes_AAC: r.suportes_AAC?.codes || [],
              suportes_RET: r.suportes_RET?.codes || [],
              suportes_AAR: r.suportes_AAR?.codes || [],
              suportes_CAL: r.suportes_CAL?.codes || [],
            }
          }),
        }))

      return {
        getExportSheets: () => [
          { name: "Página 1 - Rolos", data: buildSheet() },
        ],

        getFormData: () => ({
          inspetor,
          data,
          equip,
          area,
          faixaInicio: faixa.start,
          faixaFim: faixa.end,

          // comportamento antigo (apenas a correia atual)
          rolos: faixa.lista.map((b) => {
            const r = rows[b] || {}
            return {
              baliza: b,
              limp: r.limp || "",
              critic: r.critic || "",
              carga_E: r.carga_E?.codes || [],
              carga_C: r.carga_C?.codes || [],
              carga_D: r.carga_D?.codes || [],
              impacto_E: r.impacto_E?.codes || [],
              impacto_C: r.impacto_C?.codes || [],
              impacto_D: r.impacto_D?.codes || [],
              retorno_RB: r.retorno_RB?.codes || [],
              retorno_RP: r.retorno_RP?.codes || [],
              retorno_RT: r.retorno_RT?.codes || [],
              verticais_EC: r.verticais_EC?.codes || [],
              verticais_DC: r.verticais_DC?.codes || [],
              verticais_ER: r.verticais_ER?.codes || [],
              verticais_DR: r.verticais_DR?.codes || [],
              suportes_CAR: r.suportes_CAR?.codes || [],
              suportes_AAC: r.suportes_AAC?.codes || [],
              suportes_RET: r.suportes_RET?.codes || [],
              suportes_AAR: r.suportes_AAR?.codes || [],
              suportes_CAL: r.suportes_CAL?.codes || [],
            }
          }),

          // NOVO: todas as correias editadas
          multiEquipRolos: multiRolos,
        }),

        getEvidencias: buildEvidencias,
        clear: clearAll,
      }
    },
    [inspetor, data, equip, area, faixa, rows, dadosPorEquip],
  )


  useEffect(() => {
    const spanTotal = HEAD_GROUPS.reduce((s, g) => s + g.span, 0)
    if (spanTotal !== COLS.length) {
      console.warn(
        "[Pagina1Rolos] HEAD_GROUPS span != COLS length:",
        {
          spanTotal,
          cols: COLS.length,
        },
      )
    }
  }, [])

  // ================== Header config ================== //
  const headerFields = [
    {
      id: "inspetor",
      label: "Inspetor",
      type: "text",
      value: inspetor,
      placeholder: "NOME",
    },
    {
      id: "data",
      label: "Data",
      type: "date",
      value: data,
    },
    {
      id: "equip",
      label: "Equip",
      type: "select",
      value: equip,
      options: [
        { value: "", label: "" },
        ...toOptions(correias, { valueKey: "code", labelKey: "label" }),
      ],
    },
    {
      id: "area",
      label: "Área",
      type: "select",
      value: area,
      options: [
        { value: "", label: "" },
        ...toOptions(areas, { valueKey: "code", labelKey: "label" }),
      ],
    },
    // Se não houver balizas mapeadas no banco para a correia escolhida, mostra edição manual
    ...(Array.isArray(balizasLista) && balizasLista.length
      ? []
      : [
          {
            id: "manualStart",
            label: "Baliza inicial",
            type: "number",
            value: manualStart,
          },
          {
            id: "manualEnd",
            label: "Baliza final",
            type: "number",
            value: manualEnd,
          },
        ]),
  ]

  const handleHeaderChange = (fieldId, value) => {
    if (fieldId === "inspetor") onHeaderChange("inspetor", value)
    else if (fieldId === "data") onHeaderChange("data", value)
    else if (fieldId === "equip") onHeaderChange("equip", value)
    else if (fieldId === "area") onHeaderChange("area", value)
    else if (fieldId === "manualStart")
      setManualStart(Number.parseInt(value) || 1)
    else if (fieldId === "manualEnd")
      setManualEnd(Number.parseInt(value) || 1)
  }

  const rightContent = (
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span>Código:</span>
        <strong>FM-GTO-057</strong>
      </div>
      <div className="flex justify-between">
        <span>Folha:</span>
        <span>1/5</span>
      </div>
      <div className="flex justify-between">
        <span>Revisão:</span>
        <span>-</span>
      </div>
    </div>
  )

  // ================== RENDER ================== //
  return (
    <Section
      id="rolos"
      title="Rolos"
      description="Página 1 — Inspeção mecânica"
    >
      <ResponsiveHeader
        fields={headerFields}
        onFieldChange={handleHeaderChange}
        rightContent={rightContent}
      />

      <div 
        className="mt-6 table-scroll-container table-scroll-container--rolos"
        ref={(el) => {
          if (el) {
            const headerRow1 = el.querySelector('thead .header-row-1');
            if (headerRow1) {
              const height = headerRow1.offsetHeight;
              el.style.setProperty('--header-row-1-height', `${height}px`);
            }
          }
        }}
      >
        <table className="w-full table-sticky-rolos">
          <thead>
            {/* Linha 1 — grupos de colunas */}
            <tr className="header-row-1 text-center text-sm bg-slate-100">
              {HEAD_GROUPS.map((g, i) => (
                <th
                  key={i}
                  className={[
                    "border-b border-r last:border-r-0 py-2 px-3",
                    i === 0 ? "col-sticky-left" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  colSpan={g.span}
                >
                  {g.label}
                </th>
              ))}

              {/* Cabeçalho "vazio" alinhado com a coluna do botão Limpar */}
              <th className="border-b py-2 px-3 col-sticky-right" />
            </tr>

            {/* Linha 2 — nomes das colunas */}
            <tr className="header-row-2 text-center text-xs bg-slate-50">
              {COLS.map((c, index) => (
                <th
                  key={c.key}
                  className={[
                    "border-b border-r last:border-r-0 py-1 px-2 font-medium",
                    index === 0 ? "col-baliza col-sticky-left text-center" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {c.label}
                </th>
              ))}

              {/* Cabeçalho da coluna de ações (limpar) */}
              <th className="border-b py-1 px-3 col-sticky-right" />
            </tr>
          </thead>

          <tbody>
            {faixa.lista.map((b) => (
              <tr key={b} className="text-sm hover:bg-slate-50">
                {COLS.map((c, index) => {
                  const cell = (rows[b] || {})[c.key]
                  const hasValue =
                    getCodes(cell).length > 0 ||
                    (typeof cell === "string" && cell)

                  // célula da BALIZA (primeira coluna)
                  if (c.key === "baliza") {
                    return (
                      <td
                        key={c.key}
                        className={[
                          "border-r border-b last:border-r-0 px-2 py-2",
                          "col-baliza col-sticky-left font-medium text-center",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {b}
                      </td>
                    )
                  }

                  // demais colunas
                  return (
                    <td
                      key={c.key}
                      className="border-r border-b last:border-r-0 px-2 py-2 text-center"
                    >
                      <button
                        type="button"
                        onClick={() => openModal(b, c.key)}
                        title="Clique para selecionar"
                        className={[
                          "mx-auto block w-16 h-8 rounded border text-xs font-medium",
                          "flex items-center justify-center",
                          hasValue ? "bg-slate-100" : "bg-white",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {cellText(rows, b, c.key)}
                      </button>
                    </td>
                  )
                })}

                {/* Coluna do botão LIMPAR (fixa na direita) */}
                <td className={[
                          "border-r border-b last:border-r-0 px-2 py-2",
                          "col-baliza col-sticky-right font-medium text-center",
                        ]}>
                  <button
                    type="button"
                    className="table-button text-xs"
                    onClick={() => clearRow(b)}
                  >
                    Limpar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de seleção (usa catálogos dinâmicos) */}
      <ResponsiveModal
        title={
          modal
            ? `Selecionar — ${modal.key
                .replace(/_/g, " → ")
                .toUpperCase()} • Baliza ${modal.b}`
            : ""
        }
        isOpen={Boolean(modal)}
        onClose={() => setModal(null)}
        footer={[
          <button
            key="c"
            type="button"
            className="px-3 py-2 border rounded-2xl"
            onClick={() => setModal(null)}
          >
            Cancelar
          </button>,
          <button
            key="s"
            type="button"
            className="px-4 py-2 bg-primary text-white rounded-2xl"
            onClick={saveModal}
          >
            Salvar
          </button>,
        ]}
      >
        {modal && (
          <div className="space-y-4">
            <OptionsGrid
              options={getCatalog(modal.key)}
              selected={modal.selected}
              onToggle={toggleCode}
            />

            {/* Evidência fotográfica opcional */}
            <div className="pt-2 space-y-2">
              <p className="text-sm text-slate-600 mb-2">
                Evidência fotográfica (opcional)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-2 border rounded-2xl text-sm"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  Usar câmera
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border rounded-2xl text-sm"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  Escolher da galeria
                </button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={onPhotoInput}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPhotoInput}
              />
              {modal.photoName && (
                <p className="text-xs text-slate-500">Arquivo: {modal.photoName}</p>
              )}
              {modal.photoDataUrl && (
                <img
                  src={modal.photoDataUrl || "/placeholder.svg"}
                  alt="evidência"
                  className="mt-2 max-h-40 rounded border"
                />
              )}
            </div>

            <div className="text-xs text-slate-600">
              Selecionados:{" "}
              {Array.from(modal.selected).join(", ") || "nenhum"}
            </div>
          </div>
        )}
      </ResponsiveModal>
    </Section>
  )
})

export default Pagina1Rolos
