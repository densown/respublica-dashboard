import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import type { Lang } from '../../design-system/ThemeContext'
import type { I18nKey } from '../../design-system/i18n'
import { MAIN_PARTIES, PARTY_LABELS } from './partyColors'
import { toDisplayPercent } from './normalizeWahlen'
import type { ElectionType, RegionElectionRow } from './types'

const PAGE_SIZE = 20

export type HistoricalSortKey =
  | 'year'
  | 'typ'
  | 'turnout'
  | 'cdu_csu'
  | 'spd'
  | 'gruene'
  | 'afd'
  | 'bsw'
  | 'linke_pds'
  | 'fdp'
  | 'winner'

type HistoricalTableProps = {
  lang: Lang
  t: (k: I18nKey) => string
  rows: RegionElectionRow[]
  typeLabel: (typ: ElectionType) => string
}

function rawShare(row: RegionElectionRow, key: string): number {
  const n = Number(row[key])
  return Number.isFinite(n) ? n : 0
}

function winnerKey(row: RegionElectionRow): string {
  let best = ''
  let bestV = -1
  for (const p of MAIN_PARTIES) {
    const v = toDisplayPercent(rawShare(row, p))
    if (v > bestV) {
      bestV = v
      best = p
    }
  }
  return best
}

function cellPct(row: RegionElectionRow, key: string, lang: Lang): string {
  const v = toDisplayPercent(rawShare(row, key))
  if (v <= 0) return '—'
  const sep = lang === 'de' ? ',' : '.'
  return `${v.toFixed(1).replace('.', sep)} %`
}

