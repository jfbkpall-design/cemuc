import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../components/Card';
import {
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
} from 'lucide-react';
import { useManagedPage } from '../hooks/useManagedPage';
import { supabase } from '../services/supabaseClient';

interface DbProject {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

// Mapeamento dinâmico de strings para componentes de ícones Lucide
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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
    summary: 'Conheça as ações de apoio social, cura de casamentos, evangelismo criativo e integração comunitária.'
  });

  const [projects, setProjects] = useState<DbProject[]>(() => {
    try {
      const cached = localStorage.getItem('cemuc_projects');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => projects.length === 0);

  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('title', { ascending: true })
        .abortSignal(AbortSignal.timeout(10000)); // evita spinner travado se o Supabase estiver "frio"

      if (!error && data) {
        setProjects(data as DbProject[]);
        localStorage.setItem('cemuc_projects', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Erro ao buscar projetos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchProjects]);

  return (
    <div className="container section">
      <div style={{ textAlign: 'center', marginBottom: '50px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Projetos CEMUC</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
          {page.summary}
        </p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando projetos...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
          {projects.map((p) => {
            const IconComponent = iconMap[p.icon] || Activity;

            return (
              <Card key={p.id} title={p.title}>
                <div style={{ color: 'var(--gold)', marginBottom: '16px' }}>
                  <IconComponent size={32} />
                </div>
                <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6' }}>{p.desc}</p>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
