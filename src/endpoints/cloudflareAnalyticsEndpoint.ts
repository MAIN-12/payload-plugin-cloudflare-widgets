import type { PayloadHandler } from 'payload'

/**
 * GET /api/analytics/cloudflare?metric=overview&days=30
 *
 * Metrics: overview | requests-trend | hosts | countries | threats |
 *          http-status | devices | top-paths | protocol
 *
 * Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID env vars.
 * Optional CLOUDFLARE_HOSTNAME (e.g. "example.com") scopes adaptive-group
 * queries to a single host.
 */
export const cloudflareAnalyticsHandler: PayloadHandler = async (req) => {
  try {
    // Auth check — must be logged in as admin
    if (!req.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    const zoneId = process.env.CLOUDFLARE_ZONE_ID
    if (!apiToken || !zoneId) {
      return Response.json(
        { error: 'CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID required', unconfigured: true },
        { status: 500 },
      )
    }

    const hostname = process.env.CLOUDFLARE_HOSTNAME
    const hostnameFilter = hostname ? `clientRequestHTTPHost: "${hostname}"` : ''

    const url = new URL(req.url ?? '/', 'http://localhost')
    const metric = url.searchParams.get('metric') || 'overview'
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '30', 10), 1), 365)

    const now = new Date()
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString().split('T')[0]
    const untilStr = now.toISOString().split('T')[0]

    const adaptiveSince = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const adaptiveSinceIso = adaptiveSince.toISOString()
    const adaptiveUntilIso = now.toISOString()

    switch (metric) {
      case 'overview': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequests1dGroups(
                                filter: { date_geq: "${sinceStr}", date_leq: "${untilStr}" }
                                limit: ${days + 1}
                                orderBy: [date_ASC]
                            ) {
                                dimensions { date }
                                sum {
                                    requests bytes pageViews threats cachedRequests cachedBytes
                                }
                                uniq { uniques }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const zones = data?.data?.viewer?.zones
        if (!zones?.length) {
          return Response.json(
            {
              error: 'Zone not found or API token lacks analytics:read permission',
              unconfigured: true,
            },
            { status: 500 },
          )
        }
        const groups = zones[0]?.httpRequests1dGroups || []
        const totals = groups.reduce(
          (acc: any, g: any) => ({
            requests: acc.requests + (g.sum.requests || 0),
            bytes: acc.bytes + (g.sum.bytes || 0),
            pageViews: acc.pageViews + (g.sum.pageViews || 0),
            threats: acc.threats + (g.sum.threats || 0),
            cachedRequests: acc.cachedRequests + (g.sum.cachedRequests || 0),
            cachedBytes: acc.cachedBytes + (g.sum.cachedBytes || 0),
            uniques: acc.uniques + (g.uniq?.uniques || 0),
          }),
          {
            requests: 0,
            bytes: 0,
            pageViews: 0,
            threats: 0,
            cachedRequests: 0,
            cachedBytes: 0,
            uniques: 0,
          },
        )
        return Response.json({
          requests: totals.requests,
          bandwidth: totals.bytes,
          pageViews: totals.pageViews,
          threats: totals.threats,
          cachedRequests: totals.cachedRequests,
          cachedBytes: totals.cachedBytes,
          uniqueVisitors: totals.uniques,
          days,
        })
      }

      case 'requests-trend': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequests1dGroups(
                                filter: { date_geq: "${sinceStr}", date_leq: "${untilStr}" }
                                limit: ${days}
                                orderBy: [date_ASC]
                            ) {
                                dimensions { date }
                                sum { requests pageViews bytes cachedRequests }
                                uniq { uniques }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const zones = data?.data?.viewer?.zones
        if (!zones?.length) return Response.json({ data: [] })
        const groups = zones[0]?.httpRequests1dGroups || []
        return Response.json({
          data: groups.map((g: any) => ({
            date: g.dimensions.date,
            requests: g.sum.requests,
            pageViews: g.sum.pageViews,
            bandwidth: g.sum.bytes,
            cached: g.sum.cachedRequests,
            visitors: g.uniq.uniques,
          })),
        })
      }

      case 'hosts': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequestsAdaptiveGroups(
                                filter: {
                                    datetime_geq: "${adaptiveSinceIso}"
                                    datetime_lt: "${adaptiveUntilIso}"
                                    requestSource: "eyeball"
                                }
                                limit: 50
                                orderBy: [count_DESC]
                            ) {
                                count
                                dimensions { clientRequestHTTPHost }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const groups = data?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || []
        return Response.json({
          data: groups
            .filter((g: any) => g.dimensions?.clientRequestHTTPHost)
            .map((g: any) => ({ host: g.dimensions.clientRequestHTTPHost, count: g.count })),
        })
      }

      case 'countries': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequests1dGroups(
                                filter: { date_geq: "${sinceStr}", date_leq: "${untilStr}" }
                                limit: ${days + 1}
                            ) {
                                sum {
                                    countryMap {
                                        clientCountryName
                                        requests
                                    }
                                }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const zones = data?.data?.viewer?.zones
        if (!zones?.length) {
          return Response.json(
            {
              error: 'Zone not found or API token lacks analytics:read permission',
              unconfigured: true,
            },
            { status: 500 },
          )
        }
        const groups: Array<{
          sum: { countryMap: Array<{ clientCountryName: string; requests: number }> }
        }> = zones[0]?.httpRequests1dGroups || []

        const totals: Record<string, number> = {}
        for (const group of groups) {
          for (const entry of group.sum?.countryMap || []) {
            if (entry.clientCountryName) {
              totals[entry.clientCountryName] =
                (totals[entry.clientCountryName] || 0) + (entry.requests || 0)
            }
          }
        }

        const result = Object.entries(totals)
          .map(([code, requests]) => ({ code, name: code, views: requests }))
          .sort((a, b) => b.views - a.views)

        return Response.json({ data: result, days })
      }

      case 'threats': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequests1dGroups(
                                filter: { date_geq: "${sinceStr}", date_leq: "${untilStr}" }
                                limit: ${days}
                                orderBy: [date_ASC]
                            ) {
                                dimensions { date }
                                sum { threats }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const groups = data?.data?.viewer?.zones?.[0]?.httpRequests1dGroups || []
        return Response.json({
          data: groups.map((g: any) => ({ date: g.dimensions.date, threats: g.sum.threats })),
        })
      }

      case 'http-status': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequestsAdaptiveGroups(
                                filter: {
                                    datetime_geq: "${adaptiveSinceIso}"
                                    datetime_lt: "${adaptiveUntilIso}"
                                    requestSource: "eyeball"
                                    ${hostnameFilter}
                                }
                                limit: 20
                                orderBy: [count_DESC]
                            ) {
                                count
                                dimensions { edgeResponseStatus }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const groups = data?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || []
        const buckets: Record<string, number> = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 }
        for (const g of groups) {
          const s = Number(g.dimensions.edgeResponseStatus)
          if (s >= 500) buckets['5xx'] += g.count
          else if (s >= 400) buckets['4xx'] += g.count
          else if (s >= 300) buckets['3xx'] += g.count
          else if (s >= 200) buckets['2xx'] += g.count
        }
        return Response.json({ data: buckets })
      }

      case 'devices': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequestsAdaptiveGroups(
                                filter: {
                                    datetime_geq: "${adaptiveSinceIso}"
                                    datetime_lt: "${adaptiveUntilIso}"
                                    requestSource: "eyeball"
                                    ${hostnameFilter}
                                }
                                limit: 10
                                orderBy: [count_DESC]
                            ) {
                                count
                                dimensions { clientDeviceType }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const groups = data?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || []
        return Response.json({
          data: groups.map((g: any) => ({
            device: g.dimensions.clientDeviceType || 'Unknown',
            count: g.count,
          })),
        })
      }

      case 'top-paths': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequestsAdaptiveGroups(
                                filter: {
                                    datetime_geq: "${adaptiveSinceIso}"
                                    datetime_lt: "${adaptiveUntilIso}"
                                    requestSource: "eyeball"
                                    ${hostnameFilter}
                                }
                                limit: 100
                                orderBy: [count_DESC]
                            ) {
                                count
                                dimensions { clientRequestPath }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const groups = data?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || []

        const BACKEND_PREFIXES = [
          '/api/',
          '/cdn-cgi/',
          '/rest/',
          '/webhook/',
          '/webhooks/',
          '/ocs/',
          '/remote.php/',
          '/core/',
          '/types/',
          '/index.php/',
          '/wp-',
          '/.well-known/',
          '/admin/',
          '/_next/',
          '/static/',
          '/assets/',
          '/favicon',
          '/robots.txt',
          '/sitemap',
        ]
        const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

        const result = groups
          .map((g: any) => ({ path: g.dimensions.clientRequestPath || '/', count: g.count }))
          .filter(({ path }: { path: string }) => {
            if (UUID_RE.test(path)) return false
            return !BACKEND_PREFIXES.some((prefix) => path.startsWith(prefix))
          })
          .slice(0, 15)

        if (result.length === 0 && hostname) {
          return Response.json({ data: [], hostnameNotFound: true, hostname })
        }
        return Response.json({ data: result })
      }

      case 'protocol': {
        const query = `query {
                    viewer {
                        zones(filter: { zoneTag: "${zoneId}" }) {
                            httpRequestsAdaptiveGroups(
                                filter: {
                                    datetime_geq: "${adaptiveSinceIso}"
                                    datetime_lt: "${adaptiveUntilIso}"
                                    requestSource: "eyeball"
                                    ${hostnameFilter}
                                }
                                limit: 10
                                orderBy: [count_DESC]
                            ) {
                                count
                                dimensions { clientRequestHTTPProtocol }
                            }
                        }
                    }
                }`
        const data = await cloudflareGraphQL(query, apiToken)
        const groups = data?.data?.viewer?.zones?.[0]?.httpRequestsAdaptiveGroups || []
        return Response.json({
          data: groups.map((g: any) => ({
            protocol: g.dimensions.clientRequestHTTPProtocol || 'Unknown',
            count: g.count,
          })),
        })
      }

      default:
        return Response.json({ error: `Unknown metric: ${metric}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[cloudflare-analytics]', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

async function cloudflareGraphQL(query: string, apiToken: string) {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Cloudflare GraphQL error ${res.status}: ${text}`)
  }
  const json = await res.json()
  if (json.errors?.length) {
    throw new Error(`Cloudflare GraphQL: ${json.errors.map((e: any) => e.message).join('; ')}`)
  }
  return json
}
