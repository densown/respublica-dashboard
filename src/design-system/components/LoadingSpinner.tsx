import { useTheme } from '../ThemeContext'

export function LoadingSpinner() {
  const { c } = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 48,
      }}
    >
      <style>{`
        @keyframes rpSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        role="status"
        aria-label="Loading"
        style={{
          width: 32,
          height: 32,
          border: `3px solid ${c.border}`,
          borderTopColor: c.red,
          borderRadius: '50%',
          animation: 'rpSpin 0.7s linear infinite',
        }}
      />
    </div>
  )
}
