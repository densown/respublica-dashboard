import type { CSSProperties } from 'react';

interface StatWidgetProps {
  label: string;
  value: string;
  subText: string;
}

const styles: Record<string, CSSProperties> = {
  card: {
    flex: '1 1 200px',
    minWidth: 160,
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: 10,
    padding: '20px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.7rem',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    color: '#888',
  },
  value: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  sub: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.7rem',
    color: '#666',
  },
};

export function StatWidget({ label, value, subText }: StatWidgetProps) {
  return (
    <div style={styles.card}>
      <span style={styles.label}>{label}</span>
      <span style={styles.value}>{value}</span>
      <span style={styles.sub}>{subText}</span>
    </div>
  );
}
