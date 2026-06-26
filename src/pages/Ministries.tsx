import React, { useEffect, useState } from 'react';
import { Activity, ArrowRight, BookOpen, Gift, Heart, HeartHandshake, Music, Shield, Smile, UserCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useManagedPage } from '../hooks/useManagedPage';

interface DbMinistry {
  id: string;
  title: string;
  group: string;
  desc: string;
  icon: string;
  image: string;
  slug: string;
  apenas_membros?: number;
}

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
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
    summary: 'Conheça as áreas de cuidado, ensino, comunhão, adoração e serviço da missão.'
  });
  const [ministries, setMinistries] = useState<DbMinistry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/ministerios')
      .then((response) => response.json())
      .then((payload) => {
        if (active) setMinistries(payload.data || []);
      })
      .catch((error) => console.error('Erro ao carregar ministérios:', error))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="container section">
      <div style={{ textAlign: 'center', marginBottom: '34px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Ministérios</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '16px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8', maxWidth: '720px', margin: '0 auto' }}>{page.summary}</p>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner"></div><p>Carregando ministérios...</p></div>
      ) : (
        <div className="ministry-grid">
          {ministries.map((ministry) => {
            const Icon = iconMap[ministry.icon] || HeartHandshake;
            return (
              <article id={ministry.slug} className="ministry-card" key={ministry.id}>
                <div className="ministry-card-image" style={{ backgroundImage: ministry.image ? `url('${ministry.image}')` : undefined }} />
                <div className="ministry-card-content">
                  <div className="ministry-card-meta">
                    <span><Icon size={24} /></span>
                    <span>{ministry.group}</span>
                    {ministry.apenas_membros ? <span>Restrito</span> : null}
                  </div>
                  <h2>{ministry.title}</h2>
                  <p>{ministry.desc}</p>
                  <Link to={`/ministerios/${ministry.slug}`} className="ministry-card-link">
                    Quero saber mais <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
