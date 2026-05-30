import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareTrafficWidget = {
  slug: 'cloudflare-traffic',
  label: 'Cloudflare Traffic',
  Component: '@main12/payload-cloudflare-widgets/widgets/cloudflare-traffic',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'small',
  maxWidth: 'full',
} satisfies Widget & { imageURL?: string }
