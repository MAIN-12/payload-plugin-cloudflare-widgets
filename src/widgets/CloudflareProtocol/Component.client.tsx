'use client'

import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { widgetCard, widgetTitle, widgetSubtext, loadingState, errorState } from '../shared.js'

type ProtocolEntry = { protocol: string; count: number }

const PROTOCOL_COLORS: Record<string, string> = {
  'HTTP/1': '#6b7280',
  'HTTP/1.0': '#6b7280',
  'HTTP/1.1': '#94a3b8',
  'HTTP/2': '#38bdf8',
  'HTTP/3': '#22c55e',
}

function getProtocolColor(protocol: string): string {
  for (const [key, color] of Object.entries(PROTOCOL_COLORS)) {
    if (protocol.startsWith(key)) return color
  }
  return '#a78bfa'
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const CloudflareProtocol: React.FC = () => {
  const [protocols, setProtocols] = useState<ProtocolEntry[]>([])
  const [unconfigured, setUnconfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setUnconfigured(false)
      try {
        const res = await fetch('/api/analytics/cloudflare?metric=protocol')
        const json = await res.json()
        if (!res.ok) {
          if (json.unconfigured) {
            setUnconfigured(true)
            return
          }
          throw new Error(json.error || 'Failed to fetch protocol data')
        }
        setProtocols(json.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load protocol data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const total = protocols.reduce((s, p) => s + p.count, 0)
  const chartData = protocols.map((p) => ({
    name: p.protocol,
    value: p.count,
    color: getProtocolColor(p.protocol),
  }))

  if (loading) return <div style={{ ...widgetCard, ...loadingState }}>Loading protocol data…</div>
  if (unconfigured) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>HTTP Protocol</h3>
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
        <h3 style={widgetTitle}>HTTP Protocol</h3>
        <p style={widgetSubtext}>Protocol adoption — last 24 hours</p>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 200, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 160px', minHeight: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={3}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.9} />
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
            flex: '1 1 140px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 10,
          }}
        >
          {protocols.map((p) => {
            const pct = total > 0 ? ((p.count / total) * 100).toFixed(1) : '0'
            const color = getProtocolColor(p.protocol)
            return (
              <div key={p.protocol}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color }}>{p.protocol}</span>
                  <span style={{ fontSize: 11, color: 'var(--theme-text)' }}>{pct}%</span>
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
                      background: color,
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

export default CloudflareProtocol
