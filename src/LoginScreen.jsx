"use client"

import React from "react"
import toast from "react-hot-toast"

const API_BASE = import.meta.env.VITE_API_BASE || ""

export default function LoginScreen({ onLogin }) {
  const [login, setLogin] = React.useState("")
  const [senha, setSenha] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return

    // Se ainda não há usuário salvo e está offline, não tem como autenticar
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error(
        "Sem conexão com o servidor. Para o primeiro acesso, é necessário estar online.",
      )
      return
    }

    if (!login || !senha) {
      toast.error("Informe login e senha.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_BASE || ""}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, senha }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data?.success) {
        const msg = data?.error || "Login ou senha inválidos."
        toast.error(msg)
        return
      }

      const user = data.user
      // salva no localStorage pra poder usar offline depois
      localStorage.setItem("inspecao_user", JSON.stringify(user))
      toast.success("Login realizado com sucesso!")
      onLogin?.(user)
    } catch (err) {
      console.error("[login] erro:", err)
      toast.error("Erro ao conectar no servidor.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">
            Formulário de Inspeção Mecânica
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Acesse com seu usuário para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Login
            </label>
            <input
              type="text"
              className="w-full border rounded-2xl px-3 py-2 text-sm"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              className="w-full border rounded-2xl px-3 py-2 text-sm"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-primary text-white py-2 text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <p className="text-[0.7rem] text-slate-500 text-center mt-2">
            Após um login bem-sucedido neste dispositivo, você poderá usar o
            aplicativo offline sem precisar logar novamente.
          </p>
        </form>
      </div>
    </div>
  )
}
