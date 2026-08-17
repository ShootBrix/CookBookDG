/**
 * Client-side pipeline for recipe photo uploads. Raw uploads are never
 * stored as-is: everything is downscaled and re-encoded in the browser
 * before it reaches the CookbookStore.
 */

const ACCEPTED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_EDGE_PX = 1200
const ENCODE_QUALITY = 0.8

/** Reject a processed image if it's still this large after downscaling. */
export const MAX_PROCESSED_IMAGE_BYTES = 600 * 1024

export type ProcessedImage = {
  dataUrl: string
  width: number
  height: number
  bytes: number
}

export type ProcessImageErrorCode =
  'invalid-type' | 'decode-failed' | 'too-large'

export type ProcessImageResult =
  | { ok: true; image: ProcessedImage }
  | { ok: false; code: ProcessImageErrorCode }

/** Downscales + re-encodes a single file. Never throws. */
export async function processImageFile(
  file: File,
): Promise<ProcessImageResult> {
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return { ok: false, code: 'invalid-type' }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const decoded = await decodeImage(objectUrl)
    if (!decoded) return { ok: false, code: 'decode-failed' }

    const { width, height } = scaledDimensions(
      decoded.naturalWidth,
      decoded.naturalHeight,
    )
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return { ok: false, code: 'decode-failed' }
    ctx.drawImage(decoded, 0, 0, width, height)

    const dataUrl = encodeCanvas(canvas)
    const bytes = estimateDataUrlBytes(dataUrl)
    if (bytes > MAX_PROCESSED_IMAGE_BYTES) {
      return { ok: false, code: 'too-large' }
    }

    return { ok: true, image: { dataUrl, width, height, bytes } }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function decodeImage(src: string): Promise<HTMLImageElement | null> {
  const img = new Image()
  img.src = src
  try {
    await img.decode()
    return img
  } catch {
    return null
  }
}

function scaledDimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  const longestEdge = Math.max(width, height)
  if (longestEdge <= MAX_EDGE_PX) return { width, height }
  const scale = MAX_EDGE_PX / longestEdge
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
}

function encodeCanvas(canvas: HTMLCanvasElement): string {
  const webp = canvas.toDataURL('image/webp', ENCODE_QUALITY)
  if (webp.startsWith('data:image/webp')) return webp
  return canvas.toDataURL('image/jpeg', ENCODE_QUALITY)
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}