export function HistoricalTable({
  lang,
  t,
  rows,
  typeLabel,
}: HistoricalTableProps) {
  const { c } = useTheme()
  const [sortKey, setSortKey] = useState<HistoricalSortKey>('year')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)

  const enriched = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        _winner: winnerKey(r),
      })),
    [rows],
  )

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    const copy = [...enriched]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'year':
          cmp = a.year - b.year
          break
        case 'typ':
          cmp = String(a.typ).localeCompare(String(b.typ), lang)
          break
        case 'turnout':
          cmp =
            toDisplayPercent(Number(a.turnout)) -
            toDisplayPercent(Number(b.turnout))
          break
        case 'winner': {
          const la = PARTY_LABELS[a._winner]?.[lang] ?? a._winner
          const lb = PARTY_LABELS[b._winner]?.[lang] ?? b._winner
          cmp = la.localeCompare(lb, lang)
          break
        }
        default:
          cmp =
            toDisplayPercent(rawShare(a, sortKey)) -
            toDisplayPercent(rawShare(b, sortKey))
      }
      return cmp * dir
    })
    return copy
  }, [enriched, sortKey, sortDir, lang])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))

  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, pageCount - 1)))
  }, [pageCount])

  const pageSafe = Math.min(page, pageCount - 1)
  const pageRows = sorted.slice(
    pageSafe * PAGE_SIZE,
    pageSafe * PAGE_SIZE + PAGE_SIZE,
  )

  const toggleSort = (key: HistoricalSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      if (key === 'typ' || key === 'winner') setSortDir('asc')
      else setSortDir('desc')
    }
    setPage(0)
  }

  const exportCsv = useCallback(() => {
    const sep = lang === 'de' ? ';' : ','
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`
    const headers = [
      t('electionYear'),
      t('electionType'),
      t('turnout'),
      'CDU/CSU',
      'SPD',
      PARTY_LABELS.gruene[lang],
      'AfD',
      'BSW',
      PARTY_LABELS.linke_pds[lang],
      'FDP',
      t('winningParty'),
    ]
    const lines = sorted.map((r) => {
      const w = PARTY_LABELS[r._winner]?.[lang] ?? r._winner
      return [
        r.year,
        q(typeLabel(r.typ as ElectionType)),
        toDisplayPercent(Number(r.turnout)).toFixed(2).replace('.', lang === 'de' ? ',' : '.'),
        toDisplayPercent(rawShare(r, 'cdu_csu')).toFixed(2).replace('.', lang === 'de' ? ',' : '.'),
        toDisplayPercent(rawShare(r, 'spd')).toFixed(2).replace('.', lang === 'de' ? ',' : '.'),
        toDisplayPercent(rawShare(r, 'gruene')).toFixed(2).replace('.', lang === 'de' ? ',' : '.'),
        toDisplayPercent(rawShare(r, 'afd')).toFixed(2).replace('.', lang === 'de' ? ',' : '.'),
        toDisplayPercent(rawShare(r, 'bsw')).toFixed(2).replace('.', lang === 'de' ? ',' : '.'),
        toDisplayPercent(rawShare(r, 'linke_pds')).toFixed(2).replace('.', lang === 'de' ? ',' : '.'),
        toDisplayPercent(rawShare(r, 'fdp')).toFixed(2).replace('.', lang === 'de' ? ',' : '.'),
        q(w),
      ].join(sep)
    })
    const blob = new Blob([`\uFEFF${headers.join(sep)}\n${lines.join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `wahlen-historisch-${lang}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [sorted, t, typeLabel, lang])

  const th = (key: HistoricalSortKey, label: string) => (
    <th
      style={{
        textAlign: 'left',
        padding: '8px 10px',
        borderBottom: `2px solid ${c.border}`,
        cursor: 'pointer',
        fontFamily: fonts.body,
        fontSize: '0.78rem',
        color: sortKey === key ? c.red : c.muted,
        whiteSpace: 'nowrap',
      }}
    >
      <button
        type="button"
        onClick={() => toggleSort(key)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'inherit',
          font: 'inherit',
        }}
      >
        {label}
        {sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ marginBottom: spacing.md, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button
          type="button"
          onClick={exportCsv}
          style={{
            minHeight: 40,
            padding: '0 14px',
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            color: c.text,
            fontFamily: fonts.mono,
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          {t('exportCsv')}
        </button>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: fonts.mono,
          fontSize: '0.78rem',
        }}
      >
        <thead>
          <tr>
            {th('year', String(t('electionYear')))}
            {th('typ', String(t('electionType')))}
            {th('turnout', String(t('turnout')))}
            {th('cdu_csu', 'CDU')}
            {th('spd', 'SPD')}
            {th('gruene', String(PARTY_LABELS.gruene[lang]))}
            {th('afd', 'AfD')}
            {th('bsw', 'BSW')}
            {th('linke_pds', String(PARTY_LABELS.linke_pds[lang]))}
            {th('fdp', 'FDP')}
            {th('winner', String(t('winningParty')))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r, i) => (
            <tr
              key={`${r.typ}-${r.year}-${i}`}
              style={{
                borderBottom: `1px solid ${c.border}`,
                background:
                  (pageSafe * PAGE_SIZE + i) % 2 === 0 ? c.cardBg : c.bg,
              }}
            >
              <td style={{ padding: '8px 10px', color: c.text }}>{r.year}</td>
              <td style={{ padding: '8px 10px', color: c.inkSoft }}>
                {typeLabel(r.typ as ElectionType)}
              </td>
              <td style={{ padding: '8px 10px' }}>
                {`${toDisplayPercent(Number(r.turnout)).toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`}
              </td>
              <td style={{ padding: '8px 10px' }}>{cellPct(r, 'cdu_csu', lang)}</td>
              <td style={{ padding: '8px 10px' }}>{cellPct(r, 'spd', lang)}</td>
              <td style={{ padding: '8px 10px' }}>{cellPct(r, 'gruene', lang)}</td>
              <td style={{ padding: '8px 10px' }}>{cellPct(r, 'afd', lang)}</td>
              <td style={{ padding: '8px 10px' }}>{cellPct(r, 'bsw', lang)}</td>
              <td style={{ padding: '8px 10px' }}>{cellPct(r, 'linke_pds', lang)}</td>
              <td style={{ padding: '8px 10px' }}>{cellPct(r, 'fdp', lang)}</td>
              <td style={{ padding: '8px 10px', color: c.text }}>
                {PARTY_LABELS[r._winner]?.[lang] ?? r._winner}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sorted.length > PAGE_SIZE && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.md,
            marginTop: spacing.md,
            fontFamily: fonts.body,
            fontSize: '0.85rem',
            color: c.muted,
          }}
        >
          <button
            type="button"
            disabled={pageSafe <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            style={{
              minHeight: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              background: c.inputBg,
              color: c.text,
              cursor: pageSafe <= 0 ? 'not-allowed' : 'pointer',
              opacity: pageSafe <= 0 ? 0.5 : 1,
            }}
          >
            ‹
          </button>
          <span>
            {pageSafe + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={pageSafe >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            style={{
              minHeight: 36,
              padding: '0 12px',
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              background: c.inputBg,
              color: c.text,
              cursor: pageSafe >= pageCount - 1 ? 'not-allowed' : 'pointer',
              opacity: pageSafe >= pageCount - 1 ? 0.5 : 1,
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
