import { fonts, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type PageHeaderProps = {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  const { c } = useTheme()

  return (
    <header style={{ marginBottom: spacing.xl }}>
      <h1
        style={{
          fontFamily: fonts.display,
          fontWeight: 900,
          fontSize: 'clamp(1.4rem, 4vw, 1.9rem)',
          color: c.ink,
          lineHeight: 1.15,
        }}
      >
        {title}
        <span style={{ color: c.red }} aria-hidden>
          .
        </span>
      </h1>
      {subtitle && (
        <p
          style={{
            marginTop: spacing.sm,
            fontFamily: fonts.body,
            fontSize: 'clamp(0.95rem, 2.2vw, 1.05rem)',
            color: c.muted,
          }}
        >
          {subtitle}
        </p>
      )}
    </header>
  )
}
