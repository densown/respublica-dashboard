import type { CSSProperties } from 'react';

interface Segment {
  percent: number;
  color: string;
  label: string;
}

interface ProgressBarProps {
  segments: Segment[];
}

const styles: Record<string, CSSProperties> = {
  bar: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    display: 'flex',
    background: '#2a2a2a',
  },
  legend: {
    display: 'flex',
    gap: 18,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.7rem',
    color: '#999',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
};

export function ProgressBar({ segments }: ProgressBarProps) {
  return (
    <div>
      <div style={styles.bar}>
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{
              width: `${seg.percent}%`,
              background: seg.color,
              transition: 'width 0.5s ease',
            }}
          />
        ))}
      </div>
      <div style={styles.legend}>
        {segments.map((seg) => (
          <div key={seg.label} style={styles.legendItem}>
            <span style={{ ...styles.dot, background: seg.color }} />
            {seg.label}
          </div>
        ))}
      </div>
    </div>
  );
}
