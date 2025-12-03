import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import path from "path"

const {
  AWS_S3_BUCKET,
  AWS_S3_PREFIX = "inspecoes",
  AWS_S3_ENDPOINT,
  AWS_S3_PUBLIC_URL,
  AWS_S3_ACL,
  AWS_S3_FORCE_PATH_STYLE,
  AWS_REGION,
  AWS_DEFAULT_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
} = process.env

const REGION = AWS_REGION || AWS_DEFAULT_REGION || "us-east-1"

const s3Client = new S3Client({
  region: REGION,
  endpoint: AWS_S3_ENDPOINT || undefined,
  forcePathStyle:
    AWS_S3_FORCE_PATH_STYLE === "true" ||
    AWS_S3_FORCE_PATH_STYLE === "1" ||
    AWS_S3_FORCE_PATH_STYLE === "yes",
  credentials:
    AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY
      ? { accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY }
      : undefined,
})

function buildKey(ext) {
  const safePrefix = (AWS_S3_PREFIX || "").replace(/^\/+|\/+$/g, "")
  const baseName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  return safePrefix ? `${safePrefix}/${baseName}` : baseName
}

export async function upload({ buffer, mimeType, originalName }) {
  if (!AWS_S3_BUCKET) {
    throw new Error("AWS_S3_BUCKET não configurado para STORAGE_DRIVER=s3")
  }

  const fallbackExt = path.extname(originalName || "").replace(".", "") || "bin"
  const extFromMime = mimeType?.split("/")?.[1]
  const ext = extFromMime || fallbackExt || "bin"
  const key = buildKey(ext)

  const params = {
    Bucket: AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType || "application/octet-stream",
  }

  if (AWS_S3_ACL) params.ACL = AWS_S3_ACL

  await s3Client.send(new PutObjectCommand(params))

  const baseUrl =
    AWS_S3_PUBLIC_URL?.replace(/\/+$/, "") ||
    (AWS_S3_ENDPOINT
      ? `${AWS_S3_ENDPOINT.replace(/\/+$/, "")}/${AWS_S3_BUCKET}`
      : `https://${AWS_S3_BUCKET}.s3.${REGION}.amazonaws.com`)

  const url = `${baseUrl}/${key}`

  return {
    url,
    path: key,
    fileName: path.basename(key),
    mimeType,
  }
}
