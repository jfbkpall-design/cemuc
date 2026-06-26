import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { ArrowLeft, HeartHandshake, BookOpen, Music, Shield, Users, Activity, Smile, Heart, UserCheck, Gift } from 'lucide-react';
import { MaterialCard } from '../components/MaterialCard';

interface DbMinistry {
  id: string;
  title: string;
  group: string;
  desc: string;
  icon: string;
  image: string;
  slug: string;
  long_content?: any;
}

interface MinistryMaterial {
  id: string;
  title: string;
  description: string;
  resource_url: string;
  resource_type: 'pdf' | 'video' | 'link' | 'document';
}

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

export const MinistryDetails: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [ministry, setMinistry] = useState<DbMinistry | null>(null);
  const [materials, setMaterials] = useState<MinistryMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sobre' | 'materiais'>('sobre');

  useEffect(() => {
    const fetchMinistryDetails = async () => {
      setLoading(true);
      
      // Fallback timeout in case Supabase fetch promise hangs in the browser
      const fallbackTimer = setTimeout(() => {
        setLoading(false);
      }, 5000);

      try {
        if (!slug) return;

        // Fetch Ministry
        const { data: ministryData, error: ministryError } = await supabase
          .from('ministries')
          .select('*')
          .eq('slug', slug)
          .single();

        if (ministryError) throw ministryError;
        setMinistry(ministryData as DbMinistry);

        // Fetch Materials
        if (ministryData) {
          const { data: materialsData, error: materialsError } = await supabase
            .from('ministry_materials')
            .select('*')
            .eq('ministry_id', ministryData.id)
            .order('created_at', { ascending: false });

          if (!materialsError && materialsData) {
            setMaterials(materialsData as MinistryMaterial[]);
          }
        }
      } catch (error) {
        console.error('Error fetching ministry details:', error);
      } finally {
        clearTimeout(fallbackTimer);
        setLoading(false);
      }
    };

    fetchMinistryDetails();
  }, [slug]);

  if (loading) {
    return (
      <div className="container section loading-container">
        <div className="spinner"></div>
        <p>Carregando ministério...</p>
      </div>
    );
  }

  if (!ministry) {
    return (
      <div className="container section" style={{ textAlign: 'center' }}>
        <h2>Ministério não encontrado</h2>
        <p>O ministério que você está procurando não existe ou foi removido.</p>
        <Link to="/ministerios" className="btn btn-primary" style={{ marginTop: '20px', display: 'inline-block' }}>
          Voltar para Ministérios
        </Link>
      </div>
    );
  }

  const IconComponent = iconMap[ministry.icon] || HeartHandshake;

  return (
    <div className="ministry-details-page">
      {/* Hero Section */}
      <div className="hero-section" style={{ 
        backgroundImage: `linear-gradient(rgba(10, 15, 28, 0.8), rgba(10, 15, 28, 0.95)), url('${ministry.image}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        padding: '120px 0 60px 0',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div className="container">
          <Link to="/ministerios" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#94a3b8', textDecoration: 'none', marginBottom: '24px' }}>
            <ArrowLeft size={16} /> Voltar
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{ background: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37', padding: '16px', borderRadius: '12px' }}>
              <IconComponent size={32} />
            </div>
            <div>
              <div className="badge badge-gold" style={{ marginBottom: '8px', display: 'inline-block' }}>
                {ministry.group}
              </div>
              <h1 style={{ margin: 0, fontSize: '3rem' }}>{ministry.title}</h1>
            </div>
          </div>
          <p style={{ fontSize: '1.2rem', color: '#cbd5e1', maxWidth: '800px', lineHeight: 1.6 }}>
            {ministry.desc}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="container" style={{ marginTop: '-24px' }}>
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          background: '#1a2333', 
          padding: '8px', 
          borderRadius: '12px',
          maxWidth: 'max-content',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button 
            className={`btn ${activeTab === 'sobre' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('sobre')}
            style={{ border: 'none', padding: '10px 24px' }}
          >
            Sobre nós
          </button>
          <button 
            className={`btn ${activeTab === 'materiais' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('materiais')}
            style={{ border: 'none', padding: '10px 24px' }}
          >
            Estudos e Materiais
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="container section" style={{ paddingTop: '40px' }}>
        {activeTab === 'sobre' && (
          <div className="ministry-about-content">
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginBottom: '24px' }}>Conheça nosso trabalho</h2>
              {/* Here we would render the long_content if it exists, for now just show a placeholder based on desc */}
              <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '1.1rem', marginBottom: '24px' }}>
                O ministério de {ministry.title} atua na área de {ministry.group} da nossa igreja. 
                Nosso foco principal é: {ministry.desc.toLowerCase()}
              </p>
              
              <div style={{ background: '#1a2333', padding: '32px', borderRadius: '16px', marginTop: '40px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <h3 style={{ marginTop: 0 }}>Quer participar?</h3>
                <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
                  Entre em contato com nossa equipe de liderança para saber os horários das nossas reuniões e como você pode se envolver.
                </p>
                <Link to="/contato" className="btn btn-primary">Falar com o líder</Link>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'materiais' && (
          <div className="ministry-materials-content">
            <h2 style={{ marginBottom: '16px' }}>Materiais de Estudo</h2>
            <p style={{ color: '#94a3b8', marginBottom: '32px' }}>
              Acesse aqui todos os recursos, apostilas, estudos e vídeos preparados especialmente pelo nosso ministério.
            </p>

            {materials.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                {materials.map(material => (
                  <MaterialCard 
                    key={material.id}
                    title={material.title}
                    description={material.description}
                    type={material.resource_type}
                    resourceUrl={material.resource_url}
                  />
                ))}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px', 
                background: 'rgba(255, 255, 255, 0.02)', 
                borderRadius: '16px',
                border: '1px dashed rgba(255, 255, 255, 0.1)'
              }}>
                <BookOpen size={48} style={{ color: '#475569', marginBottom: '16px' }} />
                <h3>Nenhum material disponível</h3>
                <p style={{ color: '#94a3b8' }}>Ainda não foram adicionados materiais para este ministério.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
