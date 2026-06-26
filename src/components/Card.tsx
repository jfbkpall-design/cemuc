import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, className = '' }) => {
  return (
    <div className={`glass-card ${className}`}>
      {title && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: subtitle ? '4px' : '0' }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
};
