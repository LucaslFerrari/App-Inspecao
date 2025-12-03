"use client"

// MainApp.jsx
import React from "react"
import * as XLSX from "xlsx"
import toast from "react-hot-toast"

import Pagina1Rolos from "./pagina1Rolos.jsx"
import Pagina2Inspecao from "./pagina2Inspecao.jsx"
import Pagina3Correia from "./pagina3Correia.jsx"
import Pagina4Tambor from "./pagina4Tambor.jsx"
import Pagina5Estrutura from "./pagina5Estrutura.jsx"

import Container from "./components/ui/Container"
import Toolbar, { PrimaryButton, GhostButton } from "./components/ui/Toolbar"
import { sanitizeSheetName } from "./lib/exportUtils"
import { useOnlineStatus } from "./hooks/useOnlineStatus"
import {
  enqueueInspecao,
  hasPendingInspecoes,
  syncInspecoes,
  getPendingCount,
} from "./lib/offlineQueue"

const API_BASE = import.meta.env.VITE_API_BASE || ""

export default function MainApp({ user, onLogout, onNavigateControle }) {
  const [pagina, setPagina] = React.useState(1)
  const pagina1Ref = React.useRef(null)
  const pagina2Ref = React.useRef(null)
  const pagina3Ref = React.useRef(null)
  const pagina4Ref = React.useRef(null)
  const pagina5Ref = React.useRef(null)

  // nome do inspetor vindo do usuário logado
  const inspectorFromUser =
    user?.nome || user?.name || user?.fullName || user?.email || ""

  const [header, setHeader] = React.useState({
    inspetor: inspectorFromUser,
    data: new Date().toISOString().slice(0, 10),
    equip: "",
    area: "",
  })

  // sempre que o usuário logado mudar, atualiza o campo Inspetor
  React.useEffect(() => {
    const nome = inspectorFromUser
    setHeader((h) => ({ ...h, inspetor: nome }))
  }, [inspectorFromUser])

  const onHeaderChange = (key, value) =>
    setHeader((h) => ({ ...h, [key]: value }))

  const [filaCount, setFilaCount] = React.useState(0)
  const [salvando, setSalvando] = React.useState(false)
  const online = useOnlineStatus()

  // Estados para a lógica de Ponto de Transferência
  const [pontoTransf1, setPontoTransf1] = React.useState(null)
  const [pontoTransf2, setPontoTransf2] = React.useState(null)
  const [mostrarPT2, setMostrarPT2] = React.useState(false)

  function onSelecionouPosPT1(regiao) {
    setPontoTransf1(regiao)
    setMostrarPT2(true)
  }

  function fecharPT2() {
    setPontoTransf2(null)
    setMostrarPT2(false)
  }

  const salvarRemoto = React.useCallback(async (dados, signal) => {
    const res = await fetch(`${API_BASE || ""}/api/salvar-inspecao`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
      signal,
    })

    const result = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(result?.error || `Erro HTTP ${res.status}`)
    }

    return result
  }, [])

  const tentarSincronizarFila = React.useCallback(async () => {
    try {
      const pendingBefore = await getPendingCount()
      if (!pendingBefore) {
        setFilaCount(0)
        return
      }
      const { sent } = await syncInspecoes(salvarRemoto)
      if (sent.length) {
        console.log(`[offline] ${sent.length} inspeções sincronizadas da fila`)
      }
      const pendingAfter = await getPendingCount()
      setFilaCount(pendingAfter)
    } catch (err) {
      console.warn("[offline] Falha ao sincronizar fila:", err?.message)
    }
  }, [salvarRemoto])

  React.useEffect(() => {
    tentarSincronizarFila()
    function onOnline() {
      tentarSincronizarFila()
    }
    window.addEventListener("online", onOnline)
    return () => window.removeEventListener("online", onOnline)
  }, [tentarSincronizarFila])

  React.useEffect(() => {
    let mounted = true
    async function updateCount() {
      try {
        const count = await getPendingCount()
        if (mounted) setFilaCount(count)
      } catch {}
    }
    updateCount()
    return () => {
      mounted = false
    }
  }, [])

  const collectSheets = () => [
    ...(pagina1Ref.current?.getExportSheets?.() || []),
    ...(pagina2Ref.current?.getExportSheets?.() || []),
    ...(pagina3Ref.current?.getExportSheets?.() || []),
    ...(pagina4Ref.current?.getExportSheets?.() || []),
    ...(pagina5Ref.current?.getExportSheets?.() || []),
  ]

  function handleExport() {
    const sheets = collectSheets().filter(
      (sheet) => Array.isArray(sheet?.data) && sheet.data.length > 0,
    )
    if (!sheets.length) {
      console.warn("Nenhum dado disponível para exportar.")
      toast("Nenhum dado disponível para exportar.", { icon: "ℹ️" })
      return
    }
    const workbook = XLSX.utils.book_new()
    sheets.forEach(({ name, data }) => {
      const worksheet = XLSX.utils.aoa_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(name))
    })
    const filename = `inspecao_mecanica_${new Date().toISOString().slice(0, 10)}.xlsx`
    XLSX.writeFile(workbook, filename)
    toast.success("Arquivo Excel gerado.")
  }

  async function getLocationSafe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return null
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords
          resolve({
            lat: latitude,
            lng: longitude,
            gpsAccuracy: Math.round(accuracy ?? 0),
          })
        },
        (err) => {
          console.warn("[gps] Erro ao obter localização:", err?.message)
          resolve(null)
        },
        {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 60000,
        },
      )
    })
  }


  async function handleSalvarBD() {
    if (salvando) return

    const confirmou = window.confirm(
      "Deseja salvar a inspeção no banco de dados agora?",
    )
    if (!confirmou) return

    setSalvando(true)
    try {
      const location = await getLocationSafe()
      console.log("[gps] location obtida:", location)

      const evidenciasPagina1 = pagina1Ref.current?.getEvidencias?.() || []
      const evidenciasPagina2 = pagina2Ref.current?.getEvidencias?.() || []
      const evidenciasPagina3 = pagina3Ref.current?.getEvidencias?.() || []
      const evidenciasPagina4 = pagina4Ref.current?.getEvidencias?.() || []
      const evidenciasPagina5 = pagina5Ref.current?.getEvidencias?.() || []

      const evidencias = [
        ...evidenciasPagina1,
        ...evidenciasPagina2,
        ...evidenciasPagina3,
        ...evidenciasPagina4,
        ...evidenciasPagina5,
      ]

      const pagina1Data = pagina1Ref.current?.getFormData?.() || {}
      const pagina2Data = pagina2Ref.current?.getFormData?.() || {}
      const pagina3Data = pagina3Ref.current?.getFormData?.() || {}
      const pagina4Data = pagina4Ref.current?.getFormData?.() || {}
      const pagina5Data = pagina5Ref.current?.getFormData?.() || {}

      const pickFirst = (key, fallback) => {
        const candidates = [
          pagina1Data?.[key],
          pagina2Data?.[key],
          pagina3Data?.[key],
          pagina4Data?.[key],
          pagina5Data?.[key],
        ].filter((v) => v != null && v !== "")
        return candidates[0] || fallback
      }

      const headerInspetor = pickFirst(
        "inspetor",
        inspectorFromUser || "Não preenchido",
      )
      const headerData =
        pickFirst("data", null) || new Date().toISOString().slice(0, 10)
      const headerEquip = pickFirst("equip", "Não preenchido")
      const headerArea = pickFirst("area", "Não preenchido")

      const dados = {
        usuario_id: user?.id ?? null,
        empresa_id: user?.empresa_id ?? null,
        contrato_id: user?.contrato_id ?? null,
        usuarioNome: inspectorFromUser || null,

        inspetor: headerInspetor,
        data: headerData,
        equip: headerEquip,
        area: headerArea,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        gpsAccuracy: location?.gpsAccuracy ?? null,
        pagina1: pagina1Data,
        pagina2: pagina2Data,
        pagina3: pagina3Data,
        pagina4: pagina4Data,
        pagina5: pagina5Data,
        evidencias,
      }


      const offlineNow =
        typeof navigator !== "undefined" && navigator.onLine === false

      if (offlineNow) {
        const queued = await enqueueInspecao(dados)
        setFilaCount(await getPendingCount())
        toast("Sem conexão. Inspeção salva offline (ID local: " + queued.id + ").", {
          icon: "📦",
        })
        handleLimpar()
        return
      }

      const controller = new AbortController()
      // Tempo maior para uploads mais pesados (evidências) antes de considerar timeout
      const timer = setTimeout(() => controller.abort(), 30000)

      try {
        const result = await salvarRemoto(dados, controller.signal)
        clearTimeout(timer)
        toast.success("Inspeção salva com sucesso! ID: " + result.id)
        handleLimpar()
        await tentarSincronizarFila()
        setFilaCount(await getPendingCount())
      } catch (error) {
        clearTimeout(timer)
        console.error("[v0] Erro ao salvar online:", error.message)
        const offline =
          (typeof navigator !== "undefined" && navigator.onLine === false) ||
          /Failed to fetch|ECONNRESET|ETIMEDOUT|NetworkError/i.test(
            error.message || "",
          )

        if (offline) {
          const queued = await enqueueInspecao(dados)
          setFilaCount(await getPendingCount())
          toast("Sem conexão. Inspeção salva offline (ID local: " + queued.id + ").", {
            icon: "📦",
          })
          handleLimpar()
        } else if (error?.name === "AbortError") {
          toast.error("Tempo esgotado ao salvar. Tente novamente.")
        } else {
          toast.error("Erro ao salvar: " + (error.message || "Desconhecido"))
        }
      }
    } finally {
      setSalvando(false)
    }
  }

  function handleLimpar() {
    setPontoTransf1(null)
    setPontoTransf2(null)
    setMostrarPT2(false)
    pagina1Ref.current?.clear?.()
    pagina2Ref.current?.clear?.()
    pagina3Ref.current?.clear?.()
    pagina4Ref.current?.clear?.()
    pagina5Ref.current?.clear?.()
  }

  const userLabel = inspectorFromUser || "Usuário"

  return (
    <Container className="py-4 md:py-6">
      <Toolbar stickyTop className="mb-4 md:mb-6">
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 w-full">
            <h1 className="text-lg md:text-2xl font-bold text-primary">
              Formulário de Inspeção Mecânica
            </h1>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 w-full md:w-auto items-start sm:items-center justify-start md:justify-end">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge online={online} filaCount={filaCount} />

                {/* Usuário logado + botão de sair */}
                <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm text-slate-700">
                  <span className="max-w-40 md:max-w-xs truncate">
                    Logado como: <strong title={userLabel}>{userLabel}</strong>
                  </span>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-3 py-1 rounded-full border text-xs hover:bg-slate-100"
                    >
                      Sair
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto items-stretch sm:items-center">
                {/* novo botão de navegação para controle */}
                {onNavigateControle && (
                  <GhostButton type="button" onClick={onNavigateControle}>
                    Controle de inspeções
                  </GhostButton>
                )}

                <PrimaryButton onClick={handleSalvarBD} disabled={salvando}>
                  {salvando ? "Salvando..." : "Salvar BD"}
                </PrimaryButton>
                <PrimaryButton onClick={handleExport}>Exportar</PrimaryButton>
                <GhostButton onClick={handleLimpar}>Limpar</GhostButton>
              </div>
            </div>
          </div>

          <nav
            className="flex flex-wrap items-center gap-2"
            aria-label="Páginas do formulário"
          >
            <Tab active={pagina === 1} onClick={() => setPagina(1)}>
              Página 1 — Rolos
            </Tab>
            <Tab active={pagina === 2} onClick={() => setPagina(2)}>
              Página 2 — Calhas
            </Tab>
            <Tab active={pagina === 3} onClick={() => setPagina(3)}>
              Página 3 — Correia
            </Tab>
            <Tab active={pagina === 4} onClick={() => setPagina(4)}>
              Página 4 — Tambores
            </Tab>
            <Tab active={pagina === 5} onClick={() => setPagina(5)}>
              Página 5 — Estruturas
            </Tab>
          </nav>
        </div>
      </Toolbar>

      <div className="space-y-6">
        <div hidden={pagina !== 1} aria-hidden={pagina !== 1}>
          <Pagina1Rolos
            ref={pagina1Ref}
            header={header}
            onHeaderChange={onHeaderChange}
            onSelecionouPosPT1={onSelecionouPosPT1}
            mostrarPT2={mostrarPT2}
          />
        </div>
        <div hidden={pagina !== 2} aria-hidden={pagina !== 2}>
          <Pagina2Inspecao
            ref={pagina2Ref}
            header={header}
            onHeaderChange={onHeaderChange}
            mostrarPT2={mostrarPT2}
            pontoTransf1={pontoTransf1}
            pontoTransf2={pontoTransf2}
            onFecharPT2={fecharPT2}
            onSetPT2={setPontoTransf2}
          />
        </div>
        <div hidden={pagina !== 3} aria-hidden={pagina !== 3}>
          <Pagina3Correia
            ref={pagina3Ref}
            header={header}
            onHeaderChange={onHeaderChange}
            mostrarPT2={mostrarPT2}
            pontoTransf1={pontoTransf1}
            pontoTransf2={pontoTransf2}
            onFecharPT2={fecharPT2}
            onSetPT2={setPontoTransf2}
          />
        </div>
        <div hidden={pagina !== 4} aria-hidden={pagina !== 4}>
          <Pagina4Tambor
            ref={pagina4Ref}
            header={header}
            onHeaderChange={onHeaderChange}
          />
        </div>
        <div hidden={pagina !== 5} aria-hidden={pagina !== 5}>
          <Pagina5Estrutura
            ref={pagina5Ref}
            header={header}
            onHeaderChange={onHeaderChange}
          />
        </div>
      </div>
    </Container>
  )
}

/** Botão de aba com visual consistente (usa paleta do tema). */
function Tab({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={[
        "chip",
        "px-4 py-2",
        active ? "bg-accent border-primary text-slate-900" : "",
      ].join(" ")}
    >
      {children}
    </button>
  )
}

function StatusBadge({ online, filaCount }) {
  const base = "px-3 py-2 rounded-full text-xs font-semibold border"
  const statusClass = online
    ? "bg-green-100 border-green-300 text-green-800"
    : "bg-slate-200 border-slate-300 text-slate-700"
  return (
    <div className={[base, statusClass].join(" ")}>
      {online ? "Online" : "Offline"}
      {filaCount > 0 ? ` | Fila: ${filaCount}` : ""}
    </div>
  )
}




