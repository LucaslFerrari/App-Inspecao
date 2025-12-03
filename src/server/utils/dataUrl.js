export function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return null;

  const match = /^data:(.+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;

  const mimeType = match[1];
  const base64 = match[2];

  try {
    const buffer = Buffer.from(base64, "base64");
    return { mimeType, buffer };
  } catch (err) {
    console.error("[parseDataUrl] Erro ao decodificar dataUrl:", err);
    return null;
  }
}
