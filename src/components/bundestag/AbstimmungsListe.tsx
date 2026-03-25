import { useMemo, useState } from 'react'
import { DataCard, useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'

export interface AbstimmungsListeProps {
  abstimmungen: { poll_id: number; poll_titel: string; poll_datum: string }[]
  activePollId?: number
  onSelect: (pollId: number) => void
}

const VISIBLE_DEFAULT = 10

export function AbstimmungsListe({
  abstimmungen,
  activePollId,
  onSelect,
}: AbstimmungsListeProps) {
  const { c, t } = useTheme()
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return abstimmungen
    return abstimmungen.filter((a) =>
      a.poll_titel.toLowerCase().includes(q),
    )
  }, [abstimmungen, query])

  const visible = showAll ? filtered : filtered.slice(0, VISIBLE_DEFAULT)
  const hasMore = filtered.length > VISIBLE_DEFAULT

  return (
    <div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          marginBottom: spacing.md,
        }}
      >
        <span
          style={{
            fontFamily: fonts.mono,
            fontSize: '0.65rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: c.muted,
          }}
        >
          {t('selectVote')}
        </span>
        <input
          type="search"
          placeholder={t('searchVotes')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: '1 1 200px',
            maxWidth: 320,
            padding: `${spacing.md}px ${spacing.lg}px`,
            border: `1px solid ${c.inputBorder}`,
            borderRadius: 6,
            background: c.inputBg,
            color: c.ink,
            fontFamily: fonts.mono,
            fontSize: '0.8rem',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = c.red
          }}
          onBlur={(e) => {
            e.target.style.borderColor = c.inputBorder
          }}
        />
      </div>

      <div
        style={{
          maxHeight: 400,
          overflowY: 'auto',
          paddingRight: spacing.sm,
          scrollbarWidth: 'thin',
          scrollbarColor: `${c.border} transparent`,
        }}
      >
        {visible.map((a) => {
          const active = activePollId === a.poll_id
          return (
            <div key={a.poll_id} style={{ marginBottom: spacing.sm }}>
              <DataCard
                active={active}
                onClick={() => onSelect(a.poll_id)}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: spacing.md,
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: c.ink,
                      flex: '1 1 200px',
                      lineHeight: 1.35,
                    }}
                  >
                    {a.poll_titel}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: '0.7rem',
                      color: c.muted,
                      flexShrink: 0,
                    }}
                  >
                    {a.poll_datum}
                  </span>
                </div>
              </DataCard>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          style={{
            marginTop: spacing.md,
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            fontFamily: fonts.mono,
            fontSize: '0.68rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: c.red,
          }}
        >
          {showAll ? t('showLess') : t('showAll')}
        </button>
      )}
    </div>
  )
}
