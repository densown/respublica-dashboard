import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import { useTheme } from '../../design-system'
import { fonts } from '../../design-system/tokens'
import { statePrefixFromAgs } from './partyColors'
import type { RankingRow, WahlenState } from './types'

type SortKey = 'rank' | 'name' | 'state' | 'value'

type RankingTableProps = {
  rows: RankingRow[]
  states: WahlenState[] | null
  onRowClick: (ags: string) => void
}

function stateNameForAgs(
  ags: string,
  states: WahlenState[] | null,
): string {
  const code = statePrefixFromAgs(ags)
  const hit = states?.find((s) => s.code === code)
  return hit?.name ?? code
}

export function RankingTable({ rows, states, onRowClick }: RankingTableProps) {
  const { c, t, lang } = useTheme()
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const enriched = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      stateName: stateNameForAgs(r.ags, states),
    }))
  }, [rows, states])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const copy = [...enriched]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'rank':
          cmp = a.rank - b.rank
          break
        case 'name':
          cmp = a.name.localeCompare(b.name, lang)
          break
        case 'state':
          cmp = a.stateName.localeCompare(b.stateName, lang)
          break
        case 'value':
          cmp = a.value - b.value
          break
        default:
          cmp = 0
      }
      return cmp * dir
    })
    return copy
  }, [enriched, sortKey, sortDir, lang])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'value' ? 'desc' : 'asc')
    }
  }

  const exportCsv = useCallback(() => {
    const header = [t('rank'), t('electionsDistrict'), t('electionsBundesland'), t('electionsShare')]
      .map((h) => `"${h}"`)
      .join(';')
    const lines = sorted.map((r) =>
      [r.rank, `"${r.name}"`, `"${r.stateName}"`, r.value.toFixed(2).replace('.', ',')].join(
        ';',
      ),
    )
    const blob = new Blob([`\uFEFF${header}\n${lines.join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'ranking.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }, [sorted, t])

  const thBase: CSSProperties = {
    textAlign: 'left',
    padding: '12px 10px',
    borderBottom: `1px solid ${c.border}`,
    color: c.muted,
    fontFamily: fonts.body,
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: 44,
    userSelect: 'none',
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          type="button"
          onClick={exportCsv}
          style={{
            minHeight: 44,
            padding: '0 14px',
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.inputBg,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          {t('exportCsv')}
        </button>
      </div>
      <div style={{ overflowX: 'auto', border: `1px solid ${c.border}`, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body }}>
          <thead>
            <tr style={{ background: c.bgAlt }}>
              <th style={thBase} onClick={() => toggleSort('rank')}>
                {t('rank')}
                {sortKey === 'rank' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
              <th style={thBase} onClick={() => toggleSort('name')}>
                {t('electionsDistrict')}
                {sortKey === 'name' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
              <th style={thBase} onClick={() => toggleSort('state')}>
                {t('electionsBundesland')}
                {sortKey === 'state' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
              <th style={{ ...thBase, textAlign: 'right' }} onClick={() => toggleSort('value')}>
                {t('electionsShare')}
                {sortKey === 'value' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.ags}
                onClick={() => onRowClick(r.ags)}
                style={{
                  cursor: 'pointer',
                  borderBottom: `1px solid ${c.border}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = c.bgHover
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                <td style={{ padding: '12px 10px', fontFamily: fonts.mono, fontSize: '0.85rem' }}>
                  {r.rank}
                </td>
                <td style={{ padding: '12px 10px', fontSize: '0.9rem', color: c.ink }}>{r.name}</td>
                <td style={{ padding: '12px 10px', fontSize: '0.85rem', color: c.inkSoft }}>
                  {r.stateName}
                </td>
                <td
                  style={{
                    padding: '12px 10px',
                    textAlign: 'right',
                    fontFamily: fonts.mono,
                    fontSize: '0.85rem',
                  }}
                >
                  {r.value.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
