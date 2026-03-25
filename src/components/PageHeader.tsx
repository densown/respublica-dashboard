import type { CSSProperties } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    marginBottom: 32,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '2.4rem',
    fontWeight: 800,
    margin: 0,
    lineHeight: 1.15,
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontFamily: "'Source Serif 4', 'Georgia', serif",
    fontSize: '1.05rem',
    fontWeight: 400,
    color: '#888',
    marginTop: 8,
    lineHeight: 1.5,
  },
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{title}</h1>
      <p style={styles.subtitle}>{subtitle}</p>
    </div>
  );
}
