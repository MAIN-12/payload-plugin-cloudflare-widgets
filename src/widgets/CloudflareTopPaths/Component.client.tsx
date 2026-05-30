'use client'

import React, { useEffect, useState } from 'react'
import { widgetCard, widgetTitle, widgetSubtext, loadingState, errorState } from '../shared.js'

type PathEntry = { path: string; count: number }

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

const CloudflareTopPaths: React.FC = () => {
  const [paths, setPaths] = useState<PathEntry[]>([])
  const [hostnameNotFound, setHostnameNotFound] = useState<string | null>(null)
  const [unconfigured, setUnconfigured] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setUnconfigured(false)
      setHostnameNotFound(null)
      try {
        const res = await fetch('/api/analytics/cloudflare?metric=top-paths')
        const json = await res.json()
        if (!res.ok) {
          if (json.unconfigured) {
            setUnconfigured(true)
            return
          }
          throw new Error(json.error || 'Failed to fetch paths data')
        }
        if (json.hostnameNotFound) {
          setHostnameNotFound(json.hostname)
          return
        }
        setPaths(json.data ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load paths data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const maxCount = paths[0]?.count ?? 1

  if (loading) return <div style={{ ...widgetCard, ...loadingState }}>Loading top paths…</div>
  if (unconfigured) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>Top URL Paths</h3>
        <p style={{ fontSize: 13, color: 'var(--theme-elevation-400)', marginTop: 8 }}>
          Cloudflare analytics not configured. Set <code>CLOUDFLARE_API_TOKEN</code> and{' '}
          <code>CLOUDFLARE_ZONE_ID</code> environment variables.
        </p>
      </div>
    )
  }
  if (error) return <div style={{ ...widgetCard, ...errorState }}>{error}</div>
  if (hostnameNotFound) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>Top URL Paths</h3>
        <p style={{ fontSize: 13, color: 'var(--theme-elevation-400)', marginTop: 8 }}>
          No traffic found for <code style={{ color: '#f97316' }}>{hostnameNotFound}</code> in this
          Cloudflare zone.
        </p>
        <p style={{ fontSize: 12, color: 'var(--theme-elevation-400)', marginTop: 6 }}>
          Check <code>CLOUDFLARE_HOSTNAME</code> matches a hostname in your zone. Visit{' '}
          <code>/api/analytics/cloudflare?metric=hosts</code> to see available hostnames.
        </p>
      </div>
    )
  }

  return (
    <div style={{ ...widgetCard, display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={widgetTitle}>Top URL Paths</h3>
        <p style={widgetSubtext}>Most requested — last 24 hours</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {paths.length === 0 ? (
          <p
            style={{
              fontSize: 13,
              color: 'var(--theme-elevation-400)',
              textAlign: 'center',
              marginTop: 40,
            }}
          >
            No path data available
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {paths.map((p, i) => {
              const pct = (p.count / maxCount) * 100
              const truncated = p.path.length > 52 ? `${p.path.slice(0, 50)}…` : p.path
              return (
                <div key={i}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      marginBottom: 3,
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--theme-elevation-400)',
                          width: 16,
                          textAlign: 'right',
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--theme-text)',
                          fontFamily: 'monospace',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={p.path}
                      >
                        {truncated}
                      </span>
                    </div>
                    <span
                      style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600, flexShrink: 0 }}
                    >
                      {formatNumber(p.count)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 4,
                      borderRadius: 2,
                      background: 'var(--theme-elevation-150)',
                      overflow: 'hidden',
                      marginLeft: 24,
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #0d2137, #38bdf8)',
                        borderRadius: 2,
                        transition: 'width 0.4s',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default CloudflareTopPaths
