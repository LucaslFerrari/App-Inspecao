"use client"

import React from "react"
import toast from "react-hot-toast"
import Container from "./components/ui/Container"
import Toolbar, { PrimaryButton, GhostButton } from "./components/ui/Toolbar"
import { useOnlineStatus } from "./hooks/useOnlineStatus"
import { useCatalogBatch } from "./hooks/useCatalog"
import { useCorreias } from "./hooks/useDomain"

const DEFAULT_PAGE_SIZE = 20
const API_BASE = import.meta.env.VITE_API_BASE || ""

export default function ControleInspecoes({ user, onBackToForm, onLogout }) {
  const online = useOnlineStatus()

  const [page, setPage] = React.useState(1)
  const [pageSize] = React.useState(DEFAULT_PAGE_SIZE)
  const [total, setTotal] = React.useState(0)
  const [items, setItems] = React.useState([])
  const [loading, setLoading] = React.useState(false)

  // filtros
  const [dataDe, setDataDe] = React.useState("")
  const [dataAte, setDataAte] = React.useState("")
  const [equip, setEquip] = React.useState("")
  const [area, setArea] = React.useState("")
  const [inspetor, setInspetor] = React.useState("")

  // detalhe (modal)
  const [detalheAberto, setDetalheAberto] = React.useState(false)
  const [detalheLoading, setDetalheLoading] = React.useState(false)
  const [detalhe, setDetalhe] = React.useState(null)

  // oportunidades - modal dedicado
  const [oportunidadesAberto, setOportunidadesAberto] = React.useState(false)
  const [correiaSelecionada, setCorreiaSelecionada] = React.useState("")
  const [oportunidades, setOportunidades] = React.useState([])
  const [oportunidadeDraft, setOportunidadeDraft] = React.useState({})
  const [oportunidadeLoading, setOportunidadeLoading] = React.useState(false)
  const [oportunidadeErro, setOportunidadeErro] = React.useState("")
  const [oportunidadeSaving, setOportunidadeSaving] = React.useState(false)
  const [backfillRodado, setBackfillRodado] = React.useState(true)
  const [mostrarExecutadas, setMostrarExecutadas] = React.useState(false)
  const { data: correias } = useCorreias()

  const empresaId = user?.empresa_id ?? null
  const contratoId = user?.contrato_id ?? null

  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1
  const alteracoesPendentes = Object.keys(oportunidadeDraft).length

  function formatDate(iso) {
    if (!iso) return ""
    try {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return iso
      return d.toLocaleDateString("pt-BR")
    } catch {
      return iso
    }
  }

  function formatCoord(v) {
    if (v == null) return ""
    const n = Number(v)
    if (Number.isNaN(n)) return String(v)
    return n.toFixed(5)
  }

  async function carregarInspecoes(pageToLoad = 1) {
    if (!empresaId) {
      toast.error("Usuário sem empresa vinculada. Verifique o cadastro.")
      return
    }

    if (!online) {
      toast("Você está offline. A lista de inspeções exige conexão com o servidor.", {
        icon: "📡",
      })
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(pageToLoad))
      params.set("pageSize", String(pageSize))
      params.set("empresa_id", String(empresaId))

      if (contratoId) params.set("contrato_id", String(contratoId))
      if (dataDe) params.set("data_de", dataDe)
      if (dataAte) params.set("data_ate", dataAte)
      if (equip) params.set("equip", equip)
      if (area) params.set("area", area)
      if (inspetor) params.set("inspetor", inspetor)

      const res = await fetch(
        `${API_BASE || ""}/api/inspecoes?${params.toString()}`,
      )

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = data?.error || `Erro HTTP ${res.status}`
        throw new Error(msg)
      }

      setItems(Array.isArray(data.items) ? data.items : [])
      setTotal(Number(data.total || 0))
      setPage(Number(data.page || pageToLoad))
    } catch (err) {
      console.error("[controle] erro ao carregar inspeções:", err)
      toast.error(err?.message || "Erro ao buscar inspeções.")
    } finally {
      setLoading(false)
    }
  }

  // carrega na primeira vez que entrar na tela (se tiver empresa)
  React.useEffect(() => {
    if (empresaId && online) {
      carregarInspecoes(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId]) // se mudar de usuário logado, recarrega

  async function abrirDetalhes(row) {
    if (!online) {
      toast("Você está offline. Para ver os detalhes da inspeção é preciso estar online.", {
        icon: "📡",
      })
      return
    }

    setDetalheAberto(true)
    setDetalheLoading(true)
    setDetalhe(null)

    try {
      const res = await fetch(
        `${API_BASE || ""}/api/inspecoes/${row.id}/detalhes`,
      )
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const msg = data?.error || `Erro HTTP ${res.status}`
        throw new Error(msg)
      }

      setDetalhe(data)
    } catch (err) {
      console.error("[controle] erro ao carregar detalhes:", err)
      toast.error(err?.message || "Erro ao carregar detalhes da inspeção.")
      setDetalheAberto(false)
    } finally {
      setDetalheLoading(false)
    }
  }

  function fecharDetalhes() {
    setDetalheAberto(false)
    setDetalhe(null)
  }

  // ---------------- OPORTUNIDADES POR CORREIA (lista principal) ---------------- //
  const carregarOportunidades = React.useCallback(
    async (correiaId) => {
      if (!correiaId) {
        setOportunidades([])
        setOportunidadeDraft({})
        setOportunidadeErro("")
        return
      }

      if (!online) {
        toast("Você está offline. Conecte-se para listar oportunidades.", { icon: "📡" })
        return
      }

      setOportunidadeLoading(true)
      setOportunidadeErro("")
      try {
        const res = await fetch(
          `${API_BASE || ""}/api/correias/${correiaId}/oportunidades`,
        )
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        const items = Array.isArray(data.items) ? data.items : []
        const filtradas = mostrarExecutadas
          ? items
          : items.filter(
              (op) => (op.status || "").toLowerCase() !== "executada",
            )
        setOportunidades(filtradas)
        setOportunidadeDraft({})
      } catch (err) {
        console.error("[controle] erro ao carregar oportunidades:", err)
        setOportunidadeErro(err?.message || "Erro ao buscar oportunidades.")
      } finally {
        setOportunidadeLoading(false)
      }
    },
    [online, mostrarExecutadas],
  )

  const toggleOportunidade = (id, marcado) => {
    const original = oportunidades.find((o) => o.id === id)?.status || "aberta"
    const novoStatus = marcado ? "executada" : "aberta"
    setOportunidadeDraft((prev) => {
      if (novoStatus === original) {
        const { [id]: _rm, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: novoStatus }
    })
  }

  const salvarOportunidades = async () => {
    const payload = Object.entries(oportunidadeDraft).map(([id, status]) => ({
      id: Number(id),
      status,
    }))
    if (!payload.length) return
    if (!online) {
      toast("Você está offline. Conecte-se para salvar.", { icon: "📡" })
      return
    }
    setOportunidadeSaving(true)
    try {
      const res = await fetch(`${API_BASE || ""}/api/oportunidades/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      toast.success("Oportunidades atualizadas.")

      // aplica atualização otimista no estado atual
      setOportunidades((prev) =>
        prev.map((op) => {
          const novo = payload.find((p) => p.id === Number(op.id))
          return novo ? { ...op, status: novo.status } : op
        }),
      )

      await carregarOportunidades(correiaSelecionada)
    } catch (err) {
      console.error("[controle] erro ao atualizar oportunidades:", err)
      toast.error(err?.message || "Erro ao salvar oportunidades.")
    } finally {
      setOportunidadeSaving(false)
    }
  }

  React.useEffect(() => {
    if (!oportunidadesAberto) return
    if (!correiaSelecionada) {
      setOportunidades([])
      setOportunidadeDraft({})
      return
    }
    carregarOportunidades(correiaSelecionada)
  }, [correiaSelecionada, carregarOportunidades, oportunidadesAberto, mostrarExecutadas])

  const userLabel =
    user?.nome || user?.name || user?.fullName || user?.email || "Usuário"

  return (
    <Container className="py-4 md:py-6">
      {/* TOOLBAR SUPERIOR */}
      <Toolbar stickyTop className="mb-4 md:mb-6">
        <div className="flex flex-col gap-3 w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-lg md:text-2xl font-bold text-primary">
                Controle de Inspeções
              </h1>
              <p className="text-xs md:text-sm text-slate-500">
                Visualize as inspeções já realizadas para este contrato.
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <StatusBadge online={online} />

              <div className="flex items-center gap-2 text-xs md:text-sm text-slate-700">
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

              <div className="flex gap-2">
                <GhostButton
                  type="button"
                  onClick={onBackToForm}
                  className="text-xs md:text-sm"
                >
                  &larr; Voltar para o formulário
                </GhostButton>
                <PrimaryButton
                  type="button"
                  onClick={() => setOportunidadesAberto(true)}
                  className="text-xs md:text-sm"
                >
                  Ver oportunidades
                </PrimaryButton>
              </div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 md:p-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              <FiltroCampo label="Data de">
                <input
                  type="date"
                  value={dataDe}
                  onChange={(e) => setDataDe(e.target.value)}
                  className="w-full border rounded-2xl px-3 py-2 text-xs md:text-sm"
                />
              </FiltroCampo>

              <FiltroCampo label="Data até">
                <input
                  type="date"
                  value={dataAte}
                  onChange={(e) => setDataAte(e.target.value)}
                  className="w-full border rounded-2xl px-3 py-2 text-xs md:text-sm"
                />
              </FiltroCampo>

              <FiltroCampo label="Equipamento">
                <input
                  type="text"
                  value={equip}
                  onChange={(e) => setEquip(e.target.value)}
                  className="w-full border rounded-2xl px-3 py-2 text-xs md:text-sm"
                  placeholder="BC-219..."
                />
              </FiltroCampo>

              <FiltroCampo label="Área">
                <input
                  type="text"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full border rounded-2xl px-3 py-2 text-xs md:text-sm"
                  placeholder="Pátio, Britagem..."
                />
              </FiltroCampo>

              <FiltroCampo label="Inspetor">
                <input
                  type="text"
                  value={inspetor}
                  onChange={(e) => setInspetor(e.target.value)}
                  className="w-full border rounded-2xl px-3 py-2 text-xs md:text-sm"
                  placeholder="Nome do inspetor"
                />
              </FiltroCampo>

            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[0.7rem] md:text-xs text-slate-500">
                Empresa ID: <strong>{empresaId ?? "-"}</strong>{" "}
                {contratoId && (
                  <>
                    | Contrato ID: <strong>{contratoId}</strong>
                  </>
                )}
              </div>

              <div className="flex gap-2">
                <GhostButton
                  type="button"
                  onClick={() => {
                    setDataDe("")
                    setDataAte("")
                    setEquip("")
                    setArea("")
                    setInspetor("")
                  }}
                  disabled={loading}
                >
                  Limpar filtros
                </GhostButton>

                <PrimaryButton
                  type="button"
                  onClick={() => carregarInspecoes(1)}
                  disabled={loading}
                >
                  {loading ? "Carregando..." : "Buscar"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        </div>
      </Toolbar>

      {/* TABELA */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="bg-slate-100">
              <tr>
                <Th>ID</Th>
                <Th>Data</Th>
                <Th>Equip</Th>
                <Th>Área</Th>
                <Th>Inspetor</Th>
                <Th>Usuário</Th>
                <Th>Evidências</Th>
                <Th>GPS (lat / lng)</Th>
              </tr>
            </thead>
            <tbody>
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="text-center py-6 text-xs md:text-sm text-slate-500"
                  >
                    Nenhuma inspeção encontrada com os filtros atuais.
                  </td>
                </tr>
              )}

              {items.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => abrirDetalhes(row)}
                >
                  <Td>{row.id}</Td>
                  <Td>{formatDate(row.data || row.criado_em)}</Td>
                  <Td>{row.equip || "-"}</Td>
                  <Td>{row.area || "-"}</Td>
                  <Td>{row.inspetor || "-"}</Td>
                  <Td>
                    {row.usuario_nome
                      ? row.usuario_nome
                      : row.usuario_login || "-"}
                  </Td>
                  <Td className="text-center">
                    {row.evidencias_count > 0 ? row.evidencias_count : "-"}
                  </Td>
                  <Td>
                    {row.lat != null && row.lng != null
                      ? `${formatCoord(row.lat)} / ${formatCoord(row.lng)}`
                      : "-"}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINAÇÃO */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 md:px-4 md:py-3 bg-slate-50 border-t border-slate-200 text-[0.7rem] md:text-xs">
          <div>
            {total > 0 ? (
              <>
                Mostrando{" "}
                <strong>
                  {items.length} de {total}
                </strong>{" "}
                inspeções | Página{" "}
                <strong>
                  {page}/{totalPages}
                </strong>
              </>
            ) : (
              "Nenhum registro."
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => page > 1 && carregarInspecoes(page - 1)}
              disabled={loading || page <= 1}
              className="px-3 py-1 rounded-full border text-xs disabled:opacity-50"
            >
              &larr; Anterior
            </button>
            <button
              type="button"
              onClick={() =>
                page < totalPages && carregarInspecoes(page + 1)
              }
              disabled={loading || page >= totalPages}
              className="px-3 py-1 rounded-full border text-xs disabled:opacity-50"
            >
              Próxima &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE DETALHES */}
      {detalheAberto && (
        <DetalheInspecaoModal
          detalhe={detalhe}
          loading={detalheLoading}
          onClose={fecharDetalhes}
        />
      )}

      {oportunidadesAberto && (
        <OportunidadesModal
          correias={correias}
          correiaSelecionada={correiaSelecionada}
          setCorreiaSelecionada={setCorreiaSelecionada}
          oportunidades={oportunidades}
          oportunidadeDraft={oportunidadeDraft}
          carregarOportunidades={carregarOportunidades}
          toggleOportunidade={toggleOportunidade}
          salvarOportunidades={salvarOportunidades}
          oportunidadeErro={oportunidadeErro}
          oportunidadeLoading={oportunidadeLoading}
          oportunidadeSaving={oportunidadeSaving}
          alteracoesPendentes={alteracoesPendentes}
          mostrarExecutadas={mostrarExecutadas}
          setMostrarExecutadas={setMostrarExecutadas}
          formatDate={formatDate}
          onClose={() => setOportunidadesAberto(false)}
        />
      )}
    </Container>
  )
}

/* ===================== COMPONENTES AUXILIARES ===================== */

function Th({ children }) {
  return (
    <th className="px-3 py-2 md:px-4 md:py-3 text-left font-semibold text-slate-700 text-[0.7rem] md:text-xs whitespace-nowrap">
      {children}
    </th>
  )
}

function Td({ children }) {
  return (
    <td className="px-3 py-2 md:px-4 md:py-2 text-slate-800 text-[0.7rem] md:text-xs whitespace-nowrap">
      {children}
    </td>
  )
}

function FiltroCampo({ label, children }) {
  return (
    <div className="flex flex-col gap-1 min-w-[120px] flex-1 md:flex-none md:min-w-[150px]">
      <label className="text-[0.7rem] md:text-xs font-medium text-slate-700">
        {label}
      </label>
      {children}
    </div>
  )
}

function StatusBadge({ online }) {
  const base = "px-3 py-2 rounded-full text-xs font-semibold border"
  const statusClass = online
    ? "bg-green-100 border-green-300 text-green-800"
    : "bg-slate-200 border-slate-300 text-slate-700"
  return (
    <div className={[base, statusClass].join(" ")}>
      {online ? "Online" : "Offline"}
    </div>
  )
}

/* ===================== MODAL DE DETALHES ===================== */

function OportunidadesModal({
  correias,
  correiaSelecionada,
  setCorreiaSelecionada,
  oportunidades,
  oportunidadeDraft,
  carregarOportunidades,
  toggleOportunidade,
  salvarOportunidades,
  oportunidadeErro,
  oportunidadeLoading,
  oportunidadeSaving,
  alteracoesPendentes,
  mostrarExecutadas,
  setMostrarExecutadas,
  formatDate,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        <div className="border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm md:text-base font-semibold text-slate-900">
              Oportunidades de manutenção
            </h2>
            <p className="text-[0.7rem] md:text-xs text-slate-500">
              Selecione a correia e visualize oportunidades abertas ou executadas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-full border text-xs md:text-sm hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 overflow-auto">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px] flex-1">
              <div className="text-[0.7rem] font-semibold text-slate-700 mb-1">
                Correia / equipamento
              </div>
              <select
                value={correiaSelecionada}
                onChange={(e) => {
                  const v = e.target.value
                  setCorreiaSelecionada(v ? Number(v) : "")
                }}
                className="w-full border rounded-2xl px-3 py-2 text-xs md:text-sm bg-white"
              >
                <option value="">Selecione</option>
                {Array.isArray(correias) &&
                  correias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code || c.label} {c.label && c.code ? `- ${c.label}` : ""}
                    </option>
                  ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-[0.75rem] text-slate-700">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={mostrarExecutadas}
                onChange={(e) => setMostrarExecutadas(e.target.checked)}
              />
              Mostrar executadas
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => correiaSelecionada && carregarOportunidades(correiaSelecionada)}
                disabled={oportunidadeLoading}
                className="px-3 py-2 border rounded-2xl text-xs md:text-sm disabled:opacity-60"
              >
                Recarregar
              </button>
              <button
                type="button"
                onClick={salvarOportunidades}
                disabled={
                  alteracoesPendentes === 0 ||
                  oportunidadeSaving ||
                  oportunidadeLoading
                }
                className="px-4 py-2 rounded-2xl text-xs md:text-sm text-white bg-primary disabled:opacity-60"
              >
                {oportunidadeSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl divide-y divide-slate-200">
            {oportunidadeLoading && (
              <div className="p-3 text-center text-xs text-slate-600">
                Carregando oportunidades...
              </div>
            )}

            {!oportunidadeLoading && oportunidadeErro && (
              <div className="p-3 text-center text-xs text-red-700">{oportunidadeErro}</div>
            )}

            {!oportunidadeLoading &&
              !oportunidadeErro &&
              oportunidades.length === 0 && (
                <div className="p-3 text-center text-xs text-slate-500">
                  {correiaSelecionada
                    ? "Nenhuma oportunidade para esta correia."
                    : "Selecione uma correia para visualizar as oportunidades."}
                </div>
              )}

            {!oportunidadeLoading &&
              !oportunidadeErro &&
              oportunidades.map((op) => {
                const statusAtual = oportunidadeDraft[op.id] ?? op.status
                const marcado = (statusAtual || "").toLowerCase() === "executada"
                const isExecutada = marcado
                return (
                  <div
                    key={op.id}
                    className={`p-3 flex flex-col gap-1 ${isExecutada ? "bg-slate-100" : "bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1 min-w-[220px]">
                        <div className="font-semibold text-slate-900 text-xs md:text-sm flex items-center gap-2">
                          {op.titulo || `Oportunidade #${op.id}`}
                          {isExecutada && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[0.65rem]">
                              Executada
                            </span>
                          )}
                        </div>
                        <div className={`text-[0.7rem] md:text-xs ${isExecutada ? "text-slate-500" : "text-slate-600"}`}>
                          {op.descricao || "-"}
                        </div>
                        <div className="text-[0.65rem] text-slate-500">
                          Pág.: {op.pagina ?? "-"} | Registro: {op.registro_id ?? "-"} | Inspeção #{op.inspecao_id}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-[0.7rem] text-slate-700">
                        <div>
                          Critic.:{" "}
                          <span className="font-semibold">{op.critic || "-"}</span>
                        </div>
                        <div>
                          Gerado: {op.criado_em ? formatDate(op.criado_em) : "-"}
                        </div>
                        <label className="flex items-center gap-2 text-[0.75rem]">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={marcado}
                            onChange={(e) => toggleOportunidade(op.id, e.target.checked)}
                          />
                          Executada
                        </label>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[0.7rem] text-slate-600">
            <div>
              {alteracoesPendentes > 0
                ? `${alteracoesPendentes} alteração(ões) pendente(s) para salvar.`
                : "Nenhuma alteração pendente."}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => correiaSelecionada && carregarOportunidades(correiaSelecionada)}
                disabled={oportunidadeLoading}
                className="px-3 py-2 border rounded-2xl text-xs md:text-sm disabled:opacity-60"
              >
                Atualizar lista
              </button>
              <button
                type="button"
                onClick={salvarOportunidades}
                disabled={
                  alteracoesPendentes === 0 ||
                  oportunidadeSaving ||
                  oportunidadeLoading
                }
                className="px-4 py-2 rounded-2xl text-xs md:text-sm text-white bg-primary disabled:opacity-60"
              >
                {oportunidadeSaving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===================== MODAL DE DETALHES ===================== */

function DetalheInspecaoModal({ detalhe, loading, onClose }) {
  const [secaoAtiva, setSecaoAtiva] = React.useState("pagina1_rolos")
  const [camposPorSecao, setCamposPorSecao] = React.useState({})
  const [camposLoading, setCamposLoading] = React.useState(false)

  const insp = detalhe?.inspecao
  const resumo = detalhe?.resumo || {}

  const pagina1 = resumo.pagina1 || {}
  const pag2 = resumo.pagina2 || {}
  const pagina3 = resumo.pagina3 || {}
  const pagina4 = resumo.pagina4 || {}
  const pagina5 = resumo.pagina5 || {}

  const dadosPagina = {
    pagina1_rolos: detalhe?.pagina1?.rolos || [],
    pagina2_calhas: detalhe?.pagina2?.calhas || [],
    pagina2_vedacao: detalhe?.pagina2?.vedacao || [],
    pagina2_raspadores: detalhe?.pagina2?.raspadores || [],
    pagina2_mesas: detalhe?.pagina2?.mesas || [],
    pagina3_correias: detalhe?.pagina3?.correias || [],
    pagina4_tambores: detalhe?.pagina4?.tambores || [],
    pagina5_estruturas: detalhe?.pagina5?.estruturas || [],
    evidencias: detalhe?.evidencias || [],
  }

  React.useEffect(() => {
    let cancelled = false
    async function loadCampos() {
      setCamposLoading(true)
      try {
        const res = await fetch(`${API_BASE || ""}/api/ui/inspecao-campos`)
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
        if (!cancelled) setCamposPorSecao(data || {})
      } catch (err) {
        console.error("[ui] erro ao carregar defini��o de campos:", err)
        if (!cancelled) toast.error("N�o foi poss�vel carregar colunas din�micas.")
      } finally {
        if (!cancelled) setCamposLoading(false)
      }
    }
    loadCampos()
    return () => {
      cancelled = true
    }
  }, [])

  const gruposCatalogo = React.useMemo(() => {
    const set = new Set()
    Object.values(camposPorSecao || {}).forEach((lista) => {
      if (!Array.isArray(lista)) return
      lista.forEach((c) => {
        if (c.grupo) set.add(c.grupo)
      })
    })
    return Array.from(set)
  }, [camposPorSecao])

  const { data: catalogosBatch } = useCatalogBatch(gruposCatalogo)

  const catalogosMap = React.useMemo(() => {
    const out = {}
    if (catalogosBatch && typeof catalogosBatch === "object") {
      Object.entries(catalogosBatch).forEach(([grupo, arr]) => {
        out[grupo] = {}
        if (Array.isArray(arr)) {
          arr.forEach((item) => {
            out[grupo][item.code] = item.label
          })
        }
      })
    }
    return out
  }, [catalogosBatch])

  const formatDate = (iso) => {
    if (!iso) return ""
    try {
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return iso
      return d.toLocaleDateString("pt-BR")
    } catch {
      return iso
    }
  }

  const formatCoord = (v) => {
    if (v == null) return ""
    const n = Number(v)
    if (Number.isNaN(n)) return String(v)
    return n.toFixed(5)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
        {/* Cabeçalho */}
        <div className="border-b border-slate-200 px-4 py-3 md:px-6 md:py-4 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 className="text-sm md:text-base font-semibold text-slate-900">
              {insp
                ? `Detalhes da inspeção #${insp.id}`
                : "Detalhes da inspeção"}
            </h2>
            {insp && (
              <p className="text-[0.7rem] md:text-xs text-slate-500">
                {insp.data ? formatDate(insp.data) : "-"} · Equip:{" "}
                <span className="font-medium">{insp.equip || "-"}</span> · Área:{" "}
                <span className="font-medium">{insp.area || "-"}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-full border text-xs md:text-sm hover:bg-slate-50"
          >
            Fechar
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto px-4 py-4 md:px-6 md:py-6 space-y-6 text-[0.75rem] md:text-xs">
          {loading && (
            <div className="text-center text-slate-500 py-6">
              Carregando detalhes da inspeção...
            </div>
          )}

          {!loading && insp && (
            <>
              {/* INFO GERAL + LOCALIZAÇÃO */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">
                    INFORMAÇÕES GERAIS
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">Inspetor: </span>
                      {insp.inspetor || "-"}
                    </div>
                    <div>
                      <span className="font-medium">Usuário: </span>
                      {insp.usuario?.nome || insp.usuario?.login || "-"}
                    </div>
                    <div>
                      <span className="font-medium">Empresa: </span>
                      {insp.empresa?.nome || "-"}
                    </div>
                    <div>
                      <span className="font-medium">Contrato: </span>
                      {insp.contrato?.nome || "-"}
                    </div>
                    <div>
                      <span className="font-medium">Criado em: </span>
                      {insp.criado_em ? formatDate(insp.criado_em) : "-"}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">
                    LOCALIZAÇÃO
                  </h3>
                  <div className="space-y-1">
                    <div>
                      <span className="font-medium">GPS (lat / lng): </span>
                      {insp.lat != null && insp.lng != null
                        ? `${formatCoord(insp.lat)} / ${formatCoord(insp.lng)}`
                        : "-"}
                    </div>
                    <div>
                      <span className="font-medium">Precisão: </span>
                      {insp.gps_accuracy != null
                        ? `${insp.gps_accuracy} m`
                        : "-"}
                    </div>
                  </div>
                </div>
              </div>



              {/* OPORTUNIDADES DE MANUTENCAO */}
              {/* RESUMO POR PÁGINA – AGORA CLICÁVEL */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  RESUMO POR PÁGINA
                </h3>
                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <CardResumo
                    titulo="PÁG. 1 — ROLOS"
                    valor={pagina1.comDados ?? 0}
                    total={pagina1.total ?? 0}
                    active={secaoAtiva === "pagina1_rolos"}
                    onClick={() => setSecaoAtiva("pagina1_rolos")}
                  />
                  <CardResumo
                    titulo="PÁG. 2 — CALHAS"
                    valor={pag2.calhas?.comDados ?? 0}
                    total={pag2.calhas?.total ?? 0}
                    active={secaoAtiva === "pagina2_calhas"}
                    onClick={() => setSecaoAtiva("pagina2_calhas")}
                  />
                  <CardResumo
                    titulo="PÁG. 2 — VEDAÇÃO"
                    valor={pag2.vedacao?.comDados ?? 0}
                    total={pag2.vedacao?.total ?? 0}
                    active={secaoAtiva === "pagina2_vedacao"}
                    onClick={() => setSecaoAtiva("pagina2_vedacao")}
                  />
                  <CardResumo
                    titulo="PÁG. 2 — RASPADORES"
                    valor={pag2.raspadores?.comDados ?? 0}
                    total={pag2.raspadores?.total ?? 0}
                    active={secaoAtiva === "pagina2_raspadores"}
                    onClick={() => setSecaoAtiva("pagina2_raspadores")}
                  />
                  <CardResumo
                    titulo="PÁG. 2 — MESAS"
                    valor={pag2.mesas?.comDados ?? 0}
                    total={pag2.mesas?.total ?? 0}
                    active={secaoAtiva === "pagina2_mesas"}
                    onClick={() => setSecaoAtiva("pagina2_mesas")}
                  />
                  <CardResumo
                    titulo="PÁG. 3 — CORREIA"
                    valor={pagina3.comDados ?? 0}
                    total={pagina3.total ?? 0}
                    active={secaoAtiva === "pagina3_correias"}
                    onClick={() => setSecaoAtiva("pagina3_correias")}
                  />
                  <CardResumo
                    titulo="PÁG. 4 — TAMBORES"
                    valor={pagina4.comDados ?? 0}
                    total={pagina4.total ?? 0}
                    active={secaoAtiva === "pagina4_tambores"}
                    onClick={() => setSecaoAtiva("pagina4_tambores")}
                  />
                  <CardResumo
                    titulo="PÁG. 5 — ESTRUTURAS"
                    valor={pagina5.comDados ?? 0}
                    total={pagina5.total ?? 0}
                    active={secaoAtiva === "pagina5_estruturas"}
                    onClick={() => setSecaoAtiva("pagina5_estruturas")}
                  />
                  <CardResumo
                    titulo="EVIDÊNCIAS"
                    valor={resumo.evidencias ?? 0}
                    total={resumo.evidencias ?? 0}
                    active={secaoAtiva === "evidencias"}
                    onClick={() => setSecaoAtiva("evidencias")}
                  />
                </div>
              </div>

              {/* DETALHES DA SEÇÃO SELECIONADA */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-2">
                  Detalhes da seção selecionada
                </h3>
                {camposLoading && (
                  <div className="text-slate-500 text-[0.7rem] mb-2">
                    Carregando colunas dinâmicas...
                  </div>
                )}
                <TabelaSecao
                  secao={secaoAtiva}
                  dados={dadosPagina[secaoAtiva] || []}
                  camposPorSecao={camposPorSecao}
                  catalogos={catalogosMap}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Card de resumo – agora clicável e com estado "ativo"
 */
function CardResumo({ titulo, valor, total, active, onClick }) {
  const showTotal = total != null && total !== valor
  const base =
    "border rounded-2xl px-3 py-2 md:px-4 md:py-3 bg-white flex flex-col gap-1 cursor-pointer transition-colors"
  const activeClass = active
    ? "border-primary bg-blue-50"
    : "border-slate-200 hover:bg-slate-50"

  return (
    <button type="button" className={`${base} ${activeClass}`} onClick={onClick}>
      <div className="text-[0.65rem] md:text-[0.7rem] text-slate-500 uppercase tracking-wide text-left">
        {titulo}
      </div>
      <div className="text-base md:text-lg font-semibold text-slate-900 text-left">
        {valor ?? 0}
      </div>
      {showTotal && (
        <div className="text-[0.65rem] md:text-[0.7rem] text-slate-400 text-left">
          de {total} linha(s) salvas
        </div>
      )}
    </button>
  )
}

    /* Renderiza a tabela correspondente à seção ativa
 */
function TabelaSecao({ secao, dados, camposPorSecao, catalogos }) {
  const joinArr = (v) => (Array.isArray(v) && v.length ? v.join(", ") : "-")

  const mapCatalogo = (value, grupo, isArray = false) => {
    const labels = catalogos?.[grupo]
    if (!labels) {
      if (isArray) return joinArr(value)
      return value ?? "-"
    }

    if (isArray) {
      const arr = Array.isArray(value) ? value : value ? [value] : []
      if (!arr.length) return "-"
      return arr.map((code) => labels[code] || code).join(", ")
    }

    if (value === undefined || value === null || value === "") return "-"
    return labels[value] || value
  }

  const formatValor = (raw, def = {}) => {
    if (def.grupo) return mapCatalogo(raw, def.grupo, def.isArray)
    if (def.isArray) return joinArr(raw)
    if (typeof raw === "boolean") return raw ? "Sim" : "Não"
    if (raw === undefined || raw === null || raw === "") return "-"
    return raw
  }

  const camposDinamicos = camposPorSecao?.[secao]

  if (!dados || dados.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 rounded-2xl px-4 py-6 text-center text-slate-500">
        Nenhum registro com dados preenchidos nesta seção.
      </div>
    )
  }

  if (Array.isArray(camposDinamicos) && camposDinamicos.length) {
    return (
      <TabelaPadrao
        columns={camposDinamicos.map((c) => ({
          key: c.campo,
          label: c.label || c.campo,
          render: (v, row) => formatValor(row[c.campo], c),
        }))}
        rows={dados}
      />
    )
  }

  // fallback para definição estática caso API falhe ou não retorne
  if (secao === "pagina1_rolos") {
    return (
      <TabelaPadrao
        columns={[
          { key: "baliza", label: "Baliza" },
          { key: "limp", label: "Limpeza" },
          { key: "critic", label: "Crítico" },
          { key: "carga_E", label: "Carga E", render: joinArr },
          { key: "carga_C", label: "Carga C", render: joinArr },
          { key: "carga_D", label: "Carga D", render: joinArr },
        ]}
        rows={dados}
      />
    )
  }

  if (secao === "pagina2_calhas") {
    return (
      <TabelaPadrao
        columns={[
          { key: "ponto_transferencia", label: "Ponto transf." },
          { key: "letra", label: "Letra" },
          { key: "critic", label: "Crítico" },
          { key: "limpeza", label: "Limpeza" },
          { key: "pontos", label: "Pontos", render: joinArr },
          { key: "item", label: "Item", render: joinArr },
          { key: "dano", label: "Dano", render: joinArr },
          { key: "servico", label: "Serviço", render: joinArr },
        ]}
        rows={dados}
      />
    )
  }

  if (secao === "pagina2_vedacao") {
    return (
      <TabelaPadrao
        columns={[
          { key: "ponto_carga", label: "Ponto carga" },
          { key: "critic", label: "Crítico" },
          { key: "limpeza", label: "Limpeza" },
          { key: "posicao", label: "Posição", render: joinArr },
          { key: "item", label: "Item", render: joinArr },
          { key: "dano", label: "Dano", render: joinArr },
          { key: "servico", label: "Serviço", render: joinArr },
        ]}
        rows={dados}
      />
    )
  }

  if (secao === "pagina2_raspadores") {
    return (
      <TabelaPadrao
        columns={[
          { key: "ponto_baliza", label: "Ponto/Baliza" },
          { key: "critic", label: "Crítico" },
          { key: "limpeza", label: "Limpeza" },
          { key: "posicao", label: "Posição", render: joinArr },
          { key: "item", label: "Item", render: joinArr },
          { key: "dano", label: "Dano", render: joinArr },
          { key: "servico", label: "Serviço", render: joinArr },
        ]}
        rows={dados}
      />
    )
  }

  if (secao === "pagina2_mesas") {
    return (
      <TabelaPadrao
        columns={[
          { key: "ponto_carga", label: "Ponto carga" },
          { key: "modelo", label: "Modelo" },
          { key: "critic", label: "Crítico" },
          { key: "limpeza", label: "Limpeza" },
          { key: "posicao", label: "Posição", render: joinArr },
          { key: "item", label: "Item", render: joinArr },
          { key: "dano", label: "Dano", render: joinArr },
          { key: "servico", label: "Serviço", render: joinArr },
        ]}
        rows={dados}
      />
    )
  }

  if (secao === "pagina3_correias") {
    return (
      <TabelaPadrao
        columns={[
          { key: "baliza", label: "Baliza" },
          { key: "tramo", label: "Tramo" },
          { key: "lado", label: "Lado" },
          { key: "tipo", label: "Tipo" },
          { key: "critic", label: "Crítico" },
          { key: "desalinhada", label: "Desalinhada" },
          { key: "eh_emenda", label: "É emenda", render: (v) => (v ? "Sim" : "Não") },
          { key: "tipo_emenda", label: "Tipo emenda" },
          { key: "cond_emenda", label: "Cond. emenda" },
          { key: "grampos_faltando", label: "Grampos faltando" },
          { key: "dano", label: "Dano", render: joinArr },
          { key: "servico", label: "Serviço", render: joinArr },
        ]}
        rows={dados}
      />
    )
  }

  if (secao === "pagina4_tambores") {
    return (
      <TabelaPadrao
        columns={[
          { key: "tambor", label: "Tambor" },
          { key: "critic", label: "Crítico" },
          { key: "revest_dano", label: "Revest. dano", render: joinArr },
          { key: "revest_servico", label: "Revest. serviço", render: joinArr },
          { key: "carcaca_dano", label: "Carcaça dano", render: joinArr },
          { key: "carcaca_servico", label: "Carcaça serv.", render: joinArr },
          { key: "mancais_sintomas", label: "Mancais sint.", render: joinArr },
          { key: "mancais_causas", label: "Mancais causas", render: joinArr },
          { key: "obs", label: "Obs." },
        ]}
        rows={dados}
      />
    )
  }

  if (secao === "pagina5_estruturas") {
    return (
      <TabelaPadrao
        columns={[
          { key: "parte", label: "Parte" },
          { key: "local", label: "Local" },
          { key: "critic", label: "Crítico" },
          { key: "limpeza", label: "Limpeza" },
          { key: "elementos", label: "Elementos", render: joinArr },
          { key: "dano", label: "Dano", render: joinArr },
          { key: "servico", label: "Serviço", render: joinArr },
          { key: "obs", label: "Obs." },
        ]}
        rows={dados}
      />
    )
  }

  if (secao === "evidencias") {
    return (
      <TabelaPadrao
        columns={[
          { key: "pagina", label: "Pág." },
          { key: "secao", label: "Seção" },
          { key: "baliza", label: "Baliza" },
          { key: "ponto", label: "Ponto" },
          { key: "linha", label: "Linha" },
          { key: "coluna", label: "Coluna" },
          { key: "original_name", label: "Arquivo" },
          { key: "mime_type", label: "Tipo" },
          { key: "tamanho_bytes", label: "Tamanho (bytes)" },
        ]}
        rows={dados}
      />
    )
  }

  // fallback
  return (
    <TabelaPadrao
      columns={Object.keys(dados[0] || {}).map((k) => ({
        key: k,
        label: k,
      }))}
      rows={dados}
    />
  )
}

/**
 * Tabela genérica usada pelas seções
 */
function TabelaPadrao({ columns, rows }) {
  return (
    <div className="border border-slate-200 rounded-2xl overflow-auto">
      <table className="min-w-full text-[0.7rem] md:text-xs">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id ?? `${r.pagina}-${r.secao}-${r.original_name}`} className="border-t border-slate-100">
              {columns.map((c) => {
                const raw = r[c.key]
                const value = c.render ? c.render(raw, r) : raw ?? "-"
                return (
                  <td
                    key={c.key}
                    className="px-3 py-1.5 text-slate-800 whitespace-nowrap"
                  >
                    {value === "" ? "-" : String(value)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

