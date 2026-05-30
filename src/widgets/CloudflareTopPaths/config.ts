import type { Widget } from 'payload'
import { CLOUDFLARE_WIDGET_PREVIEW } from '../previewImage.js'

export const CloudflareTopPathsWidget = {
  slug: 'cloudflare-top-paths',
  label: 'Cloudflare Top Paths',
  Component: '@main12/payload-plugin-cloudflare-widgets/widgets/cloudflare-top-paths',
  imageURL: CLOUDFLARE_WIDGET_PREVIEW,
  minWidth: 'small',
  maxWidth: 'full',
} satisfies Widget & { imageURL?: string }
