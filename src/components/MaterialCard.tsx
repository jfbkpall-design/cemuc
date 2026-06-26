import React from 'react';
import { FileText, Video, Link as LinkIcon, File, Download } from 'lucide-react';

interface MaterialProps {
  title: string;
  description?: string;
  resourceUrl: string;
  type: 'pdf' | 'video' | 'link' | 'document';
}

const typeIconMap = {
  pdf: FileText,
  video: Video,
  link: LinkIcon,
  document: File,
};

export const MaterialCard: React.FC<MaterialProps> = ({ title, description, resourceUrl, type }) => {
  const Icon = typeIconMap[type] || File;

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    className="material-card hover-glow"
    onClick={() => window.open(resourceUrl, '_blank', 'noopener,noreferrer')}
    >
      <div style={{
        background: 'rgba(212, 175, 55, 0.1)',
        color: '#D4AF37',
        padding: '12px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Icon size={24} />
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: '#fff' }}>{title}</h4>
        {description && (
          <p style={{ margin: '0 0 12px 0', color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.5 }}>
            {description}
          </p>
        )}
        <span style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '6px', 
          color: '#D4AF37', 
          fontSize: '0.85rem',
          fontWeight: 500
        }}>
          {type === 'video' ? 'Assistir Vídeo' : type === 'link' ? 'Acessar Link' : 'Baixar Arquivo'} <Download size={14} />
        </span>
      </div>
    </div>
  );
};
