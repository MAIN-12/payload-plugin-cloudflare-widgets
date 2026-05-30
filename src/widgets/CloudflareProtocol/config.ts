import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareProtocolWidget = {
  slug: 'cloudflare-protocol',
  label: 'Cloudflare Protocol',
  Component: '@main12/payload-plugin-cloudflare-widgets/widgets/cloudflare-protocol',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'small',
  maxWidth: 'medium',
} satisfies Widget & { imageURL?: string }
