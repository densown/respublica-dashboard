import { useState, type CSSProperties, type ReactNode } from 'react';

interface DataCardProps {
  children: ReactNode;
  onClick?: () => void;
}

const baseStyle: CSSProperties = {
  background: '#1a1a1a',
  border: '1px solid #2a2a2a',
  borderRadius: 10,
  padding: '14px 18px',
  cursor: 'pointer',
  transition: 'border-color 0.2s ease',
};

const hoverStyle: CSSProperties = {
  ...baseStyle,
  borderColor: '#c0392b',
};

export function DataCard({ children, onClick }: DataCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={hovered ? hoverStyle : baseStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}
