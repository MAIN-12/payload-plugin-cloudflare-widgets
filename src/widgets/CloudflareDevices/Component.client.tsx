'use client'

import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { widgetCard, widgetTitle, widgetSubtext, loadingState, errorState } from '../shared.js'

type DeviceEntry = { device: string; count: number }

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#38bdf8',
  mobile: '#f97316',
  tablet: '#a78bfa',
  other: '#6b7280',
}

function getColor(device: string): string {
  return DEVICE_COLORS[device.toLowerCase()] ?? '#6b7280'
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const CloudflareDevices: React.FC = () => {
  const [devices, setDevices] = useState<DeviceEntry[]>([])
  const [unconfigured, setUnconfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setUnconfigured(false)
      try {
        const res = await fetch('/api/analytics/cloudflare?metric=devices')
        const json = await res.json()
        if (!res.ok) {
          if (json.unconfigured) {
            setUnconfigured(true)
            return
          }
          throw new Error(json.error || 'Failed to fetch device data')
        }
        setDevices(json.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load device data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const total = devices.reduce((s, d) => s + d.count, 0)
  const chartData = devices.map((d) => ({
    name: d.device.charAt(0).toUpperCase() + d.device.slice(1),
    value: d.count,
    color: getColor(d.device),
  }))

  if (loading) return <div style={{ ...widgetCard, ...loadingState }}>Loading device data…</div>
  if (unconfigured) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>Device Types</h3>
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
        <h3 style={widgetTitle}>Device Types</h3>
        <p style={widgetSubtext}>Visitor breakdown — last 24 hours</p>
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
          {devices.map((d) => {
            const pct = total > 0 ? ((d.count / total) * 100).toFixed(1) : '0'
            const color = getColor(d.device)
            const label = d.device.charAt(0).toUpperCase() + d.device.slice(1)
            return (
              <div key={d.device}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
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

export default CloudflareDevices
