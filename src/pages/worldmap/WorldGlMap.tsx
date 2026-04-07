import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import maplibregl from 'maplibre-gl'
import type { ExpressionSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './worldGlMap.css'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import { worldFillColor } from './worldColors'
import type { WorldGeoJson, WorldMapRow } from './worldTypes'

const STYLE_LIGHT =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const STYLE_DARK =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

const LAND_NODATA_LIGHT = '#e0e0e0'
const LAND_NODATA_DARK = '#3a3a3a'

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
  onSelectCountry: (iso3: string) => void
  selectedIso?: string | null
  formatValue: (v: number | null | undefined) => string
  loading?: boolean
  narrow?: boolean
  /** Kartenhöhe in px (Mobile-first; Standard 350 / 500) */
  mapHeightPx?: number
}

type MapHandlers = {
  onClick: (e: maplibregl.MapLayerMouseEvent) => void
  onMove: (e: maplibregl.MapLayerMouseEvent) => void
  onLeave: () => void
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

export function WorldGlMap({
  geojson,
  mapData,
  category,
  valueMin,
  valueMax,
  nameByIso,
  onSelectCountry,
  selectedIso,
  formatValue,
  loading,
  narrow,
  mapHeightPx,
}: WorldGlMapProps) {
  const { c, t, theme } = useTheme()
  const isDark = theme === 'dark'

  const mapRef = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const handlersRef = useRef<MapHandlers | undefined>(undefined)
  const prevThemeDarkRef = useRef<boolean | null>(null)
  const hoveredIsoRef = useRef<string | null>(null)

  const mapDataRef = useRef(mapData)
  const geojsonRef = useRef(geojson)
  const onSelectRef = useRef(onSelectCountry)
  const formatValueRef = useRef(formatValue)
  const nameByIsoRef = useRef(nameByIso)
  const tRef = useRef(t)
  const cRef = useRef(c)
  mapDataRef.current = mapData
  geojsonRef.current = geojson
  onSelectRef.current = onSelectCountry
  formatValueRef.current = formatValue
  nameByIsoRef.current = nameByIso
  tRef.current = t
  cRef.current = c

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
      isDark ? '#666666' : '#cccccc',
    ],
    [selectedKey, isDark],
  )

  const borderLineWidth: ExpressionSpecification = useMemo(
    () => [
      'case',
      ['==', ['upcase', ['get', 'iso3']], selectedKey],
      2,
      ['boolean', ['feature-state', 'hover'], false],
      2,
      0.5,
    ],
    [selectedKey],
  )

  const fillExprRef = useRef(fillExpr)
  const borderLineColorRef = useRef(borderLineColor)
  const borderLineWidthRef = useRef(borderLineWidth)
  fillExprRef.current = fillExpr
  borderLineColorRef.current = borderLineColor
  borderLineWidthRef.current = borderLineWidth

  const mapHeight =
    mapHeightPx ?? (narrow ? 350 : 500)

  const installChoropleth = (map: maplibregl.Map) => {
    const data = geojsonRef.current
    if (!data || map.getSource('countries')) return

    map.addSource('countries', {
      type: 'geojson',
      data: data as GeoJSON.GeoJSON,
      promoteId: 'iso3',
    })

    map.addLayer({
      id: 'country-fills',
      type: 'fill',
      source: 'countries',
      paint: {
        'fill-color': fillExprRef.current,
        'fill-opacity': 0.9,
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
      onSelectRef.current(normIso(raw))
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

    handlersRef.current = { onClick, onMove, onLeave }
    map.on('click', 'country-fills', onClick)
    map.on('mousemove', 'country-fills', onMove)
    map.on('mouseleave', 'country-fills', onLeave)
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
      minZoom: 1,
    })

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    )
    mapRef.current = map
    prevThemeDarkRef.current = isDark

    const onLoad = () => {
      installChoropleth(map)
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
    }
  }, [geojson])

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
    }
    map.once('load', onStyleReady)
    return () => {
      map.off('load', onStyleReady)
    }
  }, [isDark, geojson])

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
    map.setPaintProperty('country-fills', 'fill-opacity', 0.9)
  }, [fillExpr])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('country-borders')) return
    map.setPaintProperty('country-borders', 'line-color', borderLineColor)
    map.setPaintProperty('country-borders', 'line-width', borderLineWidth)
  }, [borderLineColor, borderLineWidth])

  if (!geojson) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: mapHeight,
          borderRadius: 8,
          overflow: 'hidden',
          border: `1px solid ${c.border}`,
          background: c.cardBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: fonts.body,
          color: c.muted,
          fontSize: '0.95rem',
        }}
      >
        {t('loading')}
      </div>
    )
  }

  return (
    <div
      className="world-gl-map"
      style={{
        position: 'relative',
        width: '100%',
        height: mapHeight,
        borderRadius: 8,
        overflow: 'hidden',
        border: `1px solid ${c.border}`,
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
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
