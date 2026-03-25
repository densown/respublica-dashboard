import type { CSSProperties } from 'react';

interface SectionHeaderProps {
  title: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.15rem',
    fontWeight: 700,
    margin: 0,
    whiteSpace: 'nowrap',
  },
  line: {
    flex: 1,
    height: 1,
    background: '#333',
  },
};

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{title}</h2>
      <div style={styles.line} />
    </div>
  );
}
