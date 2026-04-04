import { useMemo, useState } from 'react'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import type { WorldGeoJson } from './worldTypes'

type CountryAutocompleteProps = {
  geojson: WorldGeoJson | null
  onSelect: (iso3: string) => void
  placeholder: string
}

export function CountryAutocomplete({
  geojson,
  onSelect,
  placeholder,
}: CountryAutocompleteProps) {
  const { c, t } = useTheme()
  const [q, setQ] = useState('')

  const hits = useMemo(() => {
    if (!geojson?.features?.length) return []
    const s = q.trim().toLowerCase()
    if (s.length < 2) return []
    const out: { iso3: string; name: string }[] = []
    for (const f of geojson.features) {
      const iso3 = f.properties.iso3?.toUpperCase()
      const name = f.properties.name ?? ''
      if (!iso3) continue
      if (
        name.toLowerCase().includes(s) ||
        iso3.toLowerCase().includes(s)
      ) {
        out.push({ iso3, name })
      }
      if (out.length >= 12) break
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [geojson, q])

  return (
    <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0 }}>
      <input
        type="search"
        value={q}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setQ(e.target.value)}
        style={{
          width: '100%',
          minHeight: 44,
          boxSizing: 'border-box',
          fontFamily: fonts.body,
          fontSize: '0.9rem',
          padding: '0 12px',
          borderRadius: 8,
          border: `1px solid ${c.inputBorder}`,
          background: c.inputBg,
          color: c.text,
        }}
      />
      {hits.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 4,
            position: 'absolute',
            zIndex: 20,
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            background: c.surface,
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            boxShadow: c.shadow,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {hits.map((h) => (
            <li key={h.iso3}>
              <button
                type="button"
                onClick={() => {
                  onSelect(h.iso3)
                  setQ('')
                }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  fontSize: '0.85rem',
                  color: c.text,
                  padding: '8px 10px',
                  borderRadius: 4,
                }}
              >
                {h.name}{' '}
                <span style={{ color: c.muted, fontFamily: fonts.mono }}>
                  ({h.iso3})
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length >= 2 && hits.length === 0 && (
        <div
          style={{
            marginTop: 6,
            fontSize: '0.8rem',
            color: c.muted,
            fontFamily: fonts.body,
          }}
        >
          {t('worldSearchNoHits')}
        </div>
      )}
    </div>
  )
}
