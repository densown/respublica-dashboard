import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import type { KreiseGeoJson } from './types'

export type KreisSearchHit = {
  ags: string
  name: string
  state: string
}

export function filterKreiseSearchHits(
  geojson: KreiseGeoJson | null,
  query: string,
  maxResults = 8,
): KreisSearchHit[] {
  const q = query.trim()
  if (!geojson || q.length < 2) return []
  const ql = q.toLowerCase()
  const out: KreisSearchHit[] = []
  for (const f of geojson.features) {
    const name = String(f.properties.name ?? '')
    if (!name.toLowerCase().includes(ql)) continue
    const ags = f.properties.ags?.replace(/\s/g, '') ?? ''
    if (!ags) continue
    out.push({ ags, name, state: String(f.properties.state ?? '') })
    if (out.length >= maxResults) break
  }
  return out
}

function selectInputStyle(c: {
  inputBg: string
  inputBorder: string
  ink: string
}): CSSProperties {
  return {
    minHeight: 44,
    padding: '0 12px',
    borderRadius: 8,
    border: `1px solid ${c.inputBorder}`,
    background: c.inputBg,
    color: c.ink,
    fontFamily: fonts.body,
    fontSize: '0.9rem',
    width: '100%',
    boxSizing: 'border-box',
  }
}

export type KreisAutocompleteProps = {
  label: string
  placeholder: string
  /** Wenn gesetzt, wird als aria-label genutzt (sonst placeholder) */
  ariaLabel?: string
  narrow: boolean
  query: string
  onQueryChange: (q: string) => void
  results: KreisSearchHit[]
  onPick: (ags: string) => void
}

export function KreisAutocomplete({
  label,
  placeholder,
  ariaLabel,
  narrow,
  query,
  onQueryChange,
  results,
  onPick,
}: KreisAutocompleteProps) {
  const { c } = useTheme()
  const wrapRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = query.trim()
    if (t.length < 2) {
      setOpen(false)
      return
    }
    setOpen(results.length > 0)
  }, [query, results])

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      const root = wrapRef.current
      if (root && !root.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div
      ref={wrapRef}
      style={{
        flex: narrow ? '1 1 100%' : '1 1 240px',
        position: 'relative',
      }}
    >
      <span
        style={{
          display: 'block',
          fontFamily: fonts.body,
          fontSize: '0.8rem',
          color: c.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => {
          const tq = query.trim()
          if (tq.length >= 2 && results.length > 0) {
            setOpen(true)
          }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        autoComplete="off"
        style={{
          ...selectInputStyle(c),
          fontFamily: fonts.body,
          fontSize: '0.9rem',
        }}
      />
      {open && results.length > 0 && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            zIndex: 10,
            background: c.surface,
            border: `1px solid ${c.border}`,
            boxShadow: c.shadow,
            borderRadius: 8,
            maxHeight: 300,
            overflowY: 'auto',
          }}
        >
          {results.map((hit, i) => (
            <button
              key={hit.ags}
              type="button"
              role="option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onPick(hit.ags)
                setOpen(false)
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                borderBottom:
                  i < results.length - 1 ? `1px solid ${c.border}` : 'none',
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: fonts.body,
                fontSize: '0.9rem',
                color: c.ink,
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = c.bgHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <span>{hit.name}</span>
              {hit.state ? (
                <span style={{ color: c.muted }}> · {hit.state}</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
