import React, { useState } from 'react';
import { Award, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';

export const MemberArea: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="badge badge-gold">Administrador Master</span>;
      case 'admin':
        return <span className="badge badge-gold">Administrador</span>;
      case 'editor':
        return <span className="badge badge-teal">Editor</span>;
      case 'collaborator':
        return <span className="badge badge-teal">Colaborador</span>;
      case 'member':
        return <span className="badge badge-teal">Membro Ativo</span>;
      default:
        return <span className="badge badge-gray">Visitante</span>;
    }
  };

  return (
    <div className="container section">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        marginBottom: '40px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        paddingBottom: '20px'
      }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Área de Membros</h1>
          <p style={{ color: '#94a3b8' }}>Bem-vindo de volta, {profile?.full_name || user?.email}.</p>
        </div>
        <div>{profile && getRoleBadge(profile.role)}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        <Card title="Minha Sessão" subtitle="Acesso validado pela secretaria">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="mem-email">E-mail autorizado</label>
              <input
                type="text"
                id="mem-email"
                className="form-control"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mem-name">Nome</label>
              <input
                type="text"
                id="mem-name"
                className="form-control"
                value={profile?.full_name || ''}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
              disabled={refreshing}
              onClick={async () => {
                setRefreshing(true);
                try {
                  await refreshProfile();
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              <RefreshCw size={16} /> Atualizar sessão
            </button>
          </div>
        </Card>

        <Card title="Conteúdos Restritos" subtitle="Disponível para membros ativos">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ color: 'var(--gold)' }}>
              <ShieldCheck size={28} />
            </div>
            <div>
              <h4 style={{ marginBottom: '8px' }}>Acesso Cloudflare ativo</h4>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                Esta área agora usa sessão própria da CEMUC em cookie seguro. O acesso é liberado somente para e-mails cadastrados pela secretaria.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Cursos & Integrações" subtitle="Crescimento espiritual">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ color: 'var(--gold)' }}><Award size={24} /></div>
            <div>
              <h5 style={{ color: '#ffffff' }}>Conteúdos da CEMUC</h5>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                As próximas liberações virão pelo banco D1 e arquivos no R2.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
