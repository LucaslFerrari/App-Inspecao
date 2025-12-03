"use client"

import { useEffect, useState } from "react"

export function useOnlineStatus() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine !== false,
  )

  useEffect(() => {
    function update() {
      setOnline(typeof navigator === "undefined" ? true : navigator.onLine !== false)
    }
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  return online
}