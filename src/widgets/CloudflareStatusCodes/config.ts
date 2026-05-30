import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareStatusCodesWidget = {
  slug: 'cloudflare-status-codes',
  label: 'Cloudflare Status Codes',
  Component: '@main12/payload-plugin-cloudflare-widgets/widgets/cloudflare-status-codes',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'medium',
  maxWidth: 'full',
} satisfies Widget & { imageURL?: string }
