'use client'

import React, { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { widgetCard, widgetTitle, widgetSubtext, loadingState, errorState } from '../shared.js'

type Range = '7d' | '30d' | '90d'

type ThreatPoint = {
  date: string
  threats: number
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
]

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
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

const CloudflareThreats: React.FC = () => {
  const [range, setRange] = useState<Range>('30d')
  const [trend, setTrend] = useState<ThreatPoint[]>([])
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
        const res = await fetch(`/api/analytics/cloudflare?metric=threats&days=${days}`)
        const json = await res.json()
        if (!res.ok) {
          if (json.unconfigured) {
            setUnconfigured(true)
            return
          }
          throw new Error(json.error || 'Failed to fetch threats data')
        }
        setTrend(json.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load threats data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [days])

  const totalThreats = trend.reduce((s, p) => s + p.threats, 0)
  const peakDay = trend.reduce((max, p) => (p.threats > max.threats ? p : max), {
    date: '',
    threats: 0,
  })
  const threatColor = totalThreats > 1000 ? '#ef4444' : totalThreats > 100 ? '#f59e0b' : '#22c55e'

  if (loading) return <div style={{ ...widgetCard, ...loadingState }}>Loading threats data…</div>
  if (unconfigured) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>Threats Blocked</h3>
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
          <h3 style={widgetTitle}>Threats Blocked</h3>
          <p style={widgetSubtext}>Cloudflare security — last {days} days</p>
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

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
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
            Total Blocked
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 28,
              fontWeight: 700,
              color: threatColor,
              lineHeight: 1.1,
            }}
          >
            {formatNumber(totalThreats)}
          </p>
        </div>
        {peakDay.threats > 0 && (
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
              Peak Day
            </p>
            <p
              style={{
                margin: '4px 0 0',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--theme-text)',
                lineHeight: 1.1,
              }}
            >
              {formatNumber(peakDay.threats)}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--theme-elevation-500)' }}>
              {peakDay.date
                ? (() => {
                    const d = new Date(peakDay.date)
                    return `${d.getMonth() + 1}/${d.getDate()}`
                  })()
                : ''}
            </p>
          </div>
        )}
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
            Avg / Day
          </p>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--theme-text)',
              lineHeight: 1.1,
            }}
          >
            {trend.length > 0 ? formatNumber(Math.round(totalThreats / trend.length)) : '0'}
          </p>
        </div>
      </div>

      {trend.length > 0 && (
        <div style={{ flex: 1, minHeight: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
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
                tick={{ fontSize: 10, fill: 'var(--theme-elevation-500)' }}
                tickFormatter={(v) => formatNumber(v)}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--theme-elevation-50)',
                  border: '1px solid var(--theme-elevation-150)',
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value) => [formatNumber(Number(value)), 'Threats Blocked']}
                labelFormatter={(label) => {
                  const d = new Date(label)
                  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
                }}
              />
              <Bar
                dataKey="threats"
                fill="#ef4444"
                fillOpacity={0.8}
                radius={[3, 3, 0, 0]}
                name="Threats"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {totalThreats === 0 && trend.length > 0 && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#22c55e',
            fontSize: 14,
          }}
        >
          ✓ No threats detected in this period
        </div>
      )}
    </div>
  )
}

export default CloudflareThreats
