import React from "react"
import { Toaster } from "react-hot-toast"
import MainApp from "./MainApp.jsx"
import LoginScreen from "./LoginScreen.jsx"
import ControleInspecoes from "./ControleInspecoes.jsx"
import "./index.css"

export default function App() {
  const [user, setUser] = React.useState(null)
  const [bootDone, setBootDone] = React.useState(false)
  const [view, setView] = React.useState("form") // "form" | "controle"

  // Carrega usuário salvo no localStorage (para permitir uso offline)
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("inspecao_user")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && parsed.id) {
          setUser(parsed)
        }
      }
    } catch (e) {
      console.warn("Erro ao ler usuário salvo:", e)
    } finally {
      setBootDone(true)
    }
  }, [])

  function handleLogin(u) {
    setUser(u)
    setView("form")
  }

  function handleLogout() {
    setUser(null)
    setView("form")
    try {
      localStorage.removeItem("inspecao_user")
    } catch {}
  }

  if (!bootDone) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-600">
          Carregando…
        </div>
        <Toaster position="top-right" />
      </>
    )
  }

  return (
    <>
      <Toaster position="top-right" />
      {user ? (
        view === "form" ? (
          <MainApp
            user={user}
            onLogout={handleLogout}
            onNavigateControle={() => setView("controle")}
          />
        ) : (
          <ControleInspecoes
            user={user}
            onBackToForm={() => setView("form")}
            onLogout={handleLogout}
          />
        )
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </>
  )
}
