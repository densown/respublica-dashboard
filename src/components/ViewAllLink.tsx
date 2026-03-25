import { useNavigate } from 'react-router-dom';
import type { CSSProperties } from 'react';

interface ViewAllLinkProps {
  label: string;
  to: string;
}

const style: CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.75rem',
  color: '#c0392b',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 0,
  marginTop: 12,
  display: 'inline-block',
  textDecoration: 'none',
};

export function ViewAllLink({ label, to }: ViewAllLinkProps) {
  const navigate = useNavigate();

  return (
    <button style={style} onClick={() => navigate(to)}>
      {label} →
    </button>
  );
}
