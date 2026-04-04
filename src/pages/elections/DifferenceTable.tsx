import { useCallback, useMemo } from 'react'
import { useTheme } from '../../design-system'
import { fonts, spacing } from '../../design-system/tokens'
import type { Lang } from '../../design-system/ThemeContext'
import type { I18nKey } from '../../design-system/i18n'
import { PARTY_LABELS } from './partyColors'

type DifferenceTableProps = {
  lang: Lang
  t: (k: I18nKey) => string
  partyKeys: readonly string[]
  /** Spalten pro Region: gleiche Reihenfolge wie regionLabels */
  regionLabels: string[]
  /** matrix[partyIndex][regionIndex] = Anzeige-Prozent */
  matrix: number[][]
}

const TD_TH_PAD = '6px 10px'

/** Tabellenkopf: >15 Zeichen kürzen; „Regionalverband …“ → „Reg. …“ */
function shortHeaderName(name: string): string {
  const s = name.trim()
  if (s.length <= 15) return s
  const reg = s.replace(/^Regionalverband\s+/i, 'Reg. ')
  if (reg.length <= 15) return reg
  return `${reg.slice(0, 14)}…`
}

/** Spanne: grün bei kleiner Streuung, rot bei großer (Pp). */
function spanColor(
  span: number,
  c: { yes: string; no: string; inkSoft: string },
): string {
  if (!Number.isFinite(span)) return c.inkSoft
  if (span <= 5) return c.yes
  if (span >= 20) return c.no
  return c.inkSoft
}

