import React, { useEffect, useState } from 'react';
import { Activity, BookOpen, Gift, Heart, HeartHandshake, Music, Shield, Smile, UserCheck, Users } from 'lucide-react';
import { Card } from '../components/Card';
import { useManagedPage } from '../hooks/useManagedPage';

interface DbProject {
  id: string;
  title: string;
  desc: string;
  icon: string;
  apenas_membros?: number;
}

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Activity,
  Smile,
  Heart,
  UserCheck,
  Gift,
  BookOpen,
  HeartHandshake,
  Users,
  Music,
  Shield
};

export const Projects: React.FC = () => {
  const page = useManagedPage('projetos', {
    headline: 'Nossos Projetos',
    summary: 'Conheça as ações de apoio social, cuidado e integração comunitária.'
  });
  const [projects, setProjects] = useState<DbProject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/projetos')
      .then((response) => response.json())
      .then((payload) => {
        if (active) setProjects(payload.data || []);
      })
      .catch((error) => console.error('Erro ao carregar projetos:', error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="container section">
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Projetos CEMUC</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>{page.summary}</p>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner"></div><p>Carregando projetos...</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {projects.map((project) => {
            const Icon = iconMap[project.icon] || Activity;
            return (
              <Card key={project.id} title={project.title} subtitle={project.apenas_membros ? 'Apenas membros' : undefined}>
                <div style={{ color: 'var(--gold)', marginBottom: '16px' }}><Icon size={32} /></div>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>{project.desc}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
