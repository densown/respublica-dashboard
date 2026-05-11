import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './worldGlMap.css'
import { type MapProjectionMode, LoadingSpinner, useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import { worldFillColor } from './worldColors'
import type { WorldGeoJson, WorldMapRow } from './worldTypes'

const STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json'
const STYLE_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json'

const LAND_NODATA_LIGHT = '#e0e0e0'
const LAND_NODATA_DARK = '#3a3a3a'
const GLOBE_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-179.5, -80],
  [179.5, 85],
]

function normIso(s: string): string {
  return s.trim().toUpperCase()
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildFillColorExpression(
  rows: WorldMapRow[],
  valueMin: number,
  valueMax: number,
  category: string,
  noDataColor: string,
  darkBasemap: boolean,
): ExpressionSpecification {
  const expr: unknown[] = [
    'match',
    ['upcase', ['get', 'iso3']] as ExpressionSpecification,
  ]
  for (const r of rows) {
    const iso = normIso(r.country_code)
    const v = r.value
    if (v == null || Number.isNaN(v)) continue
    expr.push(
      iso,
      worldFillColor(v, valueMin, valueMax, category, {
        darkBasemap,
      }),
    )
  }
  expr.push(noDataColor)
  return expr as ExpressionSpecification
}

export type WorldGlMapProps = {
  geojson: WorldGeoJson | null
  mapData: WorldMapRow[]
  category: string
  valueMin: number
  valueMax: number
  nameByIso: Map<string, string>
  onSelectCountry: (
    iso3: string,
    modifiers: { meta: boolean; ctrl: boolean },
  ) => void
  selectedIso?: string | null
  compareIso3List?: string[]
  formatValue: (v: number | null | undefined) => string
  loading?: boolean
  narrow?: boolean
  /** Kartenhöhe in px (Mobile-first; Standard 350 / 500) */
  mapHeightPx?: number
  /** Volle Elternfläche (World-Page) statt fixer Kartenhöhe */
  layout?: 'card' | 'fullViewport'
  /** Rechtsklick auf ein Land: ISO3 und Zeigerposition (Viewport) */
  onCountryContextMenu?: (
    iso3: string,
    lngLat: maplibregl.LngLat,
    clientX: number,
    clientY: number,
  ) => void
  projection?: MapProjectionMode
}

type MapHandlers = {
  onClick: (e: maplibregl.MapLayerMouseEvent) => void
  onMove: (e: maplibregl.MapLayerMouseEvent) => void
  onLeave: () => void
  onContextMenu: (e: maplibregl.MapLayerMouseEvent) => void
}

function detachHandlers(
  map: maplibregl.Map,
  h: MapHandlers | undefined,
  hoveredIsoRef: MutableRefObject<string | null>,
) {
  if (!h) return
  map.off('click', 'country-fills', h.onClick)
  map.off('mousemove', 'country-fills', h.onMove)
  map.off('mouseleave', 'country-fills', h.onLeave)
  map.off('contextmenu', 'country-fills', h.onContextMenu)
  const prev = hoveredIsoRef.current
  if (prev && map.getSource('countries')) {
    try {
      map.setFeatureState({ source: 'countries', id: prev }, { hover: false })
    } catch {
      /* style/source weg */
    }
  }
  hoveredIsoRef.current = null
}

function hideBasemapLabels(map: maplibregl.Map) {
  const style = map.getStyle()
  if (!style?.layers) return
  style.layers.forEach((layer) => {
    if (layer.type === 'symbol' && layer.id !== 'country-labels') {
      try {
        map.setLayoutProperty(layer.id, 'visibility', 'none')
      } catch {
        /* ignore */
      }
    }
  })
}

export function WorldGlMap({
  geojson,
  mapData,
  category,
  valueMin,
  valueMax,
  nameByIso,
  onSelectCountry,
  selectedIso,
  compareIso3List = [],
  formatValue,
  loading,
  narrow,
  mapHeightPx,
  layout = 'card',
  onCountryContextMenu,
  projection = 'mercator',
}: WorldGlMapProps) {
  const { c, t, theme } = useTheme()
  const isDark = theme === 'dark'

  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const handlersRef = useRef<MapHandlers | undefined>(undefined)
  const prevThemeDarkRef = useRef<boolean | null>(null)
  const prevProjectionRef = useRef<MapProjectionMode>(projection)
  const hoveredIsoRef = useRef<string | null>(null)

  const mapDataRef = useRef(mapData)
  const geojsonRef = useRef(geojson)
  const onSelectRef = useRef(onSelectCountry)
  const formatValueRef = useRef(formatValue)
  const nameByIsoRef = useRef(nameByIso)
  const tRef = useRef(t)
  const cRef = useRef(c)
  const onCountryContextMenuRef = useRef(onCountryContextMenu)
  const projectionRef = useRef<MapProjectionMode>(projection)
  projectionRef.current = projection
  mapDataRef.current = mapData
  geojsonRef.current = geojson
  onSelectRef.current = onSelectCountry
  formatValueRef.current = formatValue
  nameByIsoRef.current = nameByIso
  tRef.current = t
  cRef.current = c
  onCountryContextMenuRef.current = onCountryContextMenu

  const applyProjection = useCallback(
    (map: maplibregl.Map, nextProjection: MapProjectionMode, source: 'init' | 'change' | 'style') => {
      const previousProjection = prevProjectionRef.current
      const zoomBefore = map.getZoom()
      const centerBefore = map.getCenter()

      try {
        map.setMinZoom(nextProjection === 'globe' ? 0 : 1)
      } catch {
        /* ignore */
      }

      try {
        map.setProjection({ type: nextProjection })
      } catch {
        return
      }

      map.resize()

      const shouldFitToWorld =
        nextProjection === 'globe' &&
        (source === 'init' ||
          (source === 'change' && previousProjection !== 'globe' && zoomBefore <= 2))

      if (shouldFitToWorld) {
        map.fitBounds(GLOBE_BOUNDS, {
          padding: 24,
          duration: 700,
          maxZoom: 1.15,
        })
      } else if (nextProjection === 'globe') {
        // Keep user focus when already zoomed in before switching to globe.
        map.easeTo({
          center: centerBefore,
          zoom: Math.max(0, zoomBefore),
          duration: source === 'change' ? 450 : 0,
        })
      } else if (zoomBefore < 1) {
        map.easeTo({
          center: centerBefore,
          zoom: 1,
          duration: 300,
        })
      }

      prevProjectionRef.current = nextProjection
    },
    [],
  )

  const landNoData = isDark ? LAND_NODATA_DARK : LAND_NODATA_LIGHT

  const fillExpr = useMemo(
    () =>
      buildFillColorExpression(
        mapData,
        valueMin,
        valueMax,
        category,
        landNoData,
        isDark,
      ),
    [mapData, valueMin, valueMax, category, landNoData, isDark],
  )

  const selectedKey = selectedIso?.trim().toUpperCase() ?? ''

  const borderLineColor: ExpressionSpecification = useMemo(
    () => [
      'case',
      ['==', ['upcase', ['get', 'iso3']], selectedKey],
      '#C8102E',
      ['boolean', ['feature-state', 'hover'], false],
      '#ffffff',
      '#000000',
    ],
    [selectedKey],
  )

  const borderLineWidth: ExpressionSpecification = useMemo(
    () => [
      'case',
      ['==', ['upcase', ['get', 'iso3']], selectedKey],
      2,
      ['boolean', ['feature-state', 'hover'], false],
      2,
      0.8,
    ],
    [selectedKey],
  )

  const fillExprRef = useRef(fillExpr)
  const borderLineColorRef = useRef(borderLineColor)
  const borderLineWidthRef = useRef(borderLineWidth)
  fillExprRef.current = fillExpr
  borderLineColorRef.current = borderLineColor
  borderLineWidthRef.current = borderLineWidth

  const isFullViewport = layout === 'fullViewport'
  const cardMapHeightPx = mapHeightPx ?? (narrow ? 350 : 500)
  const mapViewportMinHeight = narrow ? '60vh' : 'calc(100vh - 260px)'

  const [isFullscreen, setIsFullscreen] = useState(false)

  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false)
  }, [])

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v)
  }, [])

  const installChoropleth = (map: maplibregl.Map) => {
    const data = geojsonRef.current
    if (!data || map.getSource('countries')) return

    map.addSource('countries', {
      type: 'geojson',
      data: data as GeoJSON.GeoJSON,
      promoteId: 'iso3',
    })

    if (!map.getSource('country-centroids')) {
      const base = import.meta.env.BASE_URL?.replace(/\/$/, '') || ''
      map.addSource('country-centroids', {
        type: 'geojson',
        data: `${base}/data/world-centroids.geojson`,
      })
    }

    map.addLayer({
      id: 'country-fills',
      type: 'fill',
      source: 'countries',
      paint: {
        'fill-color': fillExprRef.current,
        'fill-opacity': 1.0,
      },
    })

    map.addLayer({
      id: 'country-borders',
      type: 'line',
      source: 'countries',
      paint: {
        'line-color': borderLineColorRef.current,
        'line-width': borderLineWidthRef.current,
      },
    })

    map.addLayer({
      id: 'country-borders-compare',
      type: 'line',
      source: 'countries',
      filter: ['literal', false] as maplibregl.FilterSpecification,
      paint: {
        'line-color': '#C8102E',
        'line-width': 1,
        'line-dasharray': [3, 2],
      },
    })

    map.addLayer({
      id: 'country-labels',
      type: 'symbol',
      source: 'country-centroids',
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 1, 7, 3, 10, 5, 13],
        'text-max-width': 6,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'symbol-placement': 'point',
        'text-anchor': 'center',
        'text-padding': 10,
      },
      paint: {
        'text-color': isDark ? '#ffffff' : '#0F0F0F',
        'text-halo-color': isDark ? '#1a1a2e' : '#F5F0E8',
        'text-halo-width': 1.5,
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 3, 1],
      },
    })

    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '280px',
      })
    }

    detachHandlers(map, handlersRef.current, hoveredIsoRef)

    const onClick = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      const raw = f?.properties?.iso3
      if (typeof raw !== 'string') return
      const me = e.originalEvent
      onSelectRef.current(normIso(raw), {
        meta: me.metaKey,
        ctrl: me.ctrlKey,
      })
    }

    const onMove = (e: maplibregl.MapLayerMouseEvent) => {
      const f = e.features?.[0]
      const raw = f?.properties?.iso3
      if (typeof raw !== 'string') return
      const promoteId = String(raw).trim()
      const iso = normIso(raw)
      const prevH = hoveredIsoRef.current
      if (prevH !== promoteId) {
        if (prevH) {
          try {
            map.setFeatureState({ source: 'countries', id: prevH }, { hover: false })
          } catch {
            /* ignore */
          }
        }
        hoveredIsoRef.current = promoteId
        try {
          map.setFeatureState(
            { source: 'countries', id: promoteId },
            { hover: true },
          )
        } catch {
          /* ignore */
        }
      }
      const rows = mapDataRef.current
      const row = rows.find((r) => normIso(r.country_code) === iso)
      const tc = cRef.current
      const name =
        nameByIsoRef.current.get(iso) ?? row?.country_name ?? iso
      const line1 =
        row?.value != null && !Number.isNaN(row.value)
          ? formatValueRef.current(row.value)
          : tRef.current('worldNoValue')
      const hint = tRef.current('worldOpenAnalysis')
      const html = `<div style="font-family:${escHtml(fonts.body)};font-size:13px;color:${escHtml(tc.text)};min-width:140px;">
        <div style="font-weight:700;margin-bottom:4px;">${escHtml(name)}</div>
        <div style="font-family:${escHtml(fonts.mono)};font-size:12px;">${escHtml(line1)}</div>
        <div style="margin-top:6px;color:${escHtml(tc.muted)};font-size:11px;">${escHtml(hint)}</div>
      </div>`
      popupRef.current!.setLngLat(e.lngLat).setHTML(html).addTo(map)
      map.getCanvas().style.cursor = 'pointer'
    }

    const onLeave = () => {
      const h = hoveredIsoRef.current
      if (h) {
        try {
          map.setFeatureState({ source: 'countries', id: h }, { hover: false })
        } catch {
          /* ignore */
        }
        hoveredIsoRef.current = null
      }
      popupRef.current?.remove()
      map.getCanvas().style.cursor = ''
    }

    const onContextMenu = (e: maplibregl.MapLayerMouseEvent) => {
      e.preventDefault()
      const cb = onCountryContextMenuRef.current
      if (!cb) return
      const f = e.features?.[0]
      const raw = f?.properties?.iso3
      if (typeof raw !== 'string') return
      const me = e.originalEvent
      cb(normIso(raw), e.lngLat, me.clientX, me.clientY)
    }

    handlersRef.current = { onClick, onMove, onLeave, onContextMenu }
    map.on('click', 'country-fills', onClick)
    map.on('mousemove', 'country-fills', onMove)
    map.on('mouseleave', 'country-fills', onLeave)
    map.on('contextmenu', 'country-fills', onContextMenu)
  }

  useEffect(() => {
    if (!geojson || !containerRef.current) return

    const styleUrl = isDark ? STYLE_DARK : STYLE_LIGHT
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [10, 30],
      zoom: 1.5,
      maxZoom: 8,
      minZoom: projectionRef.current === 'globe' ? 0 : 1,
      attributionControl: false,
    })

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    )
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: '© <a href="https://carto.com/" target="_blank" rel="noopener noreferrer">CARTO</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      }),
      'bottom-right',
    )
    mapRef.current = map
    prevThemeDarkRef.current = isDark

    const onLoad = () => {
      installChoropleth(map)
      hideBasemapLabels(map)
      applyProjection(map, projectionRef.current, 'init')
    }
    map.on('load', onLoad)

    return () => {
      map.off('load', onLoad)
      detachHandlers(map, handlersRef.current, hoveredIsoRef)
      handlersRef.current = undefined
      popupRef.current?.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
      prevThemeDarkRef.current = null
      prevProjectionRef.current = projectionRef.current
    }
  }, [geojson, applyProjection])

  useEffect(() => {
    if (!isFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isFullscreen])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const run = () => {
      map.resize()
    }
    requestAnimationFrame(run)
    const t = window.setTimeout(run, 160)
    return () => window.clearTimeout(t)
  }, [isFullscreen, mapViewportMinHeight, cardMapHeightPx, narrow, isFullViewport])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !geojson) return

    if (prevThemeDarkRef.current === null) return
    if (prevThemeDarkRef.current === isDark) return
    prevThemeDarkRef.current = isDark

    detachHandlers(map, handlersRef.current, hoveredIsoRef)
    handlersRef.current = undefined

    const styleUrl = isDark ? STYLE_DARK : STYLE_LIGHT
    map.setStyle(styleUrl)

    const onStyleReady = () => {
      installChoropleth(map)
      hideBasemapLabels(map)
      applyProjection(map, projectionRef.current, 'style')
    }
    map.once('style.load', onStyleReady)
    return () => {
      map.off('style.load', onStyleReady)
    }
  }, [isDark, geojson, applyProjection])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) return
    applyProjection(map, projection, 'change')
  }, [projection, applyProjection])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getSource('countries') || !geojson) return
    const src = map.getSource('countries') as maplibregl.GeoJSONSource
    src.setData(geojson as GeoJSON.GeoJSON)
  }, [geojson])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('country-fills')) return
    map.setPaintProperty('country-fills', 'fill-color', fillExpr)
    map.setPaintProperty('country-fills', 'fill-opacity', 1)
  }, [fillExpr])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('country-borders')) return
    map.setPaintProperty('country-borders', 'line-color', borderLineColor)
    map.setPaintProperty('country-borders', 'line-width', borderLineWidth)
  }, [borderLineColor, borderLineWidth])

  const compareListKey = compareIso3List.map(normIso).join(',')

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('country-borders-compare')) return
    const primaryKey = selectedIso?.trim().toUpperCase() ?? ''
    const list = compareIso3List
      .map(normIso)
      .filter((x) => x && x !== primaryKey)
    if (!list.length) {
      map.setFilter('country-borders-compare', ['literal', false])
      return
    }
    map.setFilter('country-borders-compare', [
      'all',
      ['in', ['upcase', ['get', 'iso3']], ['literal', list]],
      ['!=', ['upcase', ['get', 'iso3']], primaryKey],
    ] as maplibregl.FilterSpecification)
  }, [compareListKey, selectedIso])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('country-labels')) return
    map.setPaintProperty(
      'country-labels',
      'text-color',
      isDark ? '#ffffff' : '#0F0F0F',
    )
    map.setPaintProperty(
      'country-labels',
      'text-halo-color',
      isDark ? '#1a1a2e' : '#F5F0E8',
    )
  }, [isDark])

  const shellBase = useMemo(
    () => ({
      border: `1px solid ${c.border}`,
    }),
    [c.border],
  )

  const ctrlSurface = useMemo(
    () => ({
      background: c.cardBg,
      border: `1px solid ${c.border}`,
      color: c.text,
      zIndex: 30,
    }),
    [c.border, c.cardBg, c.text],
  )
  const fullscreenLabel = t('worldMapFullscreen') || 'Fullscreen'

  if (!geojson) {
    const barWidthsPct = [88, 72, 94, 68, 82]
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: isFullViewport ? '100%' : cardMapHeightPx,
          minHeight: isFullViewport ? '50vh' : mapViewportMinHeight,
          flex: isFullViewport ? 1 : undefined,
          borderRadius: isFullViewport ? 0 : 8,
          overflow: 'hidden',
          ...(isFullViewport ? {} : shellBase),
          background: c.bgAlt,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: isFullViewport ? spacing.lg : 20,
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            width: 'min(100%, 400px)',
          }}
          aria-hidden
        >
          {barWidthsPct.map((w, i) => (
            <div
              key={i}
              className="rp-skeleton-bar"
              style={{
                width: `${w}%`,
                height: 9,
                borderRadius: 5,
                background: c.subtle,
                animationDelay: `${i * 0.09}s`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontFamily: fonts.body,
            color: c.muted,
            fontSize: '0.9rem',
          }}
        >
          <LoadingSpinner />
          <span>{t('loading')}</span>
        </div>
      </div>
    )
  }

  const shellStyle = isFullscreen
    ? {
        position: 'fixed' as const,
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: c.bg,
        borderRadius: 0,
        overflow: 'hidden' as const,
        display: 'flex' as const,
        flexDirection: 'column' as const,
        border: 'none',
        boxShadow: 'none',
      }
    : isFullViewport
      ? {
          position: 'relative' as const,
          width: '100%',
          height: '100%',
          minHeight: 0,
          flex: 1,
          borderRadius: 0,
          overflow: 'hidden' as const,
          border: 'none',
          boxShadow: 'none',
        }
      : {
          position: 'relative' as const,
          width: '100%',
          height: cardMapHeightPx,
          minHeight: mapViewportMinHeight,
          borderRadius: 8,
          overflow: 'hidden' as const,
          ...shellBase,
          boxShadow: isDark
            ? '0 2px 16px rgba(0,0,0,0.45)'
            : '0 2px 12px rgba(0,0,0,0.06)',
        }

  return (
    <div
      className={`world-gl-map${isFullscreen ? ' world-gl-map--fullscreen' : ''}`}
      style={shellStyle}
    >
      <div
        ref={containerRef}
        className="world-gl-map__canvas-host"
        style={
          isFullscreen
            ? { flex: 1, minHeight: 0, width: '100%' }
            : isFullViewport
              ? { flex: 1, minHeight: 0, width: '100%' }
              : { width: '100%', height: '100%' }
        }
      />
      <div
        className="world-gl-map__watermark"
        aria-hidden
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          zIndex: 26,
          fontFamily: fonts.mono,
          fontSize: 11,
          opacity: 0.4,
          color: c.text,
          pointerEvents: 'none',
        }}
      >
        Res.Publica
      </div>
      {!isFullscreen && (
        <button
          type="button"
          className="world-gl-map__fs-btn"
          style={ctrlSurface}
          onClick={toggleFullscreen}
          title={fullscreenLabel}
          aria-label={fullscreenLabel}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 3 3 3 3 9" />
            <line x1="3" y1="3" x2="10" y2="10" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <polyline points="3 15 3 21 9 21" />
            <line x1="3" y1="21" x2="10" y2="14" />
            <polyline points="21 15 21 21 15 21" />
            <line x1="21" y1="21" x2="14" y2="14" />
          </svg>
        </button>
      )}
      {isFullscreen && (
        <button
          type="button"
          className="world-gl-map__close-fs"
          style={ctrlSurface}
          onClick={exitFullscreen}
          title={t('electionsClose')}
          aria-label={t('electionsClose')}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `${c.cardBg}cc`,
            zIndex: 2,
            fontFamily: fonts.body,
            fontSize: '0.95rem',
            color: c.muted,
            lineHeight: 1.4,
            pointerEvents: 'none',
          }}
        >
          {t('loading')}
        </div>
      )}
    </div>
  )
}
