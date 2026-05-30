import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareCacheRateWidget = {
  slug: 'cloudflare-cache-rate',
  label: 'Cloudflare Cache Rate',
  Component: '@main12/payload-plugin-cloudflare-widgets/widgets/cloudflare-cache-rate',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'medium',
  maxWidth: 'full',
} satisfies Widget & { imageURL?: string }
