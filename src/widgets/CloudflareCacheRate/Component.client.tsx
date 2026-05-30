'use client'

import React, { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { widgetCard, widgetTitle, widgetSubtext, loadingState, errorState } from '../shared.js'

type Range = '7d' | '30d' | '90d'

type CachePoint = {
  date: string
  rate: number
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
]

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

const CloudflareCacheRate: React.FC = () => {
  const [range, setRange] = useState<Range>('30d')
  const [trend, setTrend] = useState<CachePoint[]>([])
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
        const res = await fetch(`/api/analytics/cloudflare?metric=requests-trend&days=${days}`)
        const json = await res.json()
        if (!res.ok) {
          if (json.unconfigured) {
            setUnconfigured(true)
            return
          }
          throw new Error(json.error || 'Failed to fetch cache data')
        }
        setTrend(
          (json.data ?? []).map((p: any) => ({
            date: p.date,
            rate: p.requests > 0 ? parseFloat(((p.cached / p.requests) * 100).toFixed(1)) : 0,
          })),
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cache data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  const avgRate =
    trend.length > 0 ? (trend.reduce((s, p) => s + p.rate, 0) / trend.length).toFixed(1) : '0'

  const rateColor =
    parseFloat(avgRate) >= 80 ? '#22c55e' : parseFloat(avgRate) >= 50 ? '#f59e0b' : '#ef4444'

  if (loading) return <div style={{ ...widgetCard, ...loadingState }}>Loading cache rate data…</div>
  if (unconfigured) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>Cache Hit Rate</h3>
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
          <h3 style={widgetTitle}>Cache Hit Rate</h3>
          <p style={widgetSubtext}>% of requests served from cache — last {days} days</p>
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

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div
          style={{
            flex: '1 1 140px',
            padding: '14px 16px',
            background: 'var(--theme-elevation-100)',
            borderRadius: 6,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--theme-elevation-500)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Avg Cache Hit Rate
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 28,
              fontWeight: 700,
              color: rateColor,
              lineHeight: 1.1,
            }}
          >
            {avgRate}%
          </p>
        </div>
        <div
          style={{
            flex: '2 1 200px',
            padding: '14px 16px',
            background: 'var(--theme-elevation-100)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: 'var(--theme-elevation-200)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(parseFloat(avgRate), 100)}%`,
                background: rateColor,
                borderRadius: 4,
                transition: 'width 0.5s',
              }}
            />
          </div>
        </div>
      </div>

      {trend.length > 0 && (
        <div style={{ flex: 1, minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: 'var(--theme-elevation-500)' }}
                tickFormatter={(v) => `${v}%`}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--theme-elevation-50)',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value) => [`${Number(value)}%`, 'Cache Hit Rate']}
              />
              <ReferenceLine
                y={80}
                stroke="#22c55e"
                strokeDasharray="4 4"
                strokeOpacity={0.4}
                label={{ value: '80%', fill: '#22c55e', fontSize: 9, position: 'right' }}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#38bdf8"
                strokeWidth={2}
                dot={false}
                name="Cache Hit Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default CloudflareCacheRate
