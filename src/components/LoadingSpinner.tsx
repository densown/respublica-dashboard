import type { CSSProperties } from 'react';

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 0',
  },
  spinner: {
    width: 24,
    height: 24,
    border: '2.5px solid #333',
    borderTopColor: '#c0392b',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

export function LoadingSpinner() {
  return (
    <div style={styles.container}>
      <div style={styles.spinner} />
    </div>
  );
}
