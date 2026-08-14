import { useCallback, useMemo } from 'react'
import { DataTable, useTheme } from '../../design-system'
import { fontSize, fonts, radius, spacing } from '../../design-system/tokens'
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


/** Tabellenkopf: >15 Zeichen kürzen; „Regionalverband …“ → „Reg. …“ */
function shortHeaderName(name: string): string {
  const s = name.trim()
  if (s.length <= 15) return s
  const reg = s.replace(/^Regionalverband\s+/i, 'Reg. ')
  if (reg.length <= 15) return reg
  return `${reg.slice(0, 14)}…`
}

/** Spanne: grün bei kleiner Streuung, rot bei großer (Pp). */

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
            borderRadius: radius.lg,
            border: `1px solid ${c.border}`,
            background: c.cardBg,
            color: c.text,
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            cursor: 'pointer',
          }}
        >
          {t('exportCsv')}
        </button>
      </div>
      {/*
        Spalten werden zur Laufzeit gebaut: je Region eine, plus je nach
        Vergleichsmodus Differenz oder die vier Kennzahlen. Bei bis zu acht
        Spalten ist die Karten-Darstellung auf dem Handy nicht Kosmetik,
        sondern der Unterschied zwischen lesbar und unlesbar.
      */}
      <DataTable
        columns={[
          {
            key: 'partei',
            header: t('partyLabel'),
            primary: true,
            cell: (r: (typeof rows)[number]) => r.label,
          },
          ...regionLabels.map((name, i) => ({
            key: `region-${i}`,
            header: shortHeaderName(name),
            align: 'right' as const,
            mono: true,
            cell: (r: (typeof rows)[number]) => {
              const v = r.cells[i]
              return v != null && Number.isFinite(v) ? fmt(v) : '—'
            },
          })),
          ...(mode2
            ? [
                {
                  key: 'diff',
                  header: t('compareDiffShortHeader'),
                  align: 'right' as const,
                  mono: true,
                  cell: (r: (typeof rows)[number]) =>
                    r.diff != null && Number.isFinite(r.diff) ? fmt(r.diff) : '—',
                },
              ]
            : []),
          ...(modeMulti
            ? ([
                ['avg', t('compareColAvg'), (r: (typeof rows)[number]) => r.avg],
                ['min', t('compareColMin'), (r: (typeof rows)[number]) => r.minEntry?.v ?? null],
                ['max', t('compareColMax'), (r: (typeof rows)[number]) => r.maxEntry?.v ?? null],
                ['span', t('compareColSpan'), (r: (typeof rows)[number]) => r.span],
              ] as const).map(([key, header, hole]) => ({
                key,
                header,
                align: 'right' as const,
                mono: true,
                // Auf dem Handy nur Mittelwert und Spanne — Min und Max
                // blaehen die Karte auf, ohne die Aussage zu tragen.
                hideOnMobile: key === 'min' || key === 'max',
                cell: (r: (typeof rows)[number]) => {
                  const v = hole(r)
                  return v != null && Number.isFinite(v) ? fmt(v) : '—'
                },
              }))
            : []),
        ]}
        rows={rows}
        rowKey={(r) => r.key}
      />
    </div>
  )
}
