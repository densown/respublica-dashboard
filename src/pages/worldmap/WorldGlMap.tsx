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
import { dark, fontSize, fonts, light, radius, spacing } from '../../design-system/tokens'
import { worldFillColor } from './worldColors'
import type { WorldGeoJson, WorldMapRow } from './worldTypes'
import { ON_DATA_DARK, ON_DATA_LIGHT } from '../../design-system/palettes'


const LAND_NODATA_LIGHT = light.mapLandNoData
const LAND_NODATA_DARK = dark.mapLandNoData
const GLOBE_BOUNDS: maplibregl.LngLatBoundsLike = [
  [-179.5, -80],
  [179.5, 85],
]

const WASSER_DUNKEL = dark.mapWater
const WASSER_HELL = light.mapWater

/** Ausschnitt beim ersten Laden: die bewohnte Welt ohne Antarktis. */
const WELT_AUSSCHNITT: maplibregl.LngLatBoundsLike = [
  [-168, -56],
  [178, 76],
]

/**
 * Stil der Karte, ganz ohne Netz: Wasser als Flaeche, die Laender kommen aus
 * dem eigenen GeoJSON. Frueher lag eine Basiskarte von CARTO darunter. Sie
 * war unter den Laenderflaechen kaum zu sehen, und wenn sie auf dem Handy
 * nicht lud, blieb die Karte schwarz. Ohne `glyphs` zeichnet MapLibre die
 * Beschriftung mit einer Schrift des Geraets.
 */
