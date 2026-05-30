import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareBandwidthWidget = {
  slug: 'cloudflare-bandwidth',
  label: 'Cloudflare Bandwidth',
  Component: '@main12/payload-cloudflare-widgets/widgets/cloudflare-bandwidth',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'small',
  maxWidth: 'full',
} satisfies Widget & { imageURL?: string }
