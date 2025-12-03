"use client";

import { useEffect, useState } from "react";
import { getCachedResponse, setCachedResponse } from "../lib/offlineApiCache.js";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function useFetch(url, { method = "GET", body = null, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !url) return;

    const cacheKey = `${method}:${url}:${body ? JSON.stringify(body) : ""}`;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      // Tenta servir do cache imediatamente
      try {
        const cached = await getCachedResponse(cacheKey);
        if (!cancelled && cached?.data) {
          setData(cached.data);
        }
      } catch (err) {
        console.warn("[useCatalog] falha ao ler cache:", err);
      }

      const online =
        typeof navigator === "undefined" ? true : navigator.onLine !== false;
      if (!online) {
        setLoading(false);
        setError(new Error("offline"));
        return;
      }

      const opts = { method, headers: {} };
      if (body) {
        opts.headers["Content-Type"] = "application/json";
        opts.body = JSON.stringify(body);
      }

      try {
        const res = await fetch(url, opts);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
        setCachedResponse(cacheKey, json).catch(() => {});
      } catch (err) {
        if (!cancelled) setError(err);
        console.error("[useCatalog] erro:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [url, method, enabled, JSON.stringify(body), typeof navigator === "undefined" ? true : navigator.onLine]);

  return { data, loading, error };
}

/**
 * Catálogo único: /api/catalogos?grupo=XXX
 * Retorna sempre [{code, label}]
 */
export function useCatalog(grupo) {
  const enabled = Boolean(grupo);
  const url = enabled
    ? `${API_BASE}/api/catalogos?grupo=${encodeURIComponent(grupo)}`
    : null;
  return useFetch(url, { enabled });
}

/**
 * Batch de catálogos:
 * POST /api/catalogos/batch { grupos: [...] }
 * Retorno: { grupoA: [{code,label}], grupoB: [...] }
 */
export function useCatalogBatch(grupos = []) {
  const enabled = Array.isArray(grupos) && grupos.length > 0;
  const url = `${API_BASE}/api/catalogos/batch`;
  return useFetch(url, { method: "POST", body: { grupos }, enabled });
}
