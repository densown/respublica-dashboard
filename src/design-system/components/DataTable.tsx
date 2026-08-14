import type { ReactNode } from 'react'
import { fonts, fontSize, radius, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'
import { useIsMobile } from '../../hooks/useMediaQuery'

export type DataTableColumn<T> = {
  /** Eindeutiger Schluessel, zugleich React-key der Zelle. */
  key: string
  /** Spaltenkopf. */
  header: ReactNode
  /** Zellinhalt. */
  cell: (row: T, index: number) => ReactNode
  align?: 'left' | 'right'
  /** Zahlen und Daten in Mono setzen. */
  mono?: boolean
  /**
   * Auf dem Handy weglassen. Fuer Spalten, die den Karteninhalt nur
   * aufblaehen — nicht fuer solche, die die Aussage tragen.
   */
  hideOnMobile?: boolean
  /**
   * Auf dem Handy als Kartentitel statt als Feld mit Beschriftung.
   * Genau eine Spalte je Tabelle sollte das sein.
   */
  primary?: boolean
  onHeaderClick?: () => void
}

export type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => string | number
  onRowClick?: (row: T, index: number) => void
  emptyText?: string
  /** Ab wie vielen Spalten auf dem Handy Karten statt Tabelle. Standard 4. */
  cardsFrom?: number
}

/**
 * Tabelle, die auf dem Handy zur Karten-Liste wird.
 *
 * Vier Tabellen im Bestand hatten keine Handy-Alternative und waren dort
 * unbenutzbar — die schlimmste mit acht Spalten. Eine achtspaltige Tabelle
 * auf 320 px ist keine Tabelle, sie ist ein waagerechter Scrollbalken.
 * Siehe docs/DESIGN.md, Abschnitt 7.
 *
 * Bewusst als Primitiv statt als drei Einzelloesungen: die naechste Tabelle
 * soll das Problem nicht erneut haben.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyText,
  cardsFrom = 4,
}: DataTableProps<T>) {
  const { c } = useTheme()
  const narrow = useIsMobile()

  if (!rows.length) {
    return emptyText ? (
      <p style={{ fontFamily: fonts.body, fontSize: fontSize.md, color: c.muted }}>
        {emptyText}
      </p>
    ) : null
  }

  // ---------- Handy: Karten ----------
  if (narrow && columns.length >= cardsFrom) {
    const primaer = columns.find((s) => s.primary) ?? columns[0]
    const weitere = columns.filter((s) => s !== primaer && !s.hideOnMobile)

    return (
      <div style={{ display: 'grid', gap: spacing.sm }}>
        {rows.map((row, i) => (
          <div
            key={rowKey(row, i)}
            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            style={{
              border: `1px solid ${c.border}`,
              borderRadius: radius.lg,
              padding: spacing.md,
              background: c.cardBg,
              cursor: onRowClick ? 'pointer' : 'default',
            }}
          >
            <div
              style={{
                fontFamily: primaer.mono ? fonts.mono : fonts.body,
                fontSize: fontSize.base,
                color: c.ink,
                marginBottom: spacing.sm,
              }}
            >
              {primaer.cell(row, i)}
            </div>

            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: `${spacing.xs}px ${spacing.md}px`,
                margin: 0,
              }}
            >
              {weitere.map((s) => (
                <div key={s.key} style={{ display: 'contents' }}>
                  <dt
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: fontSize.micro,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: c.muted,
                    }}
                  >
                    {s.header}
                  </dt>
                  <dd
                    style={{
                      margin: 0,
                      fontFamily: s.mono ? fonts.mono : fonts.body,
                      fontSize: fontSize.sm,
                      color: c.inkSoft,
                      textAlign: s.align === 'right' ? 'right' : 'left',
                    }}
                  >
                    {s.cell(row, i)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    )
  }

  // ---------- Desktop: Tabelle ----------
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: fonts.body,
          fontSize: fontSize.sm,
        }}
      >
        <thead>
          <tr style={{ borderBottom: `1px solid ${c.border}` }}>
            {columns.map((s) => (
              <th
                key={s.key}
                onClick={s.onHeaderClick}
                style={{
                  textAlign: s.align === 'right' ? 'right' : 'left',
                  padding: `${spacing.sm}px ${spacing.md}px ${spacing.sm}px 0`,
                  fontFamily: fonts.mono,
                  fontSize: fontSize.micro,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 400,
                  color: c.muted,
                  whiteSpace: 'nowrap',
                  cursor: s.onHeaderClick ? 'pointer' : 'default',
                }}
              >
                {s.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              style={{
                borderBottom: `1px solid ${c.border}`,
                cursor: onRowClick ? 'pointer' : 'default',
              }}
            >
              {columns.map((s) => (
                <td
                  key={s.key}
                  style={{
                    padding: `${spacing.sm}px ${spacing.md}px ${spacing.sm}px 0`,
                    textAlign: s.align === 'right' ? 'right' : 'left',
                    fontFamily: s.mono ? fonts.mono : fonts.body,
                    color: c.ink,
                  }}
                >
                  {s.cell(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
