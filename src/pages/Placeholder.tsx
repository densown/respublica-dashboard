import { useParams } from 'react-router-dom';
import type { CSSProperties } from 'react';

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 820,
    margin: '0 auto',
    padding: '40px 20px',
  },
  title: {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1.5rem',
    fontWeight: 700,
  },
  id: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.85rem',
    color: '#888',
    marginTop: 8,
  },
};

export function PlaceholderPage({ title }: { title: string }) {
  const params = useParams();
  const id = params.id;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>{title}</h1>
      {id && <p style={styles.id}>ID: {id}</p>}
    </div>
  );
}
