"use client"

// Pagina3Correia.jsx (versão integrada com domínios + catálogos, alinhada com Página 1)
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import Section from "./components/ui/Section"
import ResponsiveHeader from "./components/responsive/ResponsiveHeader"
import ResponsiveModal from "./components/responsive/ResponsiveModal"
import OptionsGrid from "./components/responsive/OptionsGrid"
import { buildMetadataRows, statusFromCritic } from "./lib/exportUtils"

// HOOKS de domínios + catálogos
import { useAreas, useCorreias, useBalizas, toOptions, useAutoFillArea } from "./hooks/useDomain"
import { useCatalog, useCatalogBatch } from "./hooks/useCatalog"

/* ===================== UTILS ===================== */
const YESNO = ["Não", "Sim"]
const cx = (...c) => c.filter(Boolean).join(" ")
const toRange = (s, e) => Array.from({ length: e - s + 1 }, (_, i) => s + i)
// NOVO – chave para quando não tiver correia selecionada
const NO_EQUIP_KEY = "__SEM_EQUIP__"

/* ===================== COMPONENTES AUXILIARES ===================== */
function PhotoPicker({ value, onChange }) {
  const cameraInputRef = useRef(null)
  const galleryInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    const r = new FileReader()
    r.onload = () => onChange({ name: file.name, dataUrl: r.result })
    r.readAsDataURL(file)
  }

  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    handleFile(file)
    if (e.target) e.target.value = ""
  }

  return (
    <div className="mt-1 space-y-2">
      <p className="text-sm text-slate-600 mb-2">Evid�ncia fotogr�fica (opcional)</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="px-3 py-2 border rounded-2xl text-sm"
          onClick={() => cameraInputRef.current?.click()}
        >
          Usar c�mera
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
        onChange={onInputChange}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />
      {value?.name && (
        <p className="text-xs text-slate-500">Arquivo: {value.name}</p>
      )}
      {value?.dataUrl && (
        <img
          src={value.dataUrl || "/placeholder.svg"}
          alt="evid�ncia"
          className="mt-2 max-h-40 border rounded"
        />
      )}
    </div>
  )
}


function CellSelector({ label, value, onChange, catalog, withPhoto = false }) {
  const [open, setOpen] = useState(false)
  const [draftSel, setDraftSel] = useState(new Set(value?.codes || []))
  const [draftPhoto, setDraftPhoto] = useState(value?.photo || null)

  const display = !value?.codes?.length
    ? ""
    : value.codes.length === 1
      ? value.codes[0]
      : `${value.codes[0]}+${value.codes.length - 1}`

  return (
    <>
      <button
        type="button"
        className={cx(
          "px-3 py-2 border text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-full w-full rounded-2xl",
          value?.codes?.length ? "bg-slate-100" : "bg-white",
        )}
        onClick={() => {
          setDraftSel(new Set(value?.codes || []))
          setDraftPhoto(value?.photo || null)
          setOpen(true)
        }}
      >
        {display}
      </button>

      {open && (
        <ResponsiveModal
          isOpen={open}
          title={`Selecionar — ${label}`}
          onClose={() => setOpen(false)}
          footer={[
            <button
              key="c"
              type="button"
              className="px-3 py-2 border rounded-2xl"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>,
            <button
              key="s"
              type="button"
              className="px-4 py-2 bg-primary text-white rounded-2xl"
              onClick={() => {
                onChange({ codes: Array.from(draftSel), photo: draftPhoto })
                setOpen(false)
              }}
            >
              Salvar
            </button>,
          ]}
        >
          <div className="space-y-4">
            <OptionsGrid
              options={catalog || []}
              selected={draftSel}
              onToggle={(c) => {
                const s = new Set(draftSel)
                s.has(c) ? s.delete(c) : s.add(c)
                setDraftSel(s)
              }}
            />
            {withPhoto && <PhotoPicker value={draftPhoto} onChange={setDraftPhoto} />}
            <div className="text-xs text-slate-600">
              Selecionados: {Array.from(draftSel).join(", ") || "nenhum"}
            </div>
          </div>
        </ResponsiveModal>
      )}
    </>
  )
}

