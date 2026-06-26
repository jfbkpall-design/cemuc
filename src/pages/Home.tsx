import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, MapPin, Clock, MessageSquare, Send } from 'lucide-react';
import { Card } from '../components/Card';
import { useManagedPage } from '../hooks/useManagedPage';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const page = useManagedPage('home', {
    headline: 'Uma comunidade acolhedora para pessoas imperfeitas.',
    summary: 'Conecte-se com Deus e com pessoas apaixonadas por Jesus Cristo. Esperamos que você sinta o amor reconfortante e envolvente do Salvador.'
  });

  return (
    <div style={{ position: 'relative' }}>
      <div className="hero-gradient" style={{
        backgroundImage: `linear-gradient(to bottom, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%), url('${page.image_url || 'https://lh3.googleusercontent.com/sitesv/AA5AbUCo3B6CfseEkD8NEuP3e-y5dW5x3tdBS-nm21EzgBvsmI32UotNQtHBVp_u314PKMz2GE9qMg6k-w4Ig_GW9a0YdGk3RhE_r6zJMzTNoySWcPMEDGnkxNK1MyMWHRlqv16lvP7QDtXv25N141Ml7dy3YpjdtVFXqSstXaGoKmcYHsq9WXYNJBHS1d_iVj5mOXARKMCRlxAqOu5HBdLMIF1QQ7wTscb1YOe4j04=w1280'}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        opacity: 0.35,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: -1,
        pointerEvents: 'none'
      }}></div>

      {/* Hero Section */}
      <section className="section" style={{ minHeight: '85vh', display: 'flex', alignItems: 'center', paddingTop: '100px' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '60px', alignItems: 'center' }}>
            <div>
              <div className="badge badge-gold" style={{ marginBottom: '20px' }}>
                Bem-vindo à Família CEMUC
              </div>
              <h1 style={{ fontSize: '3.5rem', lineHeight: '1.15', marginBottom: '24px' }}>
                {page.headline}
              </h1>
              <p style={{ fontSize: '1.2rem', color: '#94a3b8', marginBottom: '40px', maxWidth: '600px' }}>
                {page.summary}
              </p>
              
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/contato')} className="btn btn-primary">
                  Sou Novo Aqui <ArrowRight size={18} />
                </button>
                <button onClick={() => navigate('/eventos')} className="btn btn-secondary">
                  Ver Programação <Calendar size={18} />
                </button>
              </div>
            </div>

            {/* Quick Interactive Info Panel */}
            <div className="glass-panel" style={{ padding: '36px', borderLeft: '4px solid var(--gold)' }}>
              <h2 style={{ fontSize: '1.75rem', marginBottom: '20px' }}>Cultos & Reuniões</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ color: 'var(--gold)', marginTop: '4px' }}><Clock size={20} /></div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '4px' }}>Domingo às 09h00</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>EBD Infantil & EBD Adolescentes</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ color: 'var(--gold)', marginTop: '4px' }}><Clock size={20} /></div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '4px' }}>Domingo às 18h00</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Culto de Adoração & Culto Infantil</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ color: 'var(--gold)', marginTop: '4px' }}><Clock size={20} /></div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '4px' }}>Terça-feira às 19h30</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Reunião de Oração (Monte ou Templo)</p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ color: 'var(--gold)', marginTop: '4px' }}><MapPin size={20} /></div>
                  <div>
                    <h4 style={{ color: '#ffffff', fontSize: '1.05rem', marginBottom: '4px' }}>Onde Estamos</h4>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Estr. Gen. Canrobert Pereira da Costa, 485, Magalhães Bastos, RJ</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Onboarding Flow: "Sou Novo Aqui" */}
      <section className="section" style={{ background: '#090d16' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '2.25rem', marginBottom: '16px' }}>Planeje Sua Visita</h2>
            <p style={{ color: '#94a3b8', maxWidth: '600px', margin: '0 auto' }}>
              Seja na nossa Escola Bíblica Dominical ou nos Cultos de Celebração, estamos de braços abertos para te receber.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '32px' }}>
            <Card title="👶 Onde deixo meus filhos?" subtitle="Ministério Infantil">
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '16px' }}>
                Temos cultos paralelos dedicados para as crianças no Domingo às 18h00. Suas crianças aprendem a palavra de Deus em linguagem simples e divertida.
              </p>
              <button onClick={() => navigate('/ministerios')} className="btn btn-secondary" style={{ width: '100%' }}>
                Ver Ministério Infantil
              </button>
            </Card>

            <Card title="🚗 Como chegar lá?" subtitle="Localização e Transporte">
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '16px' }}>
                Estamos localizados em Magalhães Bastos. Há acesso fácil por transporte público e estacionamento disponível nas imediações do templo da CEMUC.
              </p>
              <button onClick={() => navigate('/contato')} className="btn btn-secondary" style={{ width: '100%' }}>
                Traçar Rota no Mapa
              </button>
            </Card>

            <Card title="🙏 Pedido de Oração" subtitle="Atendimento Pastoral">
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '16px' }}>
                Está enfrentando algum desafio ou quer agradecer? Deixe seu pedido de oração. Nossos intercessores e pastores orarão por sua vida durante a semana.
              </p>
              <button onClick={() => navigate('/oracao')} className="btn btn-teal" style={{ width: '100%' }}>
                Enviar Pedido de Oração
              </button>
            </Card>
          </div>
        </div>
      </section>

      {/* Sermons / Medium Telegram Section */}
      <section className="section">
        <div className="container">
          <div className="glass-panel" style={{ padding: '50px', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Ouça as Mensagens Gravadas</h2>
              <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
                Todos os nossos sermões de Domingo e ensinamentos são compartilhados na nossa comunidade no Telegram. Acompanhe a palavra de Deus onde você estiver!
              </p>
              <a href="https://t.me/cemuc" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                <Send size={18} /> Entrar no Canal do Telegram
              </a>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: 'rgba(217, 119, 6, 0.05)',
                border: '1px dashed var(--gold)',
                borderRadius: '50%',
                width: '120px',
                height: '120px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold)',
                marginBottom: '20px'
              }}>
                <MessageSquare size={48} />
              </div>
              <h4 style={{ marginBottom: '8px' }}>Discipulado Online</h4>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Textos de apoio e áudios semanais diretamente no seu celular.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Donations PIX Section */}
      <section className="section" style={{ background: '#090d16' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <div className="badge badge-gold" style={{ marginBottom: '20px' }}>
            Dízimos e Ofertas
          </div>
          <h2 style={{ fontSize: '2.25rem', marginBottom: '16px' }}>Generosidade & Adoração</h2>
          <p style={{ color: '#94a3b8', marginBottom: '40px' }}>
            "Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria." (2 Coríntios 9:7)
          </p>

          <div className="glass-panel" style={{ padding: '36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <h4 style={{ color: '#ffffff' }}>Chave PIX Oficial (CNPJ)</h4>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '16px 28px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace',
              fontSize: '1.25rem',
              color: 'var(--gold)',
              fontWeight: 'bold',
              letterSpacing: '1px'
            }}>
              12.345.678/0001-99
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Comunidade Evangélica Missão União em Cristo. Banco Itaú - Agência 0123 / C/C 45678-9
            </p>
            <button 
              onClick={() => {
                navigator.clipboard.writeText('12.345.678/0001-99');
                alert('Chave PIX copiada para a área de transferência!');
              }} 
              className="btn btn-secondary"
            >
              Copiar Chave PIX
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
