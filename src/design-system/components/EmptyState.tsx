import { fontSize, fonts, radius, spacing } from '../tokens'
import { useTheme } from '../ThemeContext'

export type EmptyStateProps = {
  text: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ text, action }: EmptyStateProps) {
  const { c } = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: spacing.xxxl,
        gap: spacing.lg,
        color: c.muted,
      }}
    >
      {/* Leeres Blatt mit Eselsohr statt eines Unicode-Kreises */}
      <svg aria-hidden width="44" height="52" viewBox="0 0 44 52" fill="none" stroke={c.subtle} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
        <path d="M4 2h26l10 10v38H4z" />
        <path d="M30 2v10h10" />
        <path d="M11 22h22M11 29h22M11 36h13" strokeDasharray="1 4" />
      </svg>
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: fontSize.base,
          maxWidth: 320,
        }}
      >
        {text}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            padding: `${spacing.md}px ${spacing.xl}px`,
            border: `1px solid ${c.red}`,
            borderRadius: radius.md,
            background: 'transparent',
            color: c.red,
            fontFamily: fonts.mono,
            fontSize: fontSize.xs,
            cursor: 'pointer',
            transition: 'background 0.2s ease, color 0.2s ease',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
