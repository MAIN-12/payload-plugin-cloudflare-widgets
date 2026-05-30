'use client'

import React, { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { widgetCard, widgetTitle, widgetSubtext, loadingState, errorState } from '../shared.js'

type Range = '7d' | '30d' | '90d'

type CloudflareOverview = {
  requests: number
  bandwidth: number
  pageViews: number
  threats: number
  cachedRequests: number
  cachedBytes: number
  uniqueVisitors: number
  days: number
}

type TrendPoint = {
  date: string
  requests: number
  pageViews: number
  bandwidth: number
  cached: number
  visitors: number
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
]

const metricCardStyle: React.CSSProperties = {
  flex: '1 1 140px',
  padding: '14px 16px',
  background: 'var(--theme-elevation-100)',
  borderRadius: 6,
  minWidth: 140,
}

const metricLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--theme-elevation-500)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  margin: 0,
}

const metricValue: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--theme-text)',
  margin: '4px 0 0',
  lineHeight: 1.1,
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`
  if (bytes >= 1_024) return `${(bytes / 1_024).toFixed(1)} KB`
  return `${bytes} B`
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px',
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 4,
    border: '1px solid var(--theme-elevation-150)',
    background: active ? 'var(--theme-elevation-200)' : 'transparent',
    color: active ? 'var(--theme-text)' : 'var(--theme-elevation-500)',
    cursor: 'pointer',
  }
}

const CloudflareTraffic: React.FC = () => {
  const [range, setRange] = useState<Range>('30d')
  const [overview, setOverview] = useState<CloudflareOverview | null>(null)
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [unconfigured, setUnconfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setUnconfigured(false)

      try {
        const [overviewRes, trendRes] = await Promise.all([
          fetch(`/api/analytics/cloudflare?metric=overview&days=${days}`),
          fetch(`/api/analytics/cloudflare?metric=requests-trend&days=${days}`),
        ])

        if (!overviewRes.ok) {
          const body = await overviewRes.json().catch(() => ({}))
          if (body.unconfigured) {
            setUnconfigured(true)
            return
          }
          throw new Error(body.error || 'Failed to fetch Cloudflare data')
        }

        const [overviewData, trendData] = await Promise.all([overviewRes.json(), trendRes.json()])

        setOverview(overviewData)
        setTrend(trendData.data || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load traffic data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  if (loading) {
    return <div style={{ ...widgetCard, ...loadingState }}>Loading Cloudflare traffic data…</div>
  }

  if (unconfigured) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>Traffic</h3>
        <p style={{ fontSize: 13, color: 'var(--theme-elevation-400)', marginTop: 8 }}>
          Cloudflare analytics not configured. Set <code>CLOUDFLARE_API_TOKEN</code> and{' '}
          <code>CLOUDFLARE_ZONE_ID</code> environment variables.
        </p>
      </div>
    )
  }

  if (error) {
    return <div style={{ ...widgetCard, ...errorState }}>{error}</div>
  }

  if (!overview) return null

  const cacheHitRate =
    overview.requests > 0 ? ((overview.cachedRequests / overview.requests) * 100).toFixed(1) : '0'

  return (
    <div style={{ ...widgetCard, display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h3 style={widgetTitle}>Traffic</h3>
          <p style={widgetSubtext}>Real-time edge analytics</p>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              style={pillStyle(range === opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={metricCardStyle}>
          <p style={metricLabel}>Requests</p>
          <p style={metricValue}>{formatNumber(overview.requests)}</p>
        </div>
        <div style={metricCardStyle}>
          <p style={metricLabel}>Unique Visitors</p>
          <p style={metricValue}>{formatNumber(overview.uniqueVisitors)}</p>
        </div>
        <div style={metricCardStyle}>
          <p style={metricLabel}>Page Views</p>
          <p style={metricValue}>{formatNumber(overview.pageViews)}</p>
        </div>
        <div style={metricCardStyle}>
          <p style={metricLabel}>Bandwidth</p>
          <p style={metricValue}>{formatBytes(overview.bandwidth)}</p>
        </div>
        <div style={metricCardStyle}>
          <p style={metricLabel}>Cache Hit Rate</p>
          <p style={metricValue}>{cacheHitRate}%</p>
        </div>
        <div style={metricCardStyle}>
          <p style={metricLabel}>Threats Blocked</p>
          <p style={metricValue}>{formatNumber(overview.threats)}</p>
        </div>
      </div>

      {/* Trend Chart */}
      {trend.length > 0 && (
        <div style={{ flex: 1, minHeight: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="cfRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cfVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--theme-elevation-150)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'var(--theme-elevation-500)' }}
                tickFormatter={(v) => {
                  const d = new Date(v)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
              />
              <YAxis
                yAxisId="requests"
                orientation="left"
                tick={{ fontSize: 10, fill: '#f97316' }}
                tickFormatter={(v) => formatNumber(v)}
                width={52}
              />
              <YAxis
                yAxisId="visitors"
                orientation="right"
                tick={{ fontSize: 10, fill: '#22c55e' }}
                tickFormatter={(v) => formatNumber(v)}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--theme-elevation-50)',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value, name) => [formatNumber(Number(value)), String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: 'var(--theme-elevation-500)' }} />
              <Area
                yAxisId="requests"
                type="monotone"
                dataKey="requests"
                stroke="#f97316"
                fill="url(#cfRequests)"
                strokeWidth={2}
                name="Requests"
              />
              <Area
                yAxisId="visitors"
                type="monotone"
                dataKey="visitors"
                stroke="#22c55e"
                fill="url(#cfVisitors)"
                strokeWidth={2}
                name="Visitors"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default CloudflareTraffic
