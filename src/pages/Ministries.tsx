import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowRight,
  HeartHandshake,
  BookOpen,
  Music,
  Shield,
  Users,
  Activity,
  Smile,
  Heart,
  UserCheck,
  Gift
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useManagedPage } from '../hooks/useManagedPage';
import { supabase } from '../services/supabaseClient';

interface DbMinistry {
  id: string;
  title: string;
  group: string;
  desc: string;
  icon: string;
  image: string;
  slug?: string;
}

// Mapeamento dinâmico de strings para componentes de ícones Lucide
const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  HeartHandshake,
  BookOpen,
  Music,
  Shield,
  Users,
  Activity,
  Smile,
  Heart,
  UserCheck,
  Gift
};

export const Ministries: React.FC = () => {
  const page = useManagedPage('ministerios', {
    headline: 'Ministérios CEMUC',
    summary: 'Conheça as áreas de cuidado, ensino, comunhão, adoração e serviço da missão. Há um lugar para você servir e crescer conosco.'
  });

  const [ministries, setMinistries] = useState<DbMinistry[]>(() => {
    try {
      const cached = localStorage.getItem('cemuc_ministries');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => ministries.length === 0);

  const fetchMinistries = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ministries')
        .select('*')
        .order('title', { ascending: true })
        .abortSignal(AbortSignal.timeout(10000)); // evita spinner travado se o Supabase estiver "frio"

      if (!error && data) {
        setMinistries(data as DbMinistry[]);
        localStorage.setItem('cemuc_ministries', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Erro ao buscar ministérios:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMinistries();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchMinistries]);

  return (
    <div className="container section">
      <div style={{ textAlign: 'center', marginBottom: '34px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Ministérios</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8', maxWidth: '720px', margin: '0 auto' }}>
          {page.summary}
        </p>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando ministérios...</p>
        </div>
      ) : (
        <>
          <div className="ministry-jump-list" aria-label="Atalhos dos ministérios">
            {ministries.map((ministry) => {
              const slug = ministry.slug || ministry.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
              return (
                <a key={ministry.id} href={`#${slug}`}>
                  {ministry.title}
                </a>
              );
            })}
          </div>

          <div className="ministry-grid">
            {ministries.map((ministry) => {
              const slug = ministry.slug || ministry.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
              const IconComponent = iconMap[ministry.icon] || HeartHandshake;

              return (
                <article id={slug} className="ministry-card" key={ministry.id}>
                  <div className="ministry-card-image" style={{ backgroundImage: `url('${ministry.image}')` }} />
                  <div className="ministry-card-content">
                    <div className="ministry-card-meta">
                      <span><IconComponent size={24} /></span>
                      <span>{ministry.group}</span>
                    </div>
                    <h2>{ministry.title}</h2>
                    <p>{ministry.desc}</p>
                    <Link to={`/ministerios/${slug}`} className="ministry-card-link">
                      Quero saber mais <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
