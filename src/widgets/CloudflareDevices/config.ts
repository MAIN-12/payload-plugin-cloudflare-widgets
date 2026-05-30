import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareDevicesWidget = {
  slug: 'cloudflare-devices',
  label: 'Cloudflare Devices',
  Component: '@main12/payload-plugin-cloudflare-widgets/widgets/cloudflare-devices',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'small',
  maxWidth: 'medium',
} satisfies Widget & { imageURL?: string }
