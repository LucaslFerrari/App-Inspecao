import { upload as uploadLocal } from "./localStorage.js"
// import { upload as uploadSharepoint } from "./sharepointStorage.js"

const DRIVER = (process.env.STORAGE_DRIVER || "local").toLowerCase()

export async function storageUpload(fileInfo) {
  if (DRIVER === "local") {
    return uploadLocal(fileInfo)
  }
  if (DRIVER === "s3") {
    const { upload } = await import("./s3Storage.js")
    return upload(fileInfo)
  }
  // else if (DRIVER === "sharepoint") return uploadSharepoint(fileInfo)

  throw new Error(`STORAGE_DRIVER desconhecido: ${DRIVER}`)
}