export function DifferenceTable({
  lang,
  t,
  partyKeys,
  regionLabels,
  matrix,
}: DifferenceTableProps) {
  const { c } = useTheme()
  const sep = lang === 'de' ? ',' : '.'
  const nRegions = regionLabels.length
  const mode2 = nRegions === 2
  const modeMulti = nRegions >= 3

  const fmt = (val: number) =>
    `${val.toFixed(1).replace('.', sep)} %`

  const rows = useMemo(() => {
    return partyKeys.map((pk, pi) => {
      const cells = regionLabels.map((_, ri) => matrix[pi]?.[ri])
      const finite = cells
        .map((v, ri) => ({ v, label: regionLabels[ri]! }))
        .filter((x) => x.v != null && Number.isFinite(x.v)) as {
        v: number
        label: string
      }[]

      const diff =
        mode2 &&
        cells[0] != null &&
        cells[1] != null &&
        Number.isFinite(cells[0]) &&
        Number.isFinite(cells[1])
          ? cells[0]! - cells[1]!
          : null

      let avg: number | null = null
      let minEntry: { v: number; label: string } | null = null
      let maxEntry: { v: number; label: string } | null = null
      let span: number | null = null

      if (finite.length >= 2) {
        avg = finite.reduce((s, x) => s + x.v, 0) / finite.length
        minEntry = finite.reduce((a, b) => (a.v <= b.v ? a : b))
        maxEntry = finite.reduce((a, b) => (a.v >= b.v ? a : b))
        span = maxEntry.v - minEntry.v
      }

      return {
        key: pk,
        label: PARTY_LABELS[pk]?.[lang] ?? pk,
        cells,
        diff,
        avg,
        minEntry,
        maxEntry,
        span,
      }
    })
  }, [partyKeys, regionLabels, matrix, lang, mode2])

  const exportCsv = useCallback(() => {
    const delim = lang === 'de' ? ';' : ','
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`
    const extraHeads: string[] = []
    if (mode2) {
      extraHeads.push(q(String(t('compareDiffShortHeader'))))
    } else if (modeMulti) {
      extraHeads.push(
        q(String(t('compareColAvg'))),
        q(String(t('compareColMin'))),
        q(String(t('compareColMax'))),
        q(String(t('compareColSpan'))),
      )
    }

    const heads = [
      q(String(t('partyLabel'))),
      ...regionLabels.map((h) => q(h)),
      ...extraHeads,
    ]

    const lines = rows.map((r) => {
      const row = [q(r.label)]
      for (let ri = 0; ri < regionLabels.length; ri++) {
        const v = r.cells[ri]
        row.push(
          v != null && Number.isFinite(v)
            ? String(v).replace('.', lang === 'de' ? ',' : '.')
            : '',
        )
      }
      if (mode2) {
        row.push(
          r.diff != null && Number.isFinite(r.diff)
            ? String(r.diff.toFixed(2)).replace('.', lang === 'de' ? ',' : '.')
            : '',
        )
      } else if (modeMulti) {
        row.push(
          r.avg != null && Number.isFinite(r.avg)
            ? String(r.avg.toFixed(2)).replace('.', lang === 'de' ? ',' : '.')
            : '',
        )
        row.push(
          r.minEntry
            ? q(
                `${r.minEntry.v.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} (${r.minEntry.label})`,
              )
            : '',
        )
        row.push(
          r.maxEntry
            ? q(
                `${r.maxEntry.v.toFixed(1).replace('.', lang === 'de' ? ',' : '.')} (${r.maxEntry.label})`,
              )
            : '',
        )
        row.push(
          r.span != null && Number.isFinite(r.span)
            ? String(r.span.toFixed(2)).replace('.', lang === 'de' ? ',' : '.')
            : '',
        )
      }
      return row.join(delim)
    })
    const blob = new Blob([`\uFEFF${heads.join(delim)}\n${lines.join('\n')}`], {
      type: 'text/csv;charset=utf-8',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `wahlen-compare-${lang}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [lang, t, regionLabels, rows, mode2, modeMulti])

  const thBase = {
    padding: TD_TH_PAD,
    borderBottom: `2px solid ${c.border}`,
    color: c.muted,
    fontSize: '0.8rem' as const,
    whiteSpace: 'nowrap' as const,
  }

  const tdBase = {
    padding: TD_TH_PAD,
    fontSize: '0.8rem' as const,
    whiteSpace: 'nowrap' as const,
  }

  return (
    <div
      style={{
        width: '100%',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div style={{ marginBottom: spacing.md }}>
        <button
          type="button"
          onClick={exportCsv}
          style={{
            minHeight: 40,
            padding: '0 14px',
            borderRadius: 8,
            border: `1px solid ${c.border}`,
            background: c.inputBg,
            color: c.ink,
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
          minWidth: 800,
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: fonts.mono,
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                ...thBase,
                textAlign: 'left',
              }}
            >
              {t('partyLabel')}
            </th>
            {regionLabels.map((name) => (
              <th
                key={name}
                title={name}
                style={{
                  ...thBase,
                  textAlign: 'right',
                }}
              >
                {shortHeaderName(name)}
              </th>
            ))}
            {mode2 ? (
              <th
                style={{
                  ...thBase,
                  textAlign: 'right',
                }}
              >
                {t('compareDiffShortHeader')}
              </th>
            ) : null}
            {modeMulti ? (
              <>
                <th style={{ ...thBase, textAlign: 'right' }}>
                  {t('compareColAvg')}
                </th>
                <th style={{ ...thBase, textAlign: 'right' }}>
                  {t('compareColMin')}
                </th>
                <th style={{ ...thBase, textAlign: 'right' }}>
                  {t('compareColMax')}
                </th>
                <th style={{ ...thBase, textAlign: 'right' }}>
                  {t('compareColSpan')}
                </th>
              </>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} style={{ borderBottom: `1px solid ${c.border}` }}>
              <td style={{ ...tdBase, color: c.ink, textAlign: 'left' }}>
                {r.label}
              </td>
              {r.cells.map((v, i) => (
                <td
                  key={i}
                  style={{ ...tdBase, textAlign: 'right', color: c.ink }}
                >
                  {v != null && Number.isFinite(v) ? fmt(v) : '—'}
                </td>
              ))}
              {mode2 ? (
                <td
                  style={{
                    ...tdBase,
                    textAlign: 'right',
                    color:
                      r.diff == null || !Number.isFinite(r.diff)
                        ? c.muted
                        : r.diff >= 0
                          ? c.yes
                          : c.no,
                  }}
                >
                  {r.diff != null && Number.isFinite(r.diff) ? (
                    <span style={{ whiteSpace: 'nowrap' }}>
                      {r.diff >= 0 ? '+' : ''}
                      {r.diff.toFixed(1).replace('.', sep)} Pp
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              ) : null}
              {modeMulti ? (
                <>
                  <td
                    style={{
                      ...tdBase,
                      textAlign: 'right',
                      color: c.ink,
                    }}
                  >
                    {r.avg != null && Number.isFinite(r.avg) ? fmt(r.avg) : '—'}
                  </td>
                  <td
                    title={r.minEntry ? r.minEntry.label : undefined}
                    style={{
                      ...tdBase,
                      textAlign: 'right',
                      color: c.ink,
                    }}
                  >
                    {r.minEntry ? fmt(r.minEntry.v) : '—'}
                  </td>
                  <td
                    title={r.maxEntry ? r.maxEntry.label : undefined}
                    style={{
                      ...tdBase,
                      textAlign: 'right',
                      color: c.ink,
                    }}
                  >
                    {r.maxEntry ? fmt(r.maxEntry.v) : '—'}
                  </td>
                  <td
                    style={{
                      ...tdBase,
                      textAlign: 'right',
                      color:
                        r.span == null || !Number.isFinite(r.span)
                          ? c.muted
                          : spanColor(r.span, c),
                    }}
                  >
                    {r.span != null && Number.isFinite(r.span) ? (
                      <span style={{ whiteSpace: 'nowrap' }}>
                        {r.span.toFixed(1).replace('.', sep)} Pp
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
