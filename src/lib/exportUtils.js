"use client"

export const statusFromCritic = (value) => {
  if (value === "1") return "Crítico"
  if (value === "2") return "Atenção"
  if (value === "3") return "Revisar"
  return "OK"
}

export const buildMetadataRows = ({ inspetor = "", data = "", equip = "", area = "", extra = [] } = {}) => {
  const rows = [
    ["Inspetor", inspetor || "-"],
    ["Data", data || "-"],
    ["Equipamento", equip || "-"],
    ["Área", area || "-"],
    ...extra,
  ]
  rows.push([])
  return rows
}

export const sanitizeSheetName = (name) => {
  const safe = (name || "Sheet").replace(/[\[\]:\\/?*]/g, "").slice(0, 31)
  return safe || "Sheet"
}
