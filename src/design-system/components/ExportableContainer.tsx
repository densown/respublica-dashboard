import { useCallback, useRef, useState, type MutableRefObject, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import type maplibregl from 'maplibre-gl'
import { spacing, radius, motion } from '../tokens'
import { useTheme } from '../ThemeContext'
import { footerSourcesLineKey } from '../../data/sourcesCatalog'
import { FORMAT_PRESETS, type ExportFormat } from '../export/exportFormats'
import { captureElement, captureMapLibre } from '../export/exportCapture'
import { composeExport, type ComposeMeta } from '../export/exportCompose'
import { downloadBlob, buildFilename } from '../export/exportDownload'
import { ExportFormatPicker } from './ExportFormatPicker'

export type ExportableContainerProps = {
  title: string
  source?: string
  mapRef?: MutableRefObject<maplibregl.Map | null>
  children: ReactNode
  /**
   * Reicht Hoehe/Flex an die Children durch (display:flex column, flex:1).
   * Noetig, wenn der Inhalt die volle Hoehe des Elternelements fuellen soll
   * (z. B. die fullViewport-Weltkarte). Ohne fill kollabiert ein
   * height:100%-Inhalt auf 0, weil die beiden Wrapper-Divs die Layout-Kette
   * unterbrechen.
   */
  fill?: boolean
}

export function ExportableContainer({
  title,
  source,
  mapRef,
  children,
  fill = false,
}: ExportableContainerProps) {
  const { c, t, lang } = useTheme()
  const location = useLocation()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hovered, setHovered] = useState(false)

  const resolvedSource = source ?? t(footerSourcesLineKey(location.pathname))

  const pageSlug = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard'

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      if (!containerRef.current) return
      setLoading(true)
      try {
        const preset = FORMAT_PRESETS[format]

        let dataUrl: string
        if (mapRef?.current) {
          dataUrl = captureMapLibre(mapRef.current)
        } else {
          dataUrl = await captureElement(containerRef.current, {
            pixelRatio: preset.pixelRatio,
            backgroundColor: c.bg,
          })
        }

        const meta: ComposeMeta = {
          title,
          source: resolvedSource,
          colors: {
            bg: c.bg,
            ink: c.ink,
            red: c.red,
            muted: c.muted,
            border: c.border,
          },
          lang,
        }

        const blob = await composeExport(dataUrl, preset, meta)
        const filename = buildFilename(pageSlug, title, preset.filenameSuffix)
        downloadBlob(blob, filename)
      } catch (err) {
        console.error('[export]', err)
      } finally {
        setLoading(false)
        setShowPicker(false)
      }
    },
    [c, lang, mapRef, pageSlug, resolvedSource, title],
  )

  return (
    <div
      style={{
        position: 'relative',
        ...(fill
          ? {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              width: '100%',
            }
          : {}),
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false)
        if (!loading) setShowPicker(false)
      }}
    >
      <div
        ref={containerRef}
        style={
          fill
            ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }
            : undefined
        }
      >
        {children}
      </div>

      <div
        data-export-ignore="true"
        style={{
          position: 'absolute',
          top: spacing.sm,
          right: spacing.sm,
          opacity: hovered || showPicker ? 1 : 0,
          transition: `opacity ${motion.fast} ${motion.easing}`,
          pointerEvents: hovered || showPicker ? 'auto' : 'none',
        }}
      >
        <button
          type="button"
          aria-label={t('exportPng')}
          onClick={() => setShowPicker((p) => !p)}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${c.border}`,
            borderRadius: radius.md,
            background: c.bgAlt,
            color: c.inkSoft,
            cursor: 'pointer',
            fontSize: '0.85rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
            transition: `background ${motion.fast} ${motion.easing}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = c.bgHover
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = c.bgAlt
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M2 11v2.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V11M4.5 7L8 10.5 11.5 7M8 1v9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showPicker && (
          <ExportFormatPicker
            onSelect={handleExport}
            onClose={() => setShowPicker(false)}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
