'use client'

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'
import { widgetCard, widgetTitle, widgetSubtext, loadingState, errorState } from '../shared.js'
import { countryFlag, COUNTRY_NAMES } from './mapData.js'

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

type CountryData = {
  code: string
  name: string
  views: number
  visitors: number
}

// ISO 3166-1 numeric → alpha-2  (world-atlas topojson uses numeric feature IDs)
const NUM_TO_A2: Record<number, string> = {
  4: 'AF',
  8: 'AL',
  12: 'DZ',
  20: 'AD',
  24: 'AO',
  28: 'AG',
  32: 'AR',
  36: 'AU',
  40: 'AT',
  44: 'BS',
  48: 'BH',
  50: 'BD',
  51: 'AM',
  52: 'BB',
  56: 'BE',
  64: 'BT',
  68: 'BO',
  70: 'BA',
  72: 'BW',
  76: 'BR',
  84: 'BZ',
  96: 'BN',
  100: 'BG',
  104: 'MM',
  108: 'BI',
  116: 'KH',
  120: 'CM',
  124: 'CA',
  132: 'CV',
  140: 'CF',
  144: 'LK',
  148: 'TD',
  152: 'CL',
  156: 'CN',
  170: 'CO',
  174: 'KM',
  178: 'CG',
  180: 'CD',
  188: 'CR',
  191: 'HR',
  192: 'CU',
  196: 'CY',
  203: 'CZ',
  204: 'BJ',
  208: 'DK',
  214: 'DO',
  218: 'EC',
  222: 'SV',
  226: 'GQ',
  231: 'ET',
  232: 'ER',
  233: 'EE',
  246: 'FI',
  250: 'FR',
  266: 'GA',
  276: 'DE',
  288: 'GH',
  300: 'GR',
  320: 'GT',
  324: 'GN',
  332: 'HT',
  340: 'HN',
  348: 'HU',
  352: 'IS',
  356: 'IN',
  360: 'ID',
  364: 'IR',
  368: 'IQ',
  372: 'IE',
  376: 'IL',
  380: 'IT',
  384: 'CI',
  388: 'JM',
  392: 'JP',
  398: 'KZ',
  400: 'JO',
  404: 'KE',
  408: 'KP',
  410: 'KR',
  414: 'KW',
  417: 'KG',
  418: 'LA',
  422: 'LB',
  428: 'LV',
  430: 'LR',
  434: 'LY',
  440: 'LT',
  442: 'LU',
  450: 'MG',
  454: 'MW',
  458: 'MY',
  462: 'MV',
  466: 'ML',
  470: 'MT',
  478: 'MR',
  484: 'MX',
  496: 'MN',
  498: 'MD',
  504: 'MA',
  508: 'MZ',
  516: 'NA',
  524: 'NP',
  528: 'NL',
  554: 'NZ',
  558: 'NI',
  562: 'NE',
  566: 'NG',
  578: 'NO',
  586: 'PK',
  591: 'PA',
  598: 'PG',
  600: 'PY',
  604: 'PE',
  608: 'PH',
  616: 'PL',
  620: 'PT',
  630: 'PR',
  634: 'QA',
  642: 'RO',
  643: 'RU',
  646: 'RW',
  682: 'SA',
  686: 'SN',
  690: 'SC',
  694: 'SL',
  703: 'SK',
  704: 'VN',
  705: 'SI',
  706: 'SO',
  710: 'ZA',
  716: 'ZW',
  724: 'ES',
  729: 'SD',
  752: 'SE',
  756: 'CH',
  760: 'SY',
  762: 'TJ',
  764: 'TH',
  768: 'TG',
  780: 'TT',
  784: 'AE',
  788: 'TN',
  792: 'TR',
  795: 'TM',
  800: 'UG',
  804: 'UA',
  818: 'EG',
  826: 'GB',
  840: 'US',
  858: 'UY',
  860: 'UZ',
  862: 'VE',
  887: 'YE',
  894: 'ZM',
  31: 'AZ',
  112: 'BY',
  268: 'GE',
}

// Log-scale normalization so low-traffic countries still show color
function normalize(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0
  return Math.log(value + 1) / Math.log(max + 1)
}

