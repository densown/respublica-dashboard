import type { CSSProperties } from 'react';

type BadgeVariant = 'default' | 'blue' | 'amber' | 'green' | 'red' | 'dark' | 'muted';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, CSSProperties> = {
  default: { background: '#2a2a2a', color: '#ccc' },
  blue: { background: '#1e3a5f', color: '#7db8f0' },
  amber: { background: '#4a3600', color: '#f0c040' },
  green: { background: '#1a3a1a', color: '#6fcf6f' },
  red: { background: '#3a1a1a', color: '#f06060' },
  dark: { background: '#1a1a1a', color: '#999' },
  muted: { background: '#222', color: '#777' },
};

const baseStyle: CSSProperties = {
  display: 'inline-block',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.65rem',
  fontWeight: 500,
  padding: '2px 8px',
  borderRadius: 4,
  letterSpacing: '0.03em',
  lineHeight: 1.6,
};

export function Badge({ text, variant = 'default' }: BadgeProps) {
  return (
    <span style={{ ...baseStyle, ...variantStyles[variant] }}>{text}</span>
  );
}
