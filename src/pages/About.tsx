import { Shield, Users, Compass } from 'lucide-react';
import { Card } from '../components/Card';
import { useManagedPage } from '../hooks/useManagedPage';

export const About: React.FC = () => {
  const page = useManagedPage('sobre', {
    headline: 'Quem Somos Nós',
    summary: 'A Comunidade Evangélica Missão União em Cristo é uma igreja que valoriza o acolhimento genuíno, o ensino bíblico e a vivência comunitária da fé em Jesus Cristo.'
  });

  return (
    <div className="container section">
      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <div className="badge badge-gold" style={{ marginBottom: '16px' }}>Conheça a CEMUC</div>
        <h1 style={{ fontSize: '3rem', marginBottom: '20px' }}>{page.headline}</h1>
        <p style={{ color: '#94a3b8', maxWidth: '700px', margin: '0 auto', fontSize: '1.1rem' }}>
          {page.summary}
        </p>
      </div>

      {/* History */}
      <div className="glass-panel" style={{ padding: '40px', marginBottom: '60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', marginBottom: '16px', color: 'var(--gold)' }}>Nossa História</h2>
          <p style={{ color: '#e2e8f0', marginBottom: '16px' }}>
            Nascemos no coração de Magalhães Bastos com o propósito de acolher, discipular e enviar. A nossa caminhada é marcada pelo amor reconfortante de Jesus e pela dedicação voluntária de cada membro.
          </p>
          <p style={{ color: '#e2e8f0' }}>
            Através de ministérios ativos nas áreas infantil, de jovens, de casais e de ação social, buscamos levar esperança e amparo a todos que nos cercam, exercendo o papel de corpo de Cristo na terra.
          </p>
        </div>
        <div style={{
          height: '240px',
          backgroundImage: `url('${page.image_url || 'https://lh3.googleusercontent.com/sitesv/AA5AbUD3d18gfRgdo191i-kBSYY5yl-whdLOP3QJ-7cBrcG2ktWEUPGPGhDJe9YAwkfeYG-ixXZWVP98JYSFCdGlIX_b_93ikEKT7kG2-iIcn1CCegA0GG9MsvUgouSxeQH2RQh-lQ54kyv9M3eh-IVnQ-M3-Ouh5GQeMmwNlKg-jjap1gyG1rmcYJk7LFtuPXqG5mOWgjfu2bUkhSWhNn6jV1WI5EM6xcohFFLJ=w1280'}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}></div>
      </div>

      {/* Vision, Mission, Values */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', marginBottom: '60px' }}>
        <Card title="Missão" subtitle="Nosso Propósito Diário">
          <div style={{ color: 'var(--gold)', marginBottom: '16px' }}><Compass size={32} /></div>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Glorificar a Deus por meio de vidas transformadas pelo Evangelho, acolhendo as pessoas exatamente como estão e guiando-as até a maturidade espiritual.
          </p>
        </Card>

        <Card title="Visão" subtitle="Onde Queremos Chegar">
          <div style={{ color: 'var(--gold)', marginBottom: '16px' }}><Users size={32} /></div>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Ser uma igreja altamente acolhedora, vibrante em adoração, comprometida com a restauração de famílias e ativa na transformação social do Rio de Janeiro.
          </p>
        </Card>

        <Card title="Valores" subtitle="Princípios Inegociáveis">
          <div style={{ color: 'var(--gold)', marginBottom: '16px' }}><Shield size={32} /></div>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
            Centralidade da Bíblia Sagrada, adoração genuína, amor comunitário real, integridade no serviço, transparência e valorização de cada ser humano.
          </p>
        </Card>
      </div>

      {/* Leadership */}
      <div>
        <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '40px' }}>Liderança Pastoral</h2>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '40px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: page.leader1_image
                ? `url('${page.leader1_image}')`
                : 'linear-gradient(135deg, var(--gold) 0%, var(--primary-light) 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              margin: '0 auto 20px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.05)'
            }}>
              {!page.leader1_image && 'PA'}
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Pastor Presidente</h4>
            <p style={{ color: 'var(--gold)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Liderança Geral</p>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>Dedicado ao aconselhamento familiar e direção espiritual.</p>
          </div>

          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: page.leader2_image
                ? `url('${page.leader2_image}')`
                : 'linear-gradient(135deg, var(--teal) 0%, var(--primary-light) 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              margin: '0 auto 20px auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#ffffff',
              border: '2px solid rgba(255, 255, 255, 0.05)'
            }}>
              {!page.leader2_image && 'M'}
            </div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>Corpo de Diáconos</h4>
            <p style={{ color: 'var(--gold)', fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 'bold' }}>Serviço e Ordem</p>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '8px' }}>Apoio nas atividades diárias, recepção dos cultos e projetos sociais.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