function SingleSelector({ label, value, onChange, options = [], cols = 3 }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value || "")

  const normalizeOptions = options.map((op) =>
    typeof op === "string" ? { code: op, label: op } : op,
  )

  const currentLabel =
    normalizeOptions.find((op) => op.code === value)?.label || value || ""

  return (
    <>
      <button
        type="button"
        className={cx(
          "px-3 py-2 border text-xs whitespace-nowrap overflow-hidden text-ellipsis max-w-full w-full rounded-2xl",
          value ? "bg-slate-100" : "bg-white",
        )}
        onClick={() => {
          setDraft(value || "")
          setOpen(true)
        }}
      >
        {currentLabel}
      </button>

      {open && (
        <ResponsiveModal
          isOpen={open}
          title={`Selecionar — ${label}`}
          onClose={() => setOpen(false)}
          footer={[
            <button
              key="c"
              type="button"
              className="px-3 py-2 border rounded-2xl"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>,
            <button
              key="s"
              type="button"
              className="px-4 py-2 bg-primary text-white rounded-2xl"
              onClick={() => {
                onChange(draft)
                setOpen(false)
              }}
            >
              Salvar
            </button>,
          ]}
        >
          <OptionsGrid
            options={normalizeOptions}
            selected={new Set([draft])}
            onToggle={(c) => setDraft(c)}
            cols={cols}
          />
        </ResponsiveModal>
      )}
    </>
  )
}

