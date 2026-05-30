'use client'

import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { widgetCard, widgetTitle, widgetSubtext, loadingState, errorState } from '../shared.js'

const STATUS_CONFIG = [
  { key: '2xx', label: '2xx Success', color: '#22c55e' },
  { key: '3xx', label: '3xx Redirect', color: '#38bdf8' },
  { key: '4xx', label: '4xx Client Error', color: '#f59e0b' },
  { key: '5xx', label: '5xx Server Error', color: '#ef4444' },
]

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const CloudflareStatusCodes: React.FC = () => {
  const [buckets, setBuckets] = useState<Record<string, number>>({})
  const [unconfigured, setUnconfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setUnconfigured(false)
      try {
        const res = await fetch('/api/analytics/cloudflare?metric=http-status')
        const json = await res.json()
        if (!res.ok) {
          if (json.unconfigured) {
            setUnconfigured(true)
            return
          }
          throw new Error(json.error || 'Failed to fetch status data')
        }
        setBuckets(json.data ?? {})
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load status data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const total = Object.values(buckets).reduce((s, v) => s + v, 0)
  const chartData = STATUS_CONFIG.map((s) => ({
    name: s.label,
    value: buckets[s.key] ?? 0,
    color: s.color,
    key: s.key,
  })).filter((d) => d.value > 0)

  if (loading) return <div style={{ ...widgetCard, ...loadingState }}>Loading status data…</div>
  if (unconfigured) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>HTTP Status Codes</h3>
        <p style={{ fontSize: 13, color: 'var(--theme-elevation-400)', marginTop: 8 }}>
          Cloudflare analytics not configured. Set <code>CLOUDFLARE_API_TOKEN</code> and{' '}
          <code>CLOUDFLARE_ZONE_ID</code> environment variables.
        </p>
      </div>
    )
  }
  if (error) return <div style={{ ...widgetCard, ...errorState }}>{error}</div>

  return (
    <div style={{ ...widgetCard, display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={widgetTitle}>HTTP Status Codes</h3>
        <p style={widgetSubtext}>Response breakdown — last 24 hours</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 220, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px', minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} fillOpacity={0.9} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: 'var(--theme-elevation-50)',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value) => [formatNumber(Number(value)), '']}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            flex: '1 1 160px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {STATUS_CONFIG.map((s) => {
            const count = buckets[s.key] ?? 0
            const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0'
            return (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: s.color }}>{s.key}</span>
                  <span style={{ fontSize: 11, color: 'var(--theme-text)' }}>
                    {formatNumber(count)}{' '}
                    <span style={{ color: 'var(--theme-elevation-500)' }}>({pct}%)</span>
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    borderRadius: 3,
                    background: 'var(--theme-elevation-150)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: s.color,
                      borderRadius: 3,
                      transition: 'width 0.4s',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CloudflareStatusCodes
