import { useTheme } from '../ThemeContext'

export type ProgressSegment = {
  pct: number
  color: string
}

export type ProgressBarProps = {
  segments: ProgressSegment[]
}

export function ProgressBar({ segments }: ProgressBarProps) {
  const { c } = useTheme()

  return (
    <div
      style={{
        display: 'flex',
        height: 12,
        borderRadius: 6,
        overflow: 'hidden',
        background: c.bgHover,
        border: `1px solid ${c.border}`,
      }}
    >
      {segments.map((s, i) => (
        <div
          key={i}
          title={`${s.pct}%`}
          style={{
            width: `${s.pct}%`,
            background: s.color,
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      ))}
    </div>
  )
}