function lokalerStil(isDark: boolean): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': isDark ? WASSER_DUNKEL : WASSER_HELL,
        },
      },
    ],
  }
}

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
): ExpressionSpecification | string {
  const expr: unknown[] = [
    'match',
    ['upcase', ['get', 'iso3']] as ExpressionSpecification,
  ]
  // Jeder Laendercode darf nur einmal vorkommen, sonst lehnt MapLibre den
  // ganzen Ausdruck ab.
  const gesehen = new Set<string>()
  for (const r of rows) {
    const iso = normIso(r.country_code)
    const v = r.value
    if (v == null || Number.isNaN(v) || !iso || gesehen.has(iso)) continue
    gesehen.add(iso)
    expr.push(
      iso,
      worldFillColor(v, valueMin, valueMax, category, {
        darkBasemap,
      }),
    )
  }
  // Ohne Werte (Daten noch unterwegs) waere ein 'match' ohne Zweige
  // ungueltig: MapLibre verwirft dann beim Laden die ganze Laenderflaeche,
  // und der Globus bleibt leer. Dann einfach alle Laender in "keine Daten".
  if (expr.length === 2) return noDataColor
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

  /** Erst wenn Stil und Laenderflaechen stehen; bis dahin liegt ein Ladehinweis ueber der Karte. */
  const [bereit, setBereit] = useState(false)
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
  const onCountryContextMenuRef = useRef(onCountryContextMenu)
  const projectionRef = useRef<MapProjectionMode>(projection)
  projectionRef.current = projection
  mapDataRef.current = mapData
  geojsonRef.current = geojson
  onSelectRef.current = onSelectCountry
  formatValueRef.current = formatValue
  nameByIsoRef.current = nameByIso
  tRef.current = t
  onCountryContextMenuRef.current = onCountryContextMenu

  const applyProjection = useCallback(
    (map: maplibregl.Map, nextProjection: MapProjectionMode, source: 'init' | 'change' | 'style') => {
      const previousProjection = prevProjectionRef.current
      const zoomBefore = map.getZoom()
      const centerBefore = map.getCenter()

      try {
        map.setMinZoom(nextProjection === 'globe' ? 0 : 0.4)
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
      } else if (zoomBefore < 0.4) {
        map.easeTo({
          center: centerBefore,
          zoom: 0.4,
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
  // Grenzen in der Farbe des Papiers: sie trennen, ohne das Bild zu vergittern.
  const grenzFarbe = isDark ? dark.mapWater : light.mapLabelHalo

  const borderLineColor: ExpressionSpecification = useMemo(
    () => [
      'case',
      ['==', ['upcase', ['get', 'iso3']], selectedKey],
      c.red,
      ['boolean', ['feature-state', 'hover'], false],
      c.ink,
      grenzFarbe,
    ],
    [selectedKey, c.red, c.ink, grenzFarbe],
  )

  const borderLineWidth: ExpressionSpecification = useMemo(
    () => [
      'case',
      ['==', ['upcase', ['get', 'iso3']], selectedKey],
      2,
      ['boolean', ['feature-state', 'hover'], false],
      1.5,
      0.6,
    ],
    [selectedKey],
  )

  // Beschriftung in der Sprache der Oberflaeche, Rueckfall auf den Namen der Geodaten
  const labelExpr: ExpressionSpecification = useMemo(() => {
    const paare: string[] = []
    for (const [iso, name] of nameByIso) paare.push(iso, name)
    if (!paare.length) return ['get', 'name']
    return ['match', ['upcase', ['get', 'iso3']], ...paare, ['get', 'name']] as unknown as ExpressionSpecification
  }, [nameByIso])
  const labelExprRef = useRef(labelExpr)
  labelExprRef.current = labelExpr

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
        'line-color': c.red,
        'line-width': 1,
        'line-dasharray': [3, 2],
      },
    })

    map.addLayer({
      id: 'country-labels',
      type: 'symbol',
      source: 'country-centroids',
      layout: {
        'text-field': labelExprRef.current,
        'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 4, 12, 6, 14],
        'text-max-width': 6,
        'text-allow-overlap': false,
        'text-ignore-placement': false,
        'symbol-placement': 'point',
        'text-anchor': 'center',
        'text-padding': 14,
      },
      // Ganz herausgezoomt bleibt die Karte ohne Schrift: die Namen stehen im
      // Hinweis beim Antippen, und kleine Laender waeren sonst zugestellt.
      minzoom: 2.2,
      paint: {
        'text-color': isDark ? ON_DATA_LIGHT : ON_DATA_DARK,
        'text-halo-color': isDark ? dark.mapLabelHalo : light.mapLabelHalo,
        'text-halo-width': 1.5,
        'text-opacity': 0.9,
      },
    })

    if (!popupRef.current) {
      popupRef.current = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: '280px',
        className: 'world-gl-popup',
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
      // Mit dem Finger gibt es kein Schweben: der Hinweis bliebe nach dem
      // Antippen ueber der Karte stehen. Dort zeigt das Blatt von unten alles.
      if (window.matchMedia?.('(hover: none)').matches) return
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
      const name =
        nameByIsoRef.current.get(iso) ?? row?.country_name ?? iso
      const line1 =
        row?.value != null && !Number.isNaN(row.value)
          ? formatValueRef.current(row.value)
          : tRef.current('worldNoValue')
      const hint = tRef.current('worldOpenAnalysis')
      // Feste helle Textfarben: der Popup-Hintergrund ist in beiden Themes dunkel
      // (siehe .world-gl-popup in worldGlMap.css), damit über hell wie dunkel
      // eingefärbten Ländern genug Kontrast bleibt.
      const html = `<div style="font-family:${escHtml(fonts.body)};font-size:13px;color:#F5F0E8;min-width:140px;">
        <div style="font-weight:700;margin-bottom:4px;color:#FFFFFF;">${escHtml(name)}</div>
        <div style="font-family:${escHtml(fonts.mono)};font-size:12px;">${escHtml(line1)}</div>
        <div style="margin-top:6px;color:rgba(255,255,255,0.62);font-size:11px;">${escHtml(hint)}</div>
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

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: lokalerStil(isDark),
      center: [10, 30],
      zoom: 1.5,
      maxZoom: 8,
      // Hochkant passt die ganze Welt erst unter Zoom 1 in die Breite
      minZoom: projectionRef.current === 'globe' ? 0 : 0.4,
      attributionControl: false,
      // Kein Drehen und Kippen: auf dem Handy verdrehte sich die Karte beim
      // Zoomen mit zwei Fingern und stand danach schief.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      localIdeographFontFamily: "'Source Serif 4', Georgia, serif",
    })
    map.touchZoomRotate.disableRotation()
    map.keyboard.disableRotation()

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    )
    mapRef.current = map
    prevThemeDarkRef.current = isDark

    let settled = false
    const finishInit = () => {
      if (settled) return
      settled = true
      installChoropleth(map)
      map.resize()
      if (projectionRef.current !== 'globe') {
        // Die ganze Welt in den Rahmen, egal ob Handy hochkant oder Desktop
        map.fitBounds(WELT_AUSSCHNITT, { padding: 12, animate: false })
      }
      applyProjection(map, projectionRef.current, 'init')
      setBereit(true)
    }
    map.on('load', finishInit)
    // Der Ladehinweis darf nie haengen bleiben.
    const hinweisAus = window.setTimeout(() => setBereit(true), 8000)

    return () => {
      window.clearTimeout(hinweisAus)
      map.off('load', finishInit)
      detachHandlers(map, handlersRef.current, hoveredIsoRef)
      handlersRef.current = undefined
      popupRef.current?.remove()
      popupRef.current = null
      map.remove()
      mapRef.current = null
      setBereit(false)
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

    const onStyleReady = () => {
      installChoropleth(map)
      applyProjection(map, projectionRef.current, 'style')
    }
    map.once('style.load', onStyleReady)
    map.setStyle(lokalerStil(isDark))

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
    map.setLayoutProperty('country-labels', 'text-field', labelExpr)
  }, [labelExpr])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('country-labels')) return
    map.setPaintProperty(
      'country-labels',
      'text-color',
      isDark ? ON_DATA_LIGHT : ON_DATA_DARK,
    )
    map.setPaintProperty(
      'country-labels',
      'text-halo-color',
      isDark ? dark.mapLabelHalo : light.mapLabelHalo,
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
                borderRadius: radius.sm,
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
            fontSize: fontSize.md,
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
        height: '100dvh',
        zIndex: 9999,
        background: c.bg,
        borderRadius: radius.xs,
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
          borderRadius: radius.xs,
          overflow: 'hidden' as const,
          border: 'none',
          boxShadow: 'none',
        }
      : {
          position: 'relative' as const,
          width: '100%',
          height: cardMapHeightPx,
          minHeight: mapViewportMinHeight,
          borderRadius: radius.lg,
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
      {!bereit && (
        <div
          role="status"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 25,
            background: c.bgAlt,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            color: c.muted,
          }}
        >
          <LoadingSpinner />
          <span>{t('loading')}</span>
        </div>
      )}
      <div
        className="world-gl-map__watermark"
        aria-hidden
        style={{
          position: 'absolute',
          right: 10,
          bottom: 8,
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
            fontSize: fontSize.base,
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