function EmendaSelector({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const v = value || {}

  const resumo = v?.isEmenda
    ? [
        v.tipo || "",
        v.cond || "",
        v.desal === "Sim" ? "Desal." : "",
        Number.isFinite(Number(v.grampos)) ? `G:${v.grampos}` : "",
      ]
        .filter(Boolean)
        .join(" / ")
    : ""

  return (
    <>
      <button
        type="button"
        className={cx(
          "px-3 py-2 border text-xs w-full",
          "whitespace-nowrap overflow-hidden text-ellipsis",
          "rounded-2xl",
          v?.isEmenda ? "bg-slate-100" : "bg-white",
        )}
        onClick={() => setOpen(true)}
      >
        {v?.isEmenda ? resumo : ""}
      </button>

      {open && (
        <ResponsiveModal
          isOpen={open}
          title="Emenda — Detalhes"
          onClose={() => setOpen(false)}
          footer={[
            <button
              key="c"
              type="button"
              className="px-3 py-2 border rounded-2xl"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>,
            <button
              key="s"
              type="button"
              className="px-4 py-2 bg-primary text-white rounded-2xl"
              onClick={() => setOpen(false)}
            >
              Salvar
            </button>,
          ]}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="col-span-full">
              <label className="mr-3">É emenda?</label>
              <button
                type="button"
                className={cx(
                  "px-3 py-1 border mr-2 rounded-2xl",
                  v.isEmenda ? "bg-primary text-white border-primary" : "bg-white",
                )}
                onClick={() => onChange({ ...v, isEmenda: true })}
              >
                Sim
              </button>
              <button
                type="button"
                className={cx(
                  "px-3 py-1 border rounded-2xl",
                  v.isEmenda === false ? "bg-primary text-white border-primary" : "bg-white",
                )}
                onClick={() =>
                  onChange({ isEmenda: false, tipo: "", cond: "", grampos: "", desal: "Não" })
                }
              >
                Não
              </button>
            </div>

            {v.isEmenda && (
              <>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Tipo</div>
                  <SingleSelector
                    label="Tipo emenda"
                    value={v.tipo}
                    onChange={(val) => onChange({ ...v, tipo: val })}
                    options={["Quente", "Mecânica"]}
                    cols={2}
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Condição</div>
                  <SingleSelector
                    label="Condição"
                    value={v.cond}
                    onChange={(val) => onChange({ ...v, cond: val })}
                    options={["OK", "Danificada", "Vazada"]}
                    cols={3}
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Grampos faltando (qtd)</div>
                  <input
                    type="number"
                    min={0}
                    className="w-full border px-2 py-2 text-sm rounded"
                    value={v.grampos ?? ""}
                    onChange={(e) =>
                      onChange({ ...v, grampos: Number(e.target.value || 0) })
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <div className="text-xs text-slate-600 mb-1">Desalinhada?</div>
                  <SingleSelector
                    label="Desalinho"
                    value={v.desal}
                    onChange={(val) => onChange({ ...v, desal: val })}
                    options={YESNO}
                    cols={2}
                  />
                </div>
              </>
            )}
          </div>
        </ResponsiveModal>
      )}
    </>
  )
}

function LegendBox({ title, value, onChange }) {
  const hasImg = Boolean(value?.dataUrl)
  return (
    <div className="card p-4 rounded-2xl border shadow-soft mb-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <div className="flex gap-2">
          <label className="text-xs px-3 py-1 border cursor-pointer rounded">
            {hasImg ? "Trocar imagem" : "Carregar imagem"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const r = new FileReader()
                r.onload = () => onChange({ dataUrl: r.result })
                r.readAsDataURL(f)
              }}
            />
          </label>
          {hasImg && (
            <button
              type="button"
              className="text-xs px-3 py-1 border rounded"
              onClick={() => onChange({ dataUrl: "" })}
            >
              Remover
            </button>
          )}
        </div>
      </div>
      {hasImg ? (
        <div className="flex justify-center">
          <img
            src={value.dataUrl || "/placeholder.svg"}
            alt={`Legenda ${title}`}
            className="max-h-64 border rounded"
          />
        </div>
      ) : (
        <div className="text-xs text-slate-500 border border-dashed p-3 text-center rounded">
          Nenhuma imagem carregada para {title}. Use o botão acima para selecionar o arquivo (PNG/JPG).
        </div>
      )}
    </div>
  )
}

/* ===================== PÁGINA 3 ===================== */
const Pagina3Correia = forwardRef(function Pagina3Correia(
  { header, onHeaderChange },
  ref,
) {
  // Cabeçalho
  const { inspetor, data, equip, area } = header
  const lastEquipRef = useRef(equip || NO_EQUIP_KEY)
  // NOVO - guarda o estado da página 3 por correia
  const [dadosPorEquip, setDadosPorEquip] = useState({})
  // Domínios
  const { data: areas } = useAreas()
  const { data: correias } = useCorreias()

  useAutoFillArea({
    correias,
    areas,
    equipCode: equip,
    currentArea: area,
    onChange: (val) => onHeaderChange?.("area", val),
  })

  // Correia selecionada -> id pra buscar balizas
  const selectedCorreia = useMemo(
    () => correias?.find((c) => c.code === equip) || null,
    [correias, equip],
  )
  const { data: balizasApi } = useBalizas(selectedCorreia?.id)

  // Faixa de balizas: se backend devolver, usa. Senão, usa manual (mesmo padrão da Página 1)
  const [manualStart, setManualStart] = useState(1)
  const [manualEnd, setManualEnd] = useState(1)

  const faixa = useMemo(() => {
    if (balizasApi && balizasApi.length) {
      const sorted = [...balizasApi].sort((a, b) => a - b)
      return {
        start: sorted[0],
        end: sorted[sorted.length - 1],
        lista: sorted,
      }
    }
    const s = manualStart
    const e = manualEnd
    return {
      start: s,
      end: e,
      lista: toRange(s, e),
    }
  }, [balizasApi, manualStart, manualEnd])

  // Dados por baliza
  const [rows, setRows] = useState({})
  const setRow = (b, patch) =>
    setRows((p) => ({
      ...p,
      [b]: { ...(p[b] || {}), ...patch },
    }))
  const clearRow = (b) => setRows((p) => ({ ...p, [b]: {} }))

  const [legendCorreia, setLegendCorreia] = useState({})

  // Catálogos dinâmicos
  const { data: catCritic } = useCatalog("criticidade")
  const { data: cats } = useCatalogBatch(["correia_dano", "correia_servico"])

  const clearAll = () => {
    onHeaderChange("inspetor", "")
    onHeaderChange("data", new Date().toISOString().slice(0, 10))
    onHeaderChange("area", "")
    onHeaderChange("equip", "")
    setLegendCorreia({})
    setRows({})
    setManualStart(1)
    setManualEnd(1)
    setDadosPorEquip({})
  }

  const formatCodes = (cell) => (cell?.codes || []).join(";")

  // NOVO – reutilizável para a correia atual e para as outras correias salvas
  const buildCorreiasData = (faixaLocal, rowsLocal) =>
    (faixaLocal.lista || []).map((b) => {
      const r = (rowsLocal || {})[b] || {}
      const em = r.emenda || {}
      return {
        baliza: b,
        tramo: r.tramo || "",
        lado: r.lado || "",
        tipo: r.tipo || "",
        dano: r.dano?.codes || [],
        servico: r.servico?.codes || [],
        critic: r.critic || "",
        limpeza: r.limpeza || "",
        andaime: r.andaime || "",
        eh_emenda: Boolean(em.isEmenda),
        tipo_emenda: em.isEmenda ? em.tipo || "" : "",
        cond_emenda: em.isEmenda ? em.cond || "" : "",
        grampos_faltando: em.isEmenda ? Number(em.grampos || 0) : 0,
        desalinhada: em.isEmenda ? em.desal || "Não" : "",
        obs: r.obs || "",
      }
    })

  const buildSheet = () => {
    const metadata = buildMetadataRows({
      inspetor,
      data,
      equip,
      area,
      extra: [["Faixa", `${faixa.start}-${faixa.end}`]],
    })

    const header = [
      "Baliza",
      "Tramo",
      "Lado",
      "Tipo",
      "Dano",
      "Serviço",
      "Critic.",
      "Limpeza",
      "Andaime",
      "É emenda?",
      "Tipo emenda",
      "Cond. emenda",
      "Grampos falt.",
      "Desal. emenda",
      "Obs.",
      "Status",
    ]

    const dataRows = faixa.lista.map((b) => {
      const r = rows[b] || {}
      const em = r.emenda || {}
      return [
        b,
        r.tramo || "",
        r.lado || "",
        r.tipo || "",
        formatCodes(r.dano),
        formatCodes(r.servico),
        r.critic || "",
        r.limpeza || "",
        r.andaime || "",
        em.isEmenda ? "Sim" : "Não",
        em.isEmenda ? em.tipo || "" : "",
        em.isEmenda ? em.cond || "" : "",
        em.isEmenda ? em.grampos || "" : "",
        em.isEmenda ? (em.desal === "Sim" ? "Sim" : "Não") : "",
        r.obs || "",
        statusFromCritic(r.critic),
      ]
    })

    return [...metadata, header, ...dataRows]
  }
    // ===================== Evidências (fotos) ===================== //
  const buildEvidencias = () => {
    const evidencias = []

    // 1) DANO por baliza
    faixa.lista.forEach((b) => {
      const r = rows[b] || {}
      const cell = r.dano
      const photo = cell?.photo
      const codes = cell?.codes || []

      if (photo?.dataUrl) {
        evidencias.push({
          pagina: 3,
          secao: "correia",
          tipo: "celula",
          baliza: b,
          ponto: null,
          letra: null,
          coluna: "dano",
          codes,
          fileName: photo.name || null,
          dataUrl: photo.dataUrl,
        })
      }
    })

    // 2) Legenda da correia (opcional)
    if (legendCorreia?.dataUrl) {
      evidencias.push({
        pagina: 3,
        secao: "legenda_correia",
        tipo: "legenda",
        baliza: null,
        ponto: null,
        letra: null,
        coluna: null,
        codes: [],
        fileName: null,
        dataUrl: legendCorreia.dataUrl,
      })
    }

    return evidencias
  }

  useImperativeHandle(
    ref,
    () => {
      // correias da correia ATUAL (como já era)
      const correiasAtual = buildCorreiasData(faixa, rows)

      // NOVO – snapshot da correia atual
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

      // NOVO – monta multiEquipCorreias com TODAS as correias editadas
      const multiEquipCorreias = Object.entries(allData)
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
          correias: buildCorreiasData(
            {
              start: st.faixaStart,
              end: st.faixaEnd,
              lista: st.faixaLista,
            },
            st.rows || {},
          ),
        }))

      return {
        clear: clearAll,
        getFormData: () => ({
          inspetor,
          data,
          equip,
          area,
          faixaInicio: faixa.start,
          faixaFim: faixa.end,

          // formato antigo – apenas a correia atualmente selecionada
          correias: correiasAtual,

          // NOVO – todas as correias editadas
          multiEquipCorreias,
        }),
        getExportSheets: () => [
          { name: "Página 3 - Correia", data: buildSheet() },
        ],
        getEvidencias: buildEvidencias,
      }
    },
    [
      faixa,
      rows,
      inspetor,
      data,
      equip,
      area,
      legendCorreia,
      manualStart,
      manualEnd,
      dadosPorEquip,
    ],
  )



  useEffect(() => {
    console.assert(
      Number.isInteger(faixa.start) && Number.isInteger(faixa.end) && faixa.end >= faixa.start,
      "Faixa inválida",
    )
  }, [faixa])

  // sincroniza quando o equipamento muda fora desta página
  useEffect(() => {
    const currentKey = lastEquipRef.current || NO_EQUIP_KEY
    const nextKey = equip || NO_EQUIP_KEY
    if (nextKey === currentKey) return

    setDadosPorEquip(prev => {
      const novoMapa = {
        ...prev,
        [currentKey]: {
          rows,
          manualStart,
          manualEnd,
          faixaStart: faixa.start,
          faixaEnd: faixa.end,
          faixaLista: faixa.lista,
          legendCorreia,
        },
      }

      const snap = novoMapa[nextKey]

      if (snap) {
        setRows(snap.rows || {})
        setManualStart(snap.manualStart ?? 1)
        setManualEnd(snap.manualEnd ?? 1)
        setLegendCorreia(snap.legendCorreia || {})
      } else {
        setRows({})
        setManualStart(1)
        setManualEnd(1)
        setLegendCorreia({})
      }

      return novoMapa
    })

    lastEquipRef.current = nextKey
  }, [equip, rows, manualStart, manualEnd, faixa])

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
      options: [{ value: "", label: "" }, ...toOptions(correias, { valueKey: "code", labelKey: "label" })],
    },
    {
      id: "area",
      label: "Área",
      type: "select",
      value: area,
      options: [{ value: "", label: "" }, ...toOptions(areas, { valueKey: "code", labelKey: "label" })],
    },
    // Mesma lógica da Página 1: se não houver balizas mapeadas no banco,
    // mostramos os campos de faixa manual no cabeçalho
    ...(Array.isArray(balizasApi) && balizasApi.length
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
    else if (fieldId === "equip") {
      onHeaderChange("equip", value)
    }

    else if (fieldId === "area") onHeaderChange("area", value)
    else if (fieldId === "manualStart") setManualStart(Number.parseInt(value) || 1)
    else if (fieldId === "manualEnd") setManualEnd(Number.parseInt(value) || 1)
  }


  const rightContent = (
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span>Código:</span>
        <strong>FM-GTO-057</strong>
      </div>
      <div className="flex justify-between">
        <span>Folha:</span>
        <span>3/5</span>
      </div>
      <div className="flex justify-between">
        <span>Revisão:</span>
        <span>-</span>
      </div>
    </div>
  )

  return (
    <Section id="correia" title="Correia" description="Página 3 — Inspeção mecânica">
      <ResponsiveHeader
        fields={headerFields}
        onFieldChange={handleHeaderChange}
        rightContent={rightContent}
      />

      <Section id="p3_legenda" title="Legenda — Correia" className="mt-6">
        <LegendBox title="Legenda — Correia" value={legendCorreia} onChange={setLegendCorreia} />
      </Section>

      <Section id="p3_tabela" title="Registro por baliza" className="mt-6">
        <div className="table-scroll-container table-scroll-container--p3">
          <table className="w-full">
            <thead className="bg-slate-100">
              <tr className="text-center text-sm">
                {[
                  "BALIZA",
                  "TRAMO",
                  "LADO",
                  "TIPO",
                  "DANO",
                  "SERVIÇO",
                  "CRITIC.",
                  "LIMPEZA",
                  "ANDAIME",
                  "EMENDA",
                  "OBS.",
                  "",
                ].map((h) => (
                  <th
                    key={h}
                    className="border-b border-r last:border-r-0 py-3 px-3 font-semibold text-slate-700 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {faixa.lista.map((b, idx) => {
                const r = rows[b] || {}
                const zebra = idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                return (
                  <tr key={b} className={cx("text-sm hover:bg-slate-50", zebra)}>
                    {/* BALIZA */}
                    <td className="border-r border-b px-3 py-3 text-center font-medium align-middle whitespace-nowrap">
                      {b}
                    </td>

                    {/* TRAMO */}
                    <td className="border-r border-b px-3 py-3 text-center align-middle">
                      <SingleSelector
                        label="TRAMO"
                        value={r.tramo}
                        onChange={(v) => setRow(b, { tramo: v })}
                        options={["Carga (Topo)", "Retorno (Inferior)"]}
                      />
                    </td>

                    {/* LADO */}
                    <td className="border-r border-b px-3 py-3 text-center align-middle">
                      <SingleSelector
                        label="LADO"
                        value={r.lado}
                        onChange={(v) => setRow(b, { lado: v })}
                        options={["E", "C", "D"]}
                        cols={3}
                      />
                    </td>

                    {/* TIPO */}
                    <td className="border-r border-b px-3 py-3 text-center align-middle">
                      <SingleSelector
                        label="TIPO"
                        value={r.tipo}
                        onChange={(v) => setRow(b, { tipo: v })}
                        options={["Lisa", "Chevron", "Corrugada"]}
                      />
                    </td>

                    {/* DANO */}
                    <td className="border-r border-b px-3 py-3 align-middle">
                      <CellSelector
                        label="DANO"
                        value={r.dano}
                        onChange={(v) => setRow(b, { dano: v })}
                        catalog={cats?.correia_dano || []}
                        withPhoto
                      />
                    </td>

                    {/* SERVIÇO */}
                    <td className="border-r border-b px-3 py-3 align-middle">
                      <CellSelector
                        label="SERVIÇO"
                        value={r.servico}
                        onChange={(v) => setRow(b, { servico: v })}
                        catalog={cats?.correia_servico || []}
                      />
                    </td>

                    {/* CRITIC. */}
                    <td className="border-r border-b px-3 py-3 text-center align-middle">
                      <SingleSelector
                        label="CRITIC."
                        value={r.critic}
                        onChange={(v) => setRow(b, { critic: v })}
                        options={catCritic || []}
                      />
                    </td>

                    {/* LIMPEZA */}
                    <td className="border-r border-b px-3 py-3 text-center align-middle">
                      <SingleSelector
                        label="LIMPEZA"
                        value={r.limpeza}
                        onChange={(v) => setRow(b, { limpeza: v })}
                        options={YESNO}
                        cols={2}
                      />
                    </td>

                    {/* ANDAIME */}
                    <td className="border-r border-b px-3 py-3 text-center align-middle">
                      <SingleSelector
                        label="ANDAIME"
                        value={r.andaime}
                        onChange={(v) => setRow(b, { andaime: v })}
                        options={YESNO}
                        cols={2}
                      />
                    </td>

                    {/* EMENDA */}
                    <td className="border-r border-b px-3 py-3 text-center align-middle">
                      <EmendaSelector value={r.emenda} onChange={(v) => setRow(b, { emenda: v })} />
                    </td>

                    {/* OBS. */}
                    <td className="border-r border-b px-3 py-3 align-middle">
                      <input
                        className="table-input w-full"
                        value={r.obs || ""}
                        onChange={(e) => setRow(b, { obs: e.target.value })}
                        placeholder="Observações"
                      />
                    </td>

                    {/* AÇÕES */}
                    <td className="border-b px-3 py-3 text-right align-middle">
                      <button
                        type="button"
                        className="table-button text-xs"
                        onClick={() => clearRow(b)}
                      >
                        Limpar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Section>
    </Section>
  )
})

export default Pagina3Correia
