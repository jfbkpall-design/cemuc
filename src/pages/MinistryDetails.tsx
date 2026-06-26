import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, ArrowLeft, BookOpen, Gift, Heart, HeartHandshake, Music, Shield, Smile, UserCheck, Users } from 'lucide-react';

interface DbMinistry {
  id: string;
  title: string;
  group: string;
  desc: string;
  icon: string;
  image: string;
  slug: string;
  long_content?: string;
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

export const MinistryDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [ministry, setMinistry] = useState<DbMinistry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!slug) return;

    fetch(`/api/ministerios/${slug}`)
      .then((response) => response.json())
      .then((payload) => {
        if (active) setMinistry(payload.data || null);
      })
      .catch((error) => console.error('Erro ao carregar ministério:', error))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [slug]);

  if (loading) {
    return <div className="container section loading-container"><div className="spinner"></div><p>Carregando ministério...</p></div>;
  }

  if (!ministry) {
    return (
      <div className="container section" style={{ textAlign: 'center' }}>
        <h2>Ministério não encontrado</h2>
        <Link to="/ministerios" className="btn btn-primary" style={{ marginTop: '20px' }}>Voltar</Link>
      </div>
    );
  }

  const Icon = iconMap[ministry.icon] || HeartHandshake;

  return (
    <div>
      <section style={{
        backgroundImage: `linear-gradient(rgba(10, 15, 28, 0.82), rgba(10, 15, 28, 0.96)), url('${ministry.image}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '110px 0 60px'
      }}>
        <div className="container">
          <Link to="/ministerios" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', marginBottom: '24px' }}>
            <ArrowLeft size={16} /> Voltar
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(217, 119, 6, 0.2)', color: 'var(--gold)', padding: '16px', borderRadius: '12px' }}>
              <Icon size={32} />
            </div>
            <div>
              <div className="badge badge-gold">{ministry.group}</div>
              <h1 style={{ margin: '8px 0 0', fontSize: '3rem' }}>{ministry.title}</h1>
            </div>
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '1.15rem', maxWidth: '800px' }}>{ministry.desc}</p>
        </div>
      </section>

      <section className="container section">
        <div style={{ maxWidth: '820px' }}>
          <h2 style={{ marginBottom: '20px' }}>Conheça nosso trabalho</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '1.05rem' }}>
            {ministry.long_content || `O ministério de ${ministry.title} atua na área de ${ministry.group}. ${ministry.desc}`}
          </p>
          <div className="glass-panel" style={{ padding: '28px', marginTop: '36px' }}>
            <h3 style={{ marginBottom: '10px' }}>Quer participar?</h3>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Entre em contato com a secretaria para saber como se envolver.</p>
            <Link to="/contato" className="btn btn-primary">Falar com a secretaria</Link>
          </div>
        </div>
      </section>
    </div>
  );
};
