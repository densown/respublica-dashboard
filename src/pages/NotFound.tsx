import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader, useTheme } from '../design-system'
import { fontSize, fonts, spacing } from '../design-system/tokens'
import { useSeo } from '../hooks/useSeo'

/**
 * Fehlerseite fuer unbekannte Pfade. Der Server liefert fuer diese Pfade
 * Status 404 aus (deploy/nginx/app-routen.conf), die Seite selbst haelt sich
 * zusaetzlich mit noindex aus dem Suchindex.
 */
export default function NotFound() {
  const { t, c } = useTheme()
  useSeo({ titel: t('notFoundTitle'), nichtIndexieren: true })

  const verweis: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    fontFamily: fonts.mono,
    fontSize: fontSize.sm,
    color: c.red,
    textDecoration: 'none',
  }

  return (
    <>
      <PageHeader title="404" subtitle={t('notFoundSubtitle')} />
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: fontSize.base,
          color: c.muted,
          marginTop: spacing.md,
          marginBottom: spacing.lg,
          lineHeight: 1.6,
        }}
      >
        {t('notFoundBody')}
      </p>
      <nav style={{ display: 'flex', flexWrap: 'wrap', columnGap: spacing.xl }}>
        <Link to="/" style={verweis}>
          {t('notFoundToStart')}
        </Link>
        <Link to="/bundestag" style={verweis}>
          {t('notFoundToBundestag')}
        </Link>
      </nav>
    </>
  )
}
