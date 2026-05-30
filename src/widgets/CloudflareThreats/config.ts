import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareThreatsWidget = {
  slug: 'cloudflare-threats',
  label: 'Cloudflare Threats',
  Component: '@main12/payload-plugin-cloudflare-widgets/widgets/cloudflare-threats',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'medium',
  maxWidth: 'full',
} satisfies Widget & { imageURL?: string }
