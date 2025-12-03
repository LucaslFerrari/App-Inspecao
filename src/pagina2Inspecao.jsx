"use client"

// Pagina2Inspecao.jsx (versão integrada com API de domínios e catálogos)
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from "react"
import Section from "./components/ui/Section"
import Collapse from "./components/ui/Collapse"
import ResponsiveHeader from "./components/responsive/ResponsiveHeader"
import ResponsiveModal from "./components/responsive/ResponsiveModal"
import OptionsGrid from "./components/responsive/OptionsGrid"
import MatrixGrid from "./components/responsive/MatrixGrid"
import { buildMetadataRows, statusFromCritic } from "./lib/exportUtils"
import { safeId } from "./lib/safeId"
// HOOKS novos
import { useAreas, useCorreias, useModelosMesa, toOptions as toDomOptions, useAutoFillArea } from "./hooks/useDomain"
import { useCatalog, useCatalogBatch } from "./hooks/useCatalog"

const rounded = "rounded-2xl"
const cx = (...c) => c.filter(Boolean).join(" ")

/* ===================== COMPONENTES REUTILIZÁVEIS (inalterados visualmente) ===================== */
function Label({ children }) {
  return <div className="col-span-2 flex items-center justify-end pr-2 text-slate-600 text-sm">{children}</div>
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="font-semibold">{title}</h3>
          <button onClick={onClose} className="modal-close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">{footer}</div>
      </div>
    </div>
  )
}

function OptionGrid({ options, selected, onToggle, cols = 4 }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {options.map((op) => {
        const code = typeof op === "string" ? op : op.code
        const label = typeof op === "string" ? op : `${op.code} — ${op.label}`
        const active = selected.has(code)
        return (
          <button
            key={code}
            onClick={() => onToggle(code)}
            className={cx(
              "px-3 py-2 border text-sm",
              rounded,
              active ? "bg-primary text-white border-primary" : "bg-white",
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

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
    <div className="mt-3 space-y-2">
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
        <img src={value.dataUrl || "/placeholder.svg"} alt="evid�ncia" className="mt-2 max-h-40 border rounded" />
      )}
    </div>
  )
}

function Posicoes({ value, onChange, labels = ["E1", "E2", "E3", "E4"] }) {
  const set = new Set(value || [])
  const toggle = (k) => {
    set.has(k) ? set.delete(k) : set.add(k)
    onChange(Array.from(set))
  }
  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((k) => {
        const active = set.has(k)
        return (
          <button
            key={k}
            className={cx(
              "px-2.5 py-1.5 border rounded-2xl text-sm transition",
              active ? "bg-primary text-white border-primary" : "bg-white border-slate-200",
            )}
            onClick={() => toggle(k)}
          >
            {k}
          </button>
        )
      })}
    </div>
  )
}

function CellSelector({ label, value, onChange, catalog, withPhoto = false, width = "w-full" }) {
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
        className={cx(
          "px-3 py-2 border text-xs whitespace-nowrap overflow-hidden text-ellipsis",
          width,
          "rounded-2xl",
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
            [
              <button key="c" className="px-3 py-2 border rounded-2xl" onClick={() => setOpen(false)}>
                Cancelar
              </button>,
              <button
                key="s"
                className="px-4 py-2 bg-primary text-white rounded-2xl"
                onClick={() => {
                  onChange({ codes: Array.from(draftSel), photo: draftPhoto })
                  setOpen(false)
                }}
              >
                Salvar
              </button>,
            ],
          ]}
        >
          <div className="space-y-4">
            <OptionsGrid
              options={catalog}
              selected={draftSel}
              onToggle={(c) => {
                const s = new Set(draftSel)
                s.has(c) ? s.delete(c) : s.add(c)
                setDraftSel(s)
              }}
            />
            {withPhoto && <PhotoPicker value={draftPhoto} onChange={setDraftPhoto} />}
            <div className="text-xs text-slate-600">Selecionados: {Array.from(draftSel).join(", ") || "nenhum"}</div>
          </div>
        </ResponsiveModal>
      )}
    </>
  )
}

function SingleSelector({ label, value, onChange, options = [], cols = 4, width = "w-full" }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value || "")
  const display = value || ""
  return (
    <>
      <button
        className={cx(
          "px-3 py-2 border text-xs whitespace-nowrap overflow-hidden text-ellipsis",
          width,
          "rounded-2xl",
          display ? "bg-slate-100" : "bg-white",
        )}
        onClick={() => {
          setDraft(value || "")
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
            [
              <button key="c" className="px-3 py-2 border rounded-2xl" onClick={() => setOpen(false)}>
                Cancelar
              </button>,
              <button
                key="s"
                className="px-4 py-2 bg-primary text-white rounded-2xl"
                onClick={() => {
                  onChange(draft)
                  setOpen(false)
                }}
              >
                Salvar
              </button>,
            ],
          ]}
        >
          <OptionsGrid
            options={options.length ? options : []}
            selected={new Set([draft])}
            onToggle={(c) => setDraft(c)}
            cols={cols}
          />
        </ResponsiveModal>
      )}
    </>
  )
}
/* ===================== HELPERS — Agrupamento Calhas ===================== */
// guarda um array de colunas por letra: { A: ["1","2"], B: ["3"], ... }
// recebe o estado atual e devolve um novo estado
// stateObj = { A: ["1","2"], B: ["3"], ... }
const toggleGrouped = (stateObj, label) => {
  const letter = label[0]    // "A"
  const col = label.slice(1) // "1"

  const prevCols = stateObj[letter] || []
  let nextCols

  if (prevCols.includes(col)) {
    // desmarca
    nextCols = prevCols.filter((c) => c !== col)
  } else {
    // marca
    nextCols = [...prevCols, col]
  }

  const next = { ...stateObj }
  if (nextCols.length === 0) {
    delete next[letter]
  } else {
    next[letter] = nextCols
  }

  return next
}

