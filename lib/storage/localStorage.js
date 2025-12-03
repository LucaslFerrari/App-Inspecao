import fs from "fs"
import path from "path"
import { UPLOADS_DIR } from "../../src/server/config/env.js"

// pasta onde os arquivos vão ficar
const UPLOAD_DIR = UPLOADS_DIR

// cria diretório se não existir
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

export async function upload({ buffer, mimeType, originalName }) {
  const ext = mimeType.split("/")[1] || "bin"

  const fileName =
    Date.now() + "-" + Math.random().toString(36).slice(2) + "." + ext

  const filePath = path.join(UPLOAD_DIR, fileName)

  await fs.promises.writeFile(filePath, buffer)

  return {
    url: `/uploads/${fileName}`,     // URL pública que serviremos no Express
    path: filePath,                  // caminho do arquivo
    fileName,
    mimeType,
  }
}
