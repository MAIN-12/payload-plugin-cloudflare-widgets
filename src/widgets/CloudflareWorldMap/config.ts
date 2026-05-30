import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareWorldMapWidget = {
  slug: 'cloudflare-world-map',
  label: 'World Traffic Map',
  Component: '@main12/payload-cloudflare-widgets/widgets/cloudflare-world-map',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'medium',
  maxWidth: 'full',
} satisfies Widget & { imageURL?: string }
