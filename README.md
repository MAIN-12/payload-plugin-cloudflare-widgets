# @main12/payload-plugin-cloudflare-widgets

A [Payload CMS](https://payloadcms.com) plugin that adds Cloudflare analytics widgets to your admin dashboard. Visualize traffic, bandwidth, cache performance, threats, and more — all powered by the Cloudflare GraphQL API.

## Widgets

| Widget | Description |
|---|---|
| **CloudflareTraffic** | Requests & unique visitors over time |
| **CloudflareBandwidth** | Data transferred over time |
| **CloudflareCacheRate** | Cache hit vs. miss ratio |
| **CloudflareDevices** | Visitor breakdown by device type |
| **CloudflareProtocol** | HTTP version distribution |
| **CloudflareStatusCodes** | Response status code breakdown |
| **CloudflareThreats** | Threat and firewall event counts |
| **CloudflareTopPaths** | Top requested URL paths |
| **CloudflareWorldMap** | Choropleth map of visitor countries |

## Requirements

- Payload CMS `^3.84.1`
- Node.js `^18.20.2 || >=20.9.0`
- A Cloudflare account with an active zone
- Cloudflare API credentials (Zone ID + API Token)

## Installation

```bash
pnpm add @main12/payload-plugin-cloudflare-widgets
# or
npm install @main12/payload-plugin-cloudflare-widgets
```

## Environment Variables

Add these to your `.env` file:

```env
CLOUDFLARE_ZONE_ID=your_zone_id
CLOUDFLARE_API_TOKEN=your_api_token
```

Your API token needs the **Zone / Analytics / Read** permission.

## Usage

Add the plugin to your `payload.config.ts`:

```ts
import { buildConfig } from 'payload'
import { cloudflareWidgetsPlugin } from '@main12/payload-plugin-cloudflare-widgets'

export default buildConfig({
  plugins: [
    cloudflareWidgetsPlugin(),
  ],
  // ...rest of your config
})
```

All 9 widgets will appear on the Payload admin dashboard automatically.

### Plugin Options

```ts
cloudflareWidgetsPlugin({
  // Optional: customize the analytics API route
  // Defaults to '/analytics/cloudflare' → accessible at /api/analytics/cloudflare
  apiPath: '/analytics/cloudflare',

  // Optional: disable the plugin without removing it from config
  disabled: false,
})
```

### Cherry-picking Widgets

If you only want specific widgets, import them individually:

```ts
import { buildConfig } from 'payload'
import {
  CloudflareTrafficWidget,
  CloudflareBandwidthWidget,
  CloudflareWorldMapWidget,
} from '@main12/payload-plugin-cloudflare-widgets'

export default buildConfig({
  admin: {
    dashboard: {
      widgets: [
        CloudflareTrafficWidget,
        CloudflareBandwidthWidget,
        CloudflareWorldMapWidget,
      ],
    },
  },
  // Note: you still need to register the analytics endpoint manually
  // when not using the plugin function.
})
```

## How It Works

The plugin registers:

1. **A server-side API endpoint** at `/api/analytics/cloudflare` that proxies requests to the Cloudflare GraphQL API using your credentials from environment variables. Your API token is never exposed to the browser.

2. **Dashboard widgets** that call that endpoint and render charts using [Recharts](https://recharts.org) (all widgets except the world map) and [react-simple-maps](https://www.react-simple-maps.io) (world map).

## License

MIT
