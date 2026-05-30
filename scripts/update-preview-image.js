#!/usr/bin/env node
// Usage: node scripts/update-preview-image.js <path-to-image>
// Replaces the CLOUDFLARE_WIDGET_PREVIEW constant in src/widgets/previewImage.ts
// with a base64 data URI of the given image file.

import { readFileSync, writeFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'

const imagePath = process.argv[2]
if (!imagePath) {
  console.error('Usage: node scripts/update-preview-image.js <path-to-image>')
  process.exit(1)
}

const absPath = resolve(imagePath)
const ext = extname(absPath).toLowerCase()

const mimeTypes = {
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

const mime = mimeTypes[ext]
if (!mime) {
  console.error(`Unsupported file type: ${ext}`)
  console.error(`Supported: ${Object.keys(mimeTypes).join(', ')}`)
  process.exit(1)
}

const bytes = readFileSync(absPath)
const b64 = bytes.toString('base64')
const dataUri = `data:${mime};base64,${b64}`

const targetPath = new URL('../src/widgets/previewImage.ts', import.meta.url).pathname.replace(
  /^\/([A-Z]:)/,
  '$1',
)
let source = readFileSync(targetPath, 'utf8')

// Replace the value of CLOUDFLARE_WIDGET_PREVIEW (any existing data URI or string)
source = source.replace(
  /(export const CLOUDFLARE_WIDGET_PREVIEW\s*=\s*)(['"`]).*?\2/s,
  `$1'${dataUri}'`,
)

writeFileSync(targetPath, source, 'utf8')
console.log(
  `Updated CLOUDFLARE_WIDGET_PREVIEW with ${ext} image (${bytes.length} bytes → ${b64.length} chars base64)`,
)