const isActiveGrouped = (stateObj, label) => {
  const letter = label[0]
  const col = label.slice(1)
  return (stateObj[letter] || []).includes(col)
}

const activeLetters = (selObj) =>
  ["A", "B", "C", "D", "E"].filter(
    (L) => (selObj[L] || []).length > 0,
  )

const pointsOf = (selObj, L) =>
  (selObj[L] || [])
    .slice()
    .sort()
    .map((c) => `${L}${c}`)
    .join(", ")

    // NOVO – chave usada quando não tiver equip selecionado
const NO_EQUIP_KEY = "__SEM_EQUIP__"

// NOVO – factory para o estado inicial dos pontos de transferência
const makeInitialPtsCalha = () => [
  {
    id: safeId(),
    numero: 1,
    sel: {},
    calhas: {},
  },
]

/* ===================== PÁGINA 2 ===================== */
const Pagina2Inspecao = forwardRef(function Pagina2Inspecao({ header, onHeaderChange, mostrarPT2 }, ref) {
  // Cabeçalho
  const { inspetor, data, equip, area } = header

  // Domínios
  const { data: areas } = useAreas()
  const { data: correias } = useCorreias()
  const { data: modelosMesaDom } = useModelosMesa()

  const [dadosPorEquip, setDadosPorEquip] = useState({})

  // Matriz de seleção A1–E4 (5 linhas x 4 colunas)
  const matrixLabels = useMemo(() => {
    const rows = ["A", "B", "C", "D", "E"] // 5 linhas
    const cols = [1, 2, 3, 4]             // 4 colunas
    return rows.flatMap((r) => cols.map((c) => `${r}${c}`))
  }, [])

  // Lista de pontos de transferência de calhas
  const [ptsCalha, setPtsCalha] = useState([
    {
      id: safeId(),
      numero: 1,       // Ponto de transferência 1
      sel: {},         // seleção A1..E4 -> { A: Set([...]), B: Set([...]) }
      calhas: {},      // dados da tabela por letra -> { A: { item, dano, ... } }
    },
  ])


  // Outras seções tabela
  const [vedacaoRows, setVedacaoRows] = useState([])
  const [raspRows, setRaspRows] = useState([])
  const [mesasRows, setMesasRows] = useState([])

  // Legendas
  const legendStaticBase = "/legendas"

  // Auto-preenche área quando selecionar equipamento
  useAutoFillArea({
    correias,
    areas,
    equipCode: header?.equip,
    currentArea: header?.area,
    onChange: (val) => onHeaderChange?.("area", val),
  })

  // Catálogos carregados do backend
  const { data: catCritic } = useCatalog("criticidade")
  const { data: catLimp } = useCatalog("limpeza")

  const { data: cats } = useCatalogBatch([
    "calhas_item",
    "calhas_dano",
    "calhas_servico",
    "vedacao_item",
    "vedacao_dano",
    "vedacao_servico",
    "rasp_item",
    "rasp_dano",
    "rasp_servico",
    "mesas_item",
    "mesas_dano",
    "mesas_servico",
  ])
  const formatCodes = (cell) => (cell?.codes || []).join(";")
  function addPontoTransferencia() {
    setPtsCalha((prev) => {
      const maxNumero = prev.length ? Math.max(...prev.map((p) => p.numero)) : 0
      const novoNumero = maxNumero + 1

      return [
        ...prev,
        {
          id: safeId(),
          numero: novoNumero,
          sel: {},
          calhas: {},
        },
      ]
    })
  }

  function removePontoTransferencia(id) {
    setPtsCalha((prev) => (prev.length <= 1 ? prev : prev.filter((p) => p.id !== id)))
  }

  // alterna A1, A2, B3... para um PT específico
  function togglePt(id, label) {
    setPtsCalha((prev) =>
      prev.map((pt) =>
        pt.id !== id
          ? pt
          : {
              ...pt,
              sel: toggleGrouped(pt.sel || {}, label),
            },
      ),
    )
  }


  // atualiza uma linha (letra) da tabela de um PT específico
  function updateCalhaRow(ptId, letra, patch) {
    setPtsCalha((prev) =>
      prev.map((pt) => {
        if (pt.id !== ptId) return pt
        const oldRow = pt.calhas[letra] || {}
        const newCalhas = { ...pt.calhas, [letra]: { ...oldRow, ...patch } }
        return { ...pt, calhas: newCalhas }
      }),
    )
  }

  const buildCalhasSheet = (title, store, selObj) => {
    const metadata = buildMetadataRows({
      inspetor,
      data,
      equip,
      area,
      extra: [["Seção", title]],
    })

    const header = [
      "Letra",
      "Pontos",
      "Item",
      "Dano",
      "Serviço",
      "Critic.",
      "Limpeza",
      "Andaime",
      "Observações",
      "Status",
    ]

    const letters = ["A", "B", "C", "D", "E"]
    const rows = letters.map((L) => {
      const r = store[L] || {}
      return [
        L,
        pointsOf(selObj, L),
        formatCodes(r.item),
        formatCodes(r.dano),
        formatCodes(r.servico),
        r.critic || "",
        r.limpeza || "",
        r.andaime || "",
        r.obs || "",
        statusFromCritic(r.critic),
      ]
    })

    return [...metadata, header, ...rows]
  }

  const buildGenericSheet = (title, rows, columns) => {
    const metadata = buildMetadataRows({
      inspetor,
      data,
      equip,
      area,
      extra: [["Seção", title]],
    })

    const header = [...columns.map((c) => c.label), "Status"]

    const rendered =
      rows.length > 0
        ? rows.map((r) => [
            ...columns.map((c) => c.accessor(r)),
            statusFromCritic(r.critic),
          ])
        : [
            (() => {
              const placeholder = new Array(header.length).fill("")
              placeholder[0] = "-"
              placeholder[header.length - 1] = "OK"
              return placeholder
            })(),
          ]

    return [...metadata, header, ...rendered]
  }

  const clearAll = () => {
    onHeaderChange("inspetor", "")
    onHeaderChange("data", new Date().toISOString().slice(0, 10))
    onHeaderChange("equip", "")
    onHeaderChange("area", "")
    setPtsCalha([
      {
        id: safeId(),
        numero: 1,
        sel: {},
        calhas: {},
      },
    ])
    setVedacaoRows([])
    setRaspRows([])
    setMesasRows([])
    //setLegendCalhas({})
    //setLegendVedacao({})
    //setLegendMesas({})
    setDadosPorEquip({})
  }

    // ===================== Evidências (fotos) ===================== //
  const buildEvidencias = () => {
    const evidencias = []

  // --- CALHAS (todos os pontos de transferência) ---
  ptsCalha.forEach((pt) => {
    Object.entries(pt.calhas).forEach(([letra, row]) => {
      const cell = row.dano
      const photo = cell?.photo
      const codes = cell?.codes || []

      if (!photo?.dataUrl) return

      evidencias.push({
        pagina: 2,
        secao: "calhas",
        tipo: "celula",
        baliza: null,
        ponto: String(pt.numero),     // PT1, PT2, PT3...
        letra,                        // "A", "B", ...
        coluna: "dano",
        codes,
        fileName: photo.name || null,
        dataUrl: photo.dataUrl,
      })
    })
  })


    // --- 3) VEDAÇÃO ---
    vedacaoRows.forEach((r) => {
      const cell = r.dano
      const photo = cell?.photo
      const codes = cell?.codes || []

      if (!photo?.dataUrl) return

      evidencias.push({
        pagina: 2,
        secao: "vedacao",
        tipo: "celula",
        baliza: null,
        ponto: r.ponto || null,   // "1", "2", ...
        letra: null,
        coluna: "dano",
        codes,
        fileName: photo.name || null,
        dataUrl: photo.dataUrl,
      })
    })

    // --- 4) RASPADORES ---
    raspRows.forEach((r) => {
      const cell = r.dano
      const photo = cell?.photo
      const codes = cell?.codes || []

      if (!photo?.dataUrl) return

      evidencias.push({
        pagina: 2,
        secao: "raspadores",
        tipo: "celula",
        baliza: null,
        ponto: r.ponto || null,   // "1", "2", ...
        letra: null,
        coluna: "dano",
        codes,
        fileName: photo.name || null,
        dataUrl: photo.dataUrl,
      })
    })

    // --- 5) MESAS ---
    mesasRows.forEach((r) => {
      const cell = r.dano
      const photo = cell?.photo
      const codes = cell?.codes || []

      if (!photo?.dataUrl) return

      evidencias.push({
        pagina: 2,
        secao: "mesas",
        tipo: "celula",
        baliza: null,
        ponto: r.ponto || null,
        letra: null,
        coluna: "dano",
        codes,
        fileName: photo.name || null,
        dataUrl: photo.dataUrl,
      })
    })

    return evidencias
  }
  // NOVO – funções para reutilizar a mesma lógica de montagem
  const buildCalhasData = (ptsState) =>
    (ptsState || []).flatMap((pt) =>
      Object.entries(pt.calhas || {}).map(([letra, row]) => ({
        ponto: pt.numero, // 1, 2, 3...
        letra,
        pontos: (pt.sel?.[letra] || []).map((c) => `${letra}${c}`),
        item: row.item?.codes || [],
        dano: row.dano?.codes || [],
        servico: row.servico?.codes || [],
        critic: row.critic || "",
        limpeza: row.limpeza || "",
        andaime: row.andaime || "",
        obs: row.obs || "",
      })),
    )

  const buildVedacaoData = (rowsState) =>
    (rowsState || []).map((r) => ({
      ponto: r.ponto || "",
      critic: r.critic || "",
      dano: r.dano?.codes || [],
      item: r.item?.codes || [],
      servico: r.servico?.codes || [],
      posicao: r.posicao || [],
      limpeza: r.limpeza || "",
      andaime: r.andaime || "",
      obs: r.obs || "",
    }))

  const buildRaspadoresData = (rowsState) =>
    (rowsState || []).map((r) => ({
      ponto: r.ponto || "",
      critic: r.critic || "",
      dano: r.dano?.codes || [],
      item: r.item?.codes || [],
      servico: r.servico?.codes || [],
      posicao: r.posicao || [],
      limpeza: r.limpeza || "",
      andaime: r.andaime || "",
      obs: r.obs || "",
    }))

  const buildMesasData = (rowsState) =>
    (rowsState || []).map((r) => ({
      ponto: r.ponto || "",
      critic: r.critic || "",
      dano: r.dano?.codes || [],
      item: r.item?.codes || [],
      servico: r.servico?.codes || [],
      posicao: r.posicao || [],
      limpeza: r.limpeza || "",
      andaime: r.andaime || "",
      modelo: r.modelo || "",
      obs: r.obs || "",
    }))

  useImperativeHandle(
    ref,
    () => {
      // dados da correia atual (como já era)
      const calhas = buildCalhasData(ptsCalha)
      const vedacao = buildVedacaoData(vedacaoRows)
      const raspadores = buildRaspadoresData(raspRows)
      const mesas = buildMesasData(mesasRows)

      // NOVO – snapshot da correia atual e merge com o mapa salvo
      const currentKey = equip || NO_EQUIP_KEY
      const snapshotAtual = {
        ptsCalha,
        vedacaoRows,
        raspRows,
        mesasRows,
      }

      const allData = {
        ...dadosPorEquip,
        [currentKey]: snapshotAtual,
      }

      // NOVO – monta multiEquip com TODAS as correias editadas
      const multiEquip = Object.entries(allData)
        .filter(([key, st]) => key !== NO_EQUIP_KEY && st)
        .map(([equipCode, st]) => ({
          equip: equipCode,
          calhas: buildCalhasData(st.ptsCalha || []),
          vedacao: buildVedacaoData(st.vedacaoRows || []),
          raspadores: buildRaspadoresData(st.raspRows || []),
          mesas: buildMesasData(st.mesasRows || []),
        }))

      return {
        clear: clearAll,
        getFormData: () => ({
          inspetor,
          data,
          equip,
          area,

          // formato antigo (correia atual)
          calhas,
          vedacao,
          raspadores,
          mesas,

          // NOVO – todas as correias
          multiEquip,
        }),
        getExportSheets: () => [
          ...ptsCalha.map((pt) => ({
            name: `Página 2 - Calhas (PT${pt.numero})`,
            data: buildCalhasSheet(
              `Calhas - PT${pt.numero}`,
              pt.calhas,
              pt.sel,
            ),
          })),
          {
            name: "Página 2 - Vedação",
            data: buildGenericSheet("Vedação", vedacaoRows, [
              { label: "Ponto de Carga", accessor: (r) => r.ponto || "" },
              { label: "Critic.", accessor: (r) => r.critic || "" },
              { label: "Dano", accessor: (r) => formatCodes(r.dano) },
              { label: "Item", accessor: (r) => formatCodes(r.item) },
              { label: "Serviço", accessor: (r) => formatCodes(r.servico) },
              {
                label: "Posição",
                accessor: (r) => (r.posicao || []).join(";"),
              },
              { label: "Limpeza", accessor: (r) => r.limpeza || "" },
              { label: "Andaime", accessor: (r) => r.andaime || "" },
              { label: "Observações", accessor: (r) => r.obs || "" },
            ]),
          },
          {
            name: "Página 2 - Raspadores",
            data: buildGenericSheet("Raspadores", raspRows, [
              { label: "Ponto/Baliza", accessor: (r) => r.ponto || "" },
              { label: "Critic.", accessor: (r) => r.critic || "" },
              { label: "Dano", accessor: (r) => formatCodes(r.dano) },
              { label: "Item", accessor: (r) => formatCodes(r.item) },
              { label: "Serviço", accessor: (r) => formatCodes(r.servico) },
              {
                label: "Posição",
                accessor: (r) => (r.posicao || []).join(";"),
              },
              { label: "Limpeza", accessor: (r) => r.limpeza || "" },
              { label: "Andaime", accessor: (r) => r.andaime || "" },
              { label: "Observações", accessor: (r) => r.obs || "" },
            ]),
          },
          {
            name: "Página 2 - Mesas",
            data: buildGenericSheet("Mesas", mesasRows, [
              { label: "Ponto de Carga", accessor: (r) => r.ponto || "" },
              { label: "Critic.", accessor: (r) => r.critic || "" },
              { label: "Dano", accessor: (r) => formatCodes(r.dano) },
              { label: "Item", accessor: (r) => formatCodes(r.item) },
              { label: "Serviço", accessor: (r) => formatCodes(r.servico) },
              {
                label: "Posição",
                accessor: (r) => (r.posicao || []).join(";"),
              },
              { label: "Limpeza", accessor: (r) => r.limpeza || "" },
              { label: "Andaime", accessor: (r) => r.andaime || "" },
              { label: "Modelo", accessor: (r) => r.modelo || "" },
              { label: "Observações", accessor: (r) => r.obs || "" },
            ]),
          },
        ],
        getEvidencias: buildEvidencias,
      }
    },
    [
      ptsCalha,
      vedacaoRows,
      raspRows,
      mesasRows,
      inspetor,
      data,
      equip,
      area,
      dadosPorEquip, // NOVO
    ],
  )



  /* ====== RENDER TABELA CALHAS ====== */
  const renderCalhasTable = (store, setStore, selObj) => (
    <div className="table-scroll-container mt-3">
      <table className="w-full">
        <thead>
          <tr className="text-center text-sm bg-slate-100">
            {[
              "PONTOS",
              "ITEM",
              "DANO",
              "SERVIÇO",
              "CRITIC.",
              "LIMPEZA",
              "ANDAIME",
              "OBSERVAÇÕES",
            ].map((h) => (
              <th
                key={h}
                className="border-b border-r last:border-r-0 py-2 px-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activeLetters(selObj).map((L) => {
            const r = store[L] || {}
            const setRow = (patch) =>
              setStore((p) => ({ ...p, [L]: { ...(p[L] || {}), ...patch } }))

            return (
              <tr key={L} className="text-sm hover:bg-slate-50">
                <td className="border-r border-b px-3 py-2 font-medium text-center">
                  {pointsOf(selObj, L)}
                </td>
                <td className="border-r border-b px-3 py-2">
                  <CellSelector
                    label={`ITEM — ${L}`}
                    value={r.item}
                    onChange={(v) => setRow({ item: v })}
                    catalog={cats?.calhas_item || []}
                  />
                </td>
                <td className="border-r border-b px-3 py-2">
                  <CellSelector
                    label={`DANO — ${L}`}
                    value={r.dano}
                    onChange={(v) => setRow({ dano: v })}
                    catalog={cats?.calhas_dano || []}
                    withPhoto
                  />
                </td>
                <td className="border-r border-b px-3 py-2">
                  <CellSelector
                    label={`SERVIÇO — ${L}`}
                    value={r.servico}
                    onChange={(v) => setRow({ servico: v })}
                    catalog={cats?.calhas_servico || []}
                  />
                </td>
                <td className="border-r border-b px-3 py-2 text-center">
                  <SingleSelector
                    label={`CRITIC. — ${L}`}
                    value={r.critic}
                    onChange={(v) => setRow({ critic: v })}
                    options={catCritic || []}
                  />
                </td>
                <td className="border-r border-b px-3 py-2 text-center">
                  <SingleSelector
                    label={`LIMPEZA — ${L}`}
                    value={r.limpeza}
                    onChange={(v) => setRow({ limpeza: v })}
                    options={catLimp || []}
                  />
                </td>
                <td className="border-r border-b px-3 py-2 text-center">
                  <SingleSelector
                    label={`ANDAIME — ${L}`}
                    value={r.andaime}
                    onChange={(v) => setRow({ andaime: v })}
                    options={catLimp || []}
                  />
                </td>
                <td className="border-b px-3 py-2">
                  <input
                    className="table-input w-full"
                    value={r.obs || ""}
                    onChange={(e) => setRow({ obs: e.target.value })}
                    placeholder={`Observações ${L}`}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  /* ====== HEADER ====== */
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

  const handleHeaderChange = (fieldId, value) => {
    if (fieldId === "inspetor") onHeaderChange("inspetor", value)
    else if (fieldId === "data") onHeaderChange("data", value)
    else if (fieldId === "equip") {
      const nextEquip = value
      const currentKey = equip || NO_EQUIP_KEY
      const nextKey = nextEquip || NO_EQUIP_KEY

      // 1) salva o estado da correia atual
      setDadosPorEquip((prev) => ({
        ...prev,
        [currentKey]: {
          ptsCalha,
          vedacaoRows,
          raspRows,
          mesasRows,
        },
      }))

      // 2) carrega o estado salvo da próxima correia (usando o valor "antigo" de dadosPorEquip)
      const saved = dadosPorEquip[nextKey]

      if (saved) {
        setPtsCalha(saved.ptsCalha || makeInitialPtsCalha())
        setVedacaoRows(saved.vedacaoRows || [])
        setRaspRows(saved.raspRows || [])
        setMesasRows(saved.mesasRows || [])
      } else {
        // se nunca editou essa correia, começa limpo
        setPtsCalha(makeInitialPtsCalha())
        setVedacaoRows([])
        setRaspRows([])
        setMesasRows([])
      }

      onHeaderChange("equip", nextEquip)
    } else if (fieldId === "area") onHeaderChange("area", value)
  }


  const rightContent = (
    <div className="text-sm space-y-1">
      <div className="flex justify-between">
        <span>Código:</span>
        <strong>FM-GTO-057</strong>
      </div>
      <div className="flex justify-between">
        <span>Folha:</span>
        <span>2/5</span>
      </div>
      <div className="flex justify-between">
        <span>Revisão:</span>
        <span>-</span>
      </div>
    </div>
  )

  /* ====== RENDER PRINCIPAL ====== */
  return (
    <Section
      id="p2"
      title="Calhas, Vedação, Raspadores/Limpadores e Mesas"
      description="Página 2 — Inspeção mecânica"
    >
      <ResponsiveHeader
        fields={headerFields}
        onFieldChange={handleHeaderChange}
        rightContent={rightContent}
      />

      <h2 className="title-center text-lg font-semibold mb-2 mt-6 text-primary">
        CALHAS
      </h2>
      <LegendBox
        title="Legenda - Calhas"
        equipCode={header?.equip}
        staticSrc={`${legendStaticBase}/calhas/fixa.png`}
        dynamicSrc={header?.equip ? `${legendStaticBase}/calhas/${header.equip}.png` : null}
      />

      {ptsCalha.map((pt, idx) => (
        <Collapse
          key={pt.id}
          title={`Ponto de transferência ${pt.numero}`}
          defaultOpen={idx === 0}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500">
              Selecione de A1 a E4
            </span>
            {ptsCalha.length > 1 && (
              <button
                type="button"
                className="text-xs px-2 py-1 border rounded-2xl"
                onClick={() => removePontoTransferencia(pt.id)}
              >
                Remover PT
              </button>
            )}
          </div>

          <MatrixGrid
            items={matrixLabels}
            onItemClick={(lbl) => togglePt(pt.id, lbl)}
            isActive={(lbl) => isActiveGrouped(pt.sel, lbl)}
          />

          {renderCalhasTable(
            pt.calhas,
            // adaptador para funcionar com o setStore interno do renderCalhasTable
            (updater) => {
              setPtsCalha((prev) =>
                prev.map((p) => {
                  if (p.id !== pt.id) return p
                  const oldStore = p.calhas
                  const newStore =
                    typeof updater === "function" ? updater(oldStore) : updater
                  return { ...p, calhas: newStore }
                }),
              )
            },
            pt.sel,
          )}
        </Collapse>
      ))}

      <div className="flex justify-end mb-6">
        <button
          type="button"
          className="px-3 py-2 border rounded-2xl text-xs"
          onClick={addPontoTransferencia}
        >
          + Adicionar ponto de transferência
        </button>
      </div>


      <h2 className="title-center text-lg font-semibold my-4 text-primary">
        VEDAÇÃO
      </h2>
      <LegendBox
        title="Legenda - Vedação"
        equipCode={header?.equip}
        staticSrc={`${legendStaticBase}/vedacao/fixa.png`}
        dynamicSrc={header?.equip ? `${legendStaticBase}/vedacao/${header.equip}.png` : null}
      />
      <VedacaoTable
        rows={vedacaoRows}
        setRows={setVedacaoRows}
        cat={{
          item: cats?.vedacao_item || [],
          dano: cats?.vedacao_dano || [],
          servico: cats?.vedacao_servico || [],
          critic: catCritic || [],
          limpeza: catLimp || [],
        }}
      />

      <h2 className="title-center text-lg font-semibold my-4 text-primary">
        RASPADORES / LIMPADORES
      </h2>
      <RaspadoresTable
        rows={raspRows}
        setRows={setRaspRows}
        cat={{
          item: cats?.rasp_item || [],
          dano: cats?.rasp_dano || [],
          servico: cats?.rasp_servico || [],
          critic: catCritic || [],
          limpeza: catLimp || [],
        }}
      />

      <h2 className="title-center text-lg font-semibold my-4 text-primary">
        MESAS
      </h2>
      <LegendBox
        title="Legenda - Mesas"
        equipCode={header?.equip}
        staticSrc={`${legendStaticBase}/mesas/fixa.png`}
        dynamicSrc={header?.equip ? `${legendStaticBase}/mesas/${header.equip}.png` : null}
      />
      <MesasTable
        rows={mesasRows}
        setRows={setMesasRows}
        cat={{
          item: cats?.mesas_item || [],
          dano: cats?.mesas_dano || [],
          servico: cats?.mesas_servico || [],
          critic: catCritic || [],
          limpeza: catLimp || [],
          modelos: modelosMesaDom || [],
        }}
      />
    </Section>
  )
})

/* ===================== TABELAS ESPECÍFICAS ===================== */
function VedacaoTable({ rows, setRows, cat }) {
  const addRow = () => setRows((p) => [...p, {}])
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i))
  const setRow = (i, patch) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="border p-3 rounded-2xl table-scroll-container">
      <div className="flex justify-end mb-2">
        <button className="px-3 py-2 border rounded-2xl" onClick={addRow}>
          Adicionar linha
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-center text-sm bg-slate-100">
            {[
              "PONTO DE CARGA",
              "CRITIC.",
              "DANO",
              "ITEM",
              "SERVIÇO",
              "POSIÇÃO",
              "LIMPEZA",
              "ANDAIME",
              "OBSERVAÇÕES",
              "",
            ].map((h) => (
              <th
                key={h}
                className="border-b border-r last:border-r-0 py-2 px-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="text-sm hover:bg-slate-50">
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="PONTO DE CARGA"
                  value={r.ponto}
                  onChange={(v) => setRow(i, { ponto: v })}
                  options={[
                    { code: "1", label: "1" },
                    { code: "2", label: "2" },
                    { code: "3", label: "3" },
                    { code: "4", label: "4" },
                  ]}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="CRITIC."
                  value={r.critic}
                  onChange={(v) => setRow(i, { critic: v })}
                  options={cat.critic}
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="DANO"
                  value={r.dano}
                  onChange={(v) => setRow(i, { dano: v })}
                  catalog={cat.dano}
                  withPhoto
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="ITEM"
                  value={r.item}
                  onChange={(v) => setRow(i, { item: v })}
                  catalog={cat.item}
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="SERVIÇO"
                  value={r.servico}
                  onChange={(v) => setRow(i, { servico: v })}
                  catalog={cat.servico}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <Posicoes
                  value={r.posicao}
                  onChange={(v) => setRow(i, { posicao: v })}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="LIMPEZA"
                  value={r.limpeza}
                  onChange={(v) => setRow(i, { limpeza: v })}
                  options={cat.limpeza}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="ANDAIME"
                  value={r.andaime}
                  onChange={(v) => setRow(i, { andaime: v })}
                  options={cat.limpeza}
                />
              </td>
              <td className="border-b px-3 py-2">
                <input
                  className="table-input w-full"
                  value={r.obs || ""}
                  onChange={(e) => setRow(i, { obs: e.target.value })}
                  placeholder="Observações"
                />
              </td>
              <td className="border-b px-3 py-2 text-right">
                <button
                  className="table-button text-xs"
                  onClick={() => removeRow(i)}
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RaspadoresTable({ rows, setRows, cat }) {
  const addRow = () => setRows((p) => [...p, {}])
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i))
  const setRow = (i, patch) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="border p-3 rounded-2xl table-scroll-container">
      <div className="flex justify-end mb-2">
        <button className="px-3 py-2 border rounded-2xl" onClick={addRow}>
          Adicionar linha
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-center text-sm bg-slate-100">
            {[
              "PONTO/BALIZA",
              "CRITIC.",
              "DANO",
              "ITEM",
              "SERVIÇO",
              "POSIÇÃO",
              "LIMPEZA",
              "ANDAIME",
              "OBSERVAÇÕES",
              "",
            ].map((h) => (
              <th
                key={h}
                className="border-b border-r last:border-r-0 py-2 px-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="text-sm hover:bg-slate-50">
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="PONTO/BALIZA"
                  value={r.ponto}
                  onChange={(v) => setRow(i, { ponto: v })}
                  options={[
                    { code: "1", label: "1" },
                    { code: "2", label: "2" },
                    { code: "3", label: "3" },
                    { code: "4", label: "4" },
                  ]}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="CRITIC."
                  value={r.critic}
                  onChange={(v) => setRow(i, { critic: v })}
                  options={cat.critic}
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="DANO"
                  value={r.dano}
                  onChange={(v) => setRow(i, { dano: v })}
                  catalog={cat.dano}
                  withPhoto
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="ITEM"
                  value={r.item}
                  onChange={(v) => setRow(i, { item: v })}
                  catalog={cat.item}
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="SERVIÇO"
                  value={r.servico}
                  onChange={(v) => setRow(i, { servico: v })}
                  catalog={cat.servico}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <Posicoes
                  value={r.posicao}
                  onChange={(v) => setRow(i, { posicao: v })}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="LIMPEZA"
                  value={r.limpeza}
                  onChange={(v) => setRow(i, { limpeza: v })}
                  options={cat.limpeza}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="ANDAIME"
                  value={r.andaime}
                  onChange={(v) => setRow(i, { andaime: v })}
                  options={cat.limpeza}
                />
              </td>
              <td className="border-b px-3 py-2">
                <input
                  className="table-input w-full"
                  value={r.obs || ""}
                  onChange={(e) => setRow(i, { obs: e.target.value })}
                  placeholder="Observações"
                />
              </td>
              <td className="border-b px-3 py-2 text-right">
                <button
                  className="table-button text-xs"
                  onClick={() => removeRow(i)}
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MesasTable({ rows, setRows, cat }) {
  const addRow = () => setRows((p) => [...p, {}])
  const removeRow = (i) => setRows((p) => p.filter((_, idx) => idx !== i))
  const setRow = (i, patch) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  return (
    <div className="border p-3 rounded-2xl table-scroll-container">
      <div className="flex justify-end mb-2">
        <button className="px-3 py-2 border rounded-2xl" onClick={addRow}>
          Adicionar linha
        </button>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-center text-sm bg-slate-100">
            {[
              "PONTO DE CARGA",
              "CRITIC.",
              "DANO",
              "ITEM",
              "SERVIÇO",
              "POSIÇÃO",
              "LIMPEZA",
              "ANDAIME",
              "MODELO",
              "OBSERVAÇÕES",
              "",
            ].map((h) => (
              <th
                key={h}
                className="border-b border-r last:border-r-0 py-2 px-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="text-sm hover:bg-slate-50">
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="PONTO DE CARGA"
                  value={r.ponto}
                  onChange={(v) => setRow(i, { ponto: v })}
                  options={[
                    { code: "1", label: "1" },
                    { code: "2", label: "2" },
                    { code: "3", label: "3" },
                    { code: "4", label: "4" },
                  ]}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="CRITIC."
                  value={r.critic}
                  onChange={(v) => setRow(i, { critic: v })}
                  options={cat.critic}
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="DANO"
                  value={r.dano}
                  onChange={(v) => setRow(i, { dano: v })}
                  catalog={cat.dano}
                  withPhoto
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="ITEM"
                  value={r.item}
                  onChange={(v) => setRow(i, { item: v })}
                  catalog={cat.item}
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <CellSelector
                  label="SERVIÇO"
                  value={r.servico}
                  onChange={(v) => setRow(i, { servico: v })}
                  catalog={cat.servico}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <Posicoes
                  value={r.posicao}
                  onChange={(v) => setRow(i, { posicao: v })}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="LIMPEZA"
                  value={r.limpeza}
                  onChange={(v) => setRow(i, { limpeza: v })}
                  options={cat.limpeza}
                />
              </td>
              <td className="border-r border-b px-3 py-2 text-center">
                <SingleSelector
                  label="ANDAIME"
                  value={r.andaime}
                  onChange={(v) => setRow(i, { andaime: v })}
                  options={cat.limpeza}
                />
              </td>
              <td className="border-r border-b px-3 py-2">
                <SingleSelector
                  label="MODELO"
                  value={r.modelo}
                  onChange={(v) => setRow(i, { modelo: v })}
                  options={cat.modelos}
                />
              </td>
              <td className="border-b px-3 py-2">
                <input
                  className="table-input w-full"
                  value={r.obs || ""}
                  onChange={(e) => setRow(i, { obs: e.target.value })}
                  placeholder="Observações"
                />
              </td>
              <td className="border-b px-3 py-2 text-right">
                <button
                  className="table-button text-xs"
                  onClick={() => removeRow(i)}
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ===================== COMPONENTE DE LEGENDA ===================== */
function LegendBox({ title, equipCode, staticSrc, dynamicSrc }) {
  const equipLabel = equipCode || "Selecionar equipamento"
  const [hideStatic, setHideStatic] = useState(false)
  const [hideDynamic, setHideDynamic] = useState(false)
  return (
    <div className="mb-3 card p-4 rounded-2xl border shadow-soft">
      <h3 className="font-medium text-sm mb-3">{title}</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Imagem fixa</span>
          </div>
          {staticSrc && !hideStatic ? (
            <div className="flex justify-center">
              <img
                src={staticSrc}
                alt={`Legenda ${title}`}
                className="max-h-64 border rounded"
                onError={() => setHideStatic(true)}
              />
            </div>
          ) : (
            <div className="text-xs text-slate-500 border border-dashed p-3 text-center rounded">
              Nenhuma imagem fixa encontrada em {staticSrc || "/legendas/.../fixa.png"}.
            </div>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">
              Imagem dinâmica ({equipLabel})
            </span>
          </div>
          {equipCode ? (
            dynamicSrc && !hideDynamic ? (
              <div className="flex justify-center">
                <img
                  src={dynamicSrc}
                  alt={`Legenda dinâmica ${title}`}
                  className="max-h-64 border rounded"
                  onError={() => setHideDynamic(true)}
                />
              </div>
            ) : (
              <div className="text-xs text-slate-500 border border-dashed p-3 text-center rounded">
                Nenhuma imagem dinâmica para {equipCode}. Esperado em {dynamicSrc || "/legendas/.../<equip>.png"}.
              </div>
            )
          ) : (
            <div className="text-xs text-slate-500 border border-dashed p-3 text-center rounded">
              Selecione um equipamento para vincular a imagem dinâmica.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
export default Pagina2Inspecao


