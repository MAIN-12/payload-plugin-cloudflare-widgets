import type { Config } from 'payload'

import { cloudflareAnalyticsHandler } from './endpoints/cloudflareAnalyticsEndpoint.js'
import { cloudflareWidgets } from './widgets/index.js'

export type CloudflareWidgetsPluginOptions = {
  /**
   * Path prefix for the analytics API endpoint.
   * Defaults to '/analytics/cloudflare' (accessible at /api/analytics/cloudflare).
   */
  apiPath?: string
  /**
   * Set to true to disable the plugin without removing it from config.
   */
  disabled?: boolean
}

export const cloudflareWidgetsPlugin =
  (pluginOptions: CloudflareWidgetsPluginOptions = {}) =>
  (config: Config): Config => {
    if (pluginOptions.disabled) {
      return config
    }

    const apiPath = pluginOptions.apiPath ?? '/analytics/cloudflare'

    // Register the Cloudflare analytics endpoint
    if (!config.endpoints) {
      config.endpoints = []
    }
    config.endpoints.push({
      handler: cloudflareAnalyticsHandler,
      method: 'get',
      path: apiPath,
    })

    // Register all Cloudflare widgets on the admin dashboard
    if (!config.admin) {
      config.admin = {}
    }
    if (!config.admin.dashboard) {
      config.admin.dashboard = { widgets: [] }
    }
    if (!config.admin.dashboard.widgets) {
      config.admin.dashboard.widgets = []
    }

    config.admin.dashboard.widgets.push(...cloudflareWidgets)

    return config
  }

// Re-export widget configs for consumers who want to cherry-pick
export {
  cloudflareWidgets,
  CloudflareTrafficWidget,
  CloudflareBandwidthWidget,
  CloudflareCacheRateWidget,
  CloudflareDevicesWidget,
  CloudflareProtocolWidget,
  CloudflareStatusCodesWidget,
  CloudflareThreatsWidget,
  CloudflareTopPathsWidget,
} from './widgets/index.js'
