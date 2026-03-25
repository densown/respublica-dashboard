import { fonts, spacing } from '../tokens'
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
      <span
        aria-hidden
        style={{
          fontSize: '2rem',
          lineHeight: 1,
          color: c.subtle,
        }}
      >
        ◌
      </span>
      <p
        style={{
          fontFamily: fonts.body,
          fontSize: '1rem',
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
            borderRadius: 6,
            background: 'transparent',
            color: c.red,
            fontFamily: fonts.mono,
            fontSize: '0.75rem',
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