// Interpolate dark navy → bright cyan-blue (matches Highcharts choropleth style)
function scaleColor(t: number): string {
  const r = Math.round(13 + t * (56 - 13))
  const g = Math.round(33 + t * (189 - 33))
  const b = Math.round(55 + t * (248 - 55))
  return `rgb(${r},${g},${b})`
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

type TooltipInfo = {
  country: CountryData
  x: number
  y: number
}

const WorldTrafficMap: React.FC = () => {
  const [data, setData] = useState<CountryData[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [unconfigured, setUnconfigured] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      setUnconfigured(false)
      try {
        const res = await fetch('/api/analytics/cloudflare?metric=countries&days=30')
        const json = await res.json()
        if (!res.ok) {
          if (json.unconfigured) {
            setUnconfigured(true)
            return
          }
          throw new Error(json.error || 'Failed to fetch country data')
        }
        setData(json.data ?? [])
        if (json.days) setDays(json.days)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load country data')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const maxViews = useMemo(() => Math.max(...data.map((d) => d.views), 1), [data])

  const dataMap = useMemo(() => {
    const m: Record<string, CountryData> = {}
    for (const d of data) m[d.code] = d
    return m
  }, [data])

  const handleGeoHover = useCallback(
    (alpha2: string, country: CountryData | undefined, event: React.MouseEvent) => {
      if (!country || !containerRef.current) {
        setTooltip(null)
        setHoveredCode(null)
        return
      }
      const rect = containerRef.current.getBoundingClientRect()
      setTooltip({
        country,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      })
      setHoveredCode(alpha2)
    },
    [],
  )

  const handleGeoLeave = useCallback(() => {
    setTooltip(null)
    setHoveredCode(null)
  }, [])

  if (loading) return <div style={{ ...widgetCard, ...loadingState }}>Loading map data…</div>
  if (unconfigured) {
    return (
      <div style={widgetCard}>
        <h3 style={widgetTitle}>World Traffic Map</h3>
        <p style={{ fontSize: 13, color: 'var(--theme-elevation-400)', marginTop: 8 }}>
          Cloudflare analytics not configured. Set <code>CLOUDFLARE_API_TOKEN</code> and{' '}
          <code>CLOUDFLARE_ZONE_ID</code> environment variables.
        </p>
      </div>
    )
  }
  if (error) return <div style={{ ...widgetCard, ...errorState }}>{error}</div>

  return (
    <div style={widgetCard}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div>
          <h3 style={widgetTitle}>World Traffic Map</h3>
          <p style={widgetSubtext}>
            {data.length} countries &middot; last {days} days
          </p>
        </div>
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          marginBottom: 16,
          background: 'var(--theme-elevation-50)',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 130, center: [0, 20] }}
          style={{ width: '100%', height: 'auto' }}
          height={420}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }: { geographies: any[] }) =>
              geographies.map((geo: any) => {
                const alpha2 = NUM_TO_A2[Number(geo.id)]
                const country = alpha2 ? dataMap[alpha2] : undefined
                const isHovered = alpha2 !== undefined && alpha2 === hoveredCode
                const t = country ? normalize(country.views, maxViews) : 0
                const fill = country
                  ? isHovered
                    ? scaleColor(Math.min(1, t + 0.18))
                    : scaleColor(t)
                  : 'var(--theme-elevation-100)'
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={fill}
                    stroke="var(--theme-elevation-150)"
                    strokeWidth={0.4}
                    style={{
                      default: {
                        outline: 'none',
                        cursor: country ? 'pointer' : 'default',
                        transition: 'fill 0.15s',
                      },
                      hover: { outline: 'none' },
                      pressed: { outline: 'none' },
                    }}
                    onMouseEnter={(e: React.MouseEvent) => handleGeoHover(alpha2 ?? '', country, e)}
                    onMouseMove={(e: React.MouseEvent) => handleGeoHover(alpha2 ?? '', country, e)}
                    onMouseLeave={handleGeoLeave}
                  />
                )
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Color scale legend */}
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 3,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            Requests
          </span>
          <div
            style={{
              width: 110,
              height: 8,
              borderRadius: 4,
              background: 'linear-gradient(90deg, #0d2137, #38bdf8)',
            }}
          />
          <div style={{ width: 110, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Low</span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>High</span>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: 'absolute',
              left: tooltip.x,
              top: tooltip.y - 12,
              transform: 'translate(-50%, -100%)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={tooltipBoxStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>
                  {countryFlag(tooltip.country.code)}
                </span>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13,
                      color: 'var(--theme-text)',
                      lineHeight: 1.2,
                    }}
                  >
                    {COUNTRY_NAMES[tooltip.country.code] || tooltip.country.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--theme-elevation-500)' }}>
                    {tooltip.country.code}
                  </div>
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--theme-elevation-500)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                  }}
                >
                  Requests
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>
                  {formatNumber(tooltip.country.views)}
                </div>
              </div>
              {/* Arrow */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid var(--theme-elevation-50)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Country Table */}
      <div style={{ maxHeight: 260, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--theme-elevation-150)' }}>
              <th style={thStyle}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Country</th>
              <th style={thStyle}>Views</th>
              <th style={{ ...thStyle, width: '30%' }}></th>
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 20).map((country, i) => (
              <tr
                key={country.code}
                style={{
                  borderBottom: '1px solid var(--theme-elevation-100)',
                  background:
                    hoveredCode === country.code ? 'var(--theme-elevation-100)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={() => setHoveredCode(country.code)}
                onMouseLeave={() => setHoveredCode(null)}
              >
                <td style={tdStyle}>{i + 1}</td>
                <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 500 }}>
                  <span style={{ marginRight: 6 }}>{countryFlag(country.code)}</span>
                  {COUNTRY_NAMES[country.code] || country.name}
                </td>
                <td style={tdStyle}>{country.views.toLocaleString()}</td>
                <td style={tdStyle}>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: 'var(--theme-elevation-150)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${normalize(country.views, maxViews) * 100}%`,
                        background: 'linear-gradient(90deg, #0d2137, #38bdf8)',
                        borderRadius: 3,
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const tooltipBoxStyle: React.CSSProperties = {
  background: 'var(--theme-elevation-50)',
  border: '1px solid var(--theme-elevation-150)',
  borderRadius: 8,
  padding: '10px 14px',
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  minWidth: 160,
  position: 'relative',
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--theme-elevation-500)',
  textAlign: 'right',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const tdStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'right',
  color: 'var(--theme-text)',
}

export default WorldTrafficMap
