import { useCallback, useMemo, useState } from 'react'
import { DataTable, useTheme } from '../../design-system'
import { fontSize, fonts, radius } from '../../design-system/tokens'
import { STATE_NAMES, statePrefixFromAgs } from './partyColors'
import { resolveKreisDisplayName, toDisplayPercent } from './normalizeWahlen'
import type { RankingRow } from './types'

type SortKey = 'rank' | 'name' | 'state' | 'value'

type RankingTableProps = {
  rows: RankingRow[]
  kreisNameByAgs: Map<string, string>
  onRowClick: (ags: string) => void
}

function bundeslandFromAgs(ags: string): string {
  const prefix = statePrefixFromAgs(ags)
  return STATE_NAMES[prefix] ?? prefix
}

export function RankingTable({ rows, kreisNameByAgs, onRowClick }: RankingTableProps) {
  const { c, t, lang } = useTheme()
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const enriched = useMemo(() => {
    return rows.map((r) => ({
      ...r,
      kreisName: resolveKreisDisplayName(r.ags, kreisNameByAgs, r.name),
      stateName: bundeslandFromAgs(r.ags),
      valuePct: toDisplayPercent(r.value),
    }))
  }, [rows, kreisNameByAgs])

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
          cmp = a.kreisName.localeCompare(b.kreisName, lang)
          break
        case 'state':
          cmp = a.stateName.localeCompare(b.stateName, lang)
          break
        case 'value':
          cmp = a.valuePct - b.valuePct
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
      [r.rank, `"${r.kreisName}"`, `"${r.stateName}"`, r.valuePct.toFixed(2).replace('.', ',')].join(
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


  // Sortierpfeil am Spaltenkopf
  const pfeil = (k: typeof sortKey) => (sortKey === k ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          type="button"
          onClick={exportCsv}
          style={{
            minHeight: 44,
            padding: '0 14px',
            borderRadius: radius.lg,
            border: `1px solid ${c.border}`,
            background: c.inputBg,
            color: c.ink,
            fontFamily: fonts.body,
            fontSize: fontSize.md,
            cursor: 'pointer',
          }}
        >
          {t('exportCsv')}
        </button>
      </div>
      <DataTable
        columns={[
          {
            key: 'rank',
            header: `${t('rank')}${pfeil('rank')}`,
            mono: true,
            onHeaderClick: () => toggleSort('rank'),
            cell: (r: (typeof sorted)[number]) => r.rank,
          },
          {
            key: 'kreis',
            header: `${t('electionsDistrict')}${pfeil('name')}`,
            primary: true,
            onHeaderClick: () => toggleSort('name'),
            cell: (r: (typeof sorted)[number]) => r.kreisName,
          },
          {
            key: 'land',
            header: `${t('electionsBundesland')}${pfeil('state')}`,
            onHeaderClick: () => toggleSort('state'),
            cell: (r: (typeof sorted)[number]) => r.stateName,
          },
          {
            key: 'wert',
            header: `${t('electionsShare')}${pfeil('value')}`,
            align: 'right',
            mono: true,
            onHeaderClick: () => toggleSort('value'),
            cell: (r: (typeof sorted)[number]) =>
              `${r.valuePct.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} %`,
          },
        ]}
        rows={sorted}
        rowKey={(r) => r.ags}
        onRowClick={(r) => onRowClick(r.ags)}
      />
    </div>
  )
}
