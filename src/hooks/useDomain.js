"use client";

import { useEffect, useState } from "react";
import {
  getCachedResponse,
  setCachedResponse,
} from "../lib/offlineApiCache.js";

// Base da API (Vite usa import.meta.env.*)
const API_BASE = import.meta.env.VITE_API_BASE || "";

function useFetch(url, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!enabled);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled || !url) return;

    const cacheKey = `GET:${url}`;
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const cached = await getCachedResponse(cacheKey);
        if (!cancelled && cached?.data) {
          setData(cached.data);
        }
      } catch (err) {
        console.warn("[useFetch] falha ao ler cache:", err);
      }

      const online =
        typeof navigator === "undefined" ? true : navigator.onLine !== false;
      if (!online) {
        setLoading(false);
        setError(new Error("offline"));
        return;
      }

      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setData(json);
        setCachedResponse(cacheKey, json).catch(() => {});
      } catch (err) {
        if (!cancelled) setError(err);
        console.error("[useFetch] erro:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [url, enabled, typeof navigator === "undefined" ? true : navigator.onLine]);

  return { data, loading, error };
}

// ---------- DOMÍNIOS BÁSICOS ---------- //

export function useAreas() {
  return useFetch(`${API_BASE}/api/dominios/areas`);
}

export function useCorreias(areaId) {
  const url = areaId
    ? `${API_BASE}/api/dominios/correias?area_id=${encodeURIComponent(areaId)}`
    : `${API_BASE}/api/dominios/correias`;
  return useFetch(url);
}

export function useBalizas(correiaId) {
  const enabled = Number.isInteger(correiaId) && correiaId > 0;
  const url = enabled
    ? `${API_BASE}/api/dominios/correias/${correiaId}/balizas`
    : null;
  return useFetch(url, { enabled });
}

// Não estamos usando todos, mas já deixo prontos
export function useTramos() {
  return useFetch(`${API_BASE}/api/dominios/tramos`);
}

export function useLados() {
  return useFetch(`${API_BASE}/api/dominios/lados`);
}

export function useTiposCorreia() {
  return useFetch(`${API_BASE}/api/dominios/tipos-correia`);
}

export function useModelosMesa() {
  return useFetch(`${API_BASE}/api/dominios/modelos-mesa`);
}

/**
 * Auto-preenche o campo de área com base no equipamento selecionado.
 * Tenta diversos campos de área na correia e, se houver lista de áreas, converte id -> code.
 */
export function useAutoFillArea({
  correias,
  areas, // opcional: lista de áreas {id, code, label}
  equipCode,
  currentArea,
  onChange,
}) {
  useEffect(() => {
    if (!equipCode || !Array.isArray(correias) || !onChange) return;
    const match = correias.find((c) => c.code === equipCode);
    if (!match) return;

    const areaIdRaw = match.area_id ?? match.areaId;
    const areaCodeFromMatch =
      match.area_code ??
      match.areaCode ??
      match.area_nome ??
      match.areaName ??
      match.area;

    let areaValue = areaCodeFromMatch;

    // Se não veio código, tenta mapear o id para o code da lista de áreas
    if (!areaValue && areaIdRaw != null && Array.isArray(areas)) {
      const areaId = Number(areaIdRaw);
      const areaObj = areas.find((a) => Number(a.id) === areaId);
      if (areaObj) {
        areaValue = areaObj.code || areaObj.label || areaObj.id;
      }
    }

    if (areaValue && areaValue !== currentArea) {
      onChange(areaValue);
    }
  }, [equipCode, correias, areas, currentArea, onChange]);
}

// ---------- HELPER PARA OPTIONS EM SELECT ---------- //

/**
 * Converte [{code,label}] em [{value,label}] para <select> / ResponsiveHeader.
 */
export function toOptions(list, { valueKey = "code", labelKey = "label" } = {}) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({
    value: item[valueKey],
    label: item[labelKey],
  }));
}
