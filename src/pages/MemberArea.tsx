import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';
import { Award, Save, RefreshCw } from 'lucide-react';
import { Card } from '../components/Card';

export const MemberArea: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    setMsg({ type: '', text: '' });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setMsg({ type: 'success', text: 'Nome atualizado com sucesso!' });
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Erro ao atualizar nome: ' + (err as Error).message });
    } finally {
      setUpdating(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="badge badge-gold">Super Administrador</span>;
      case 'admin':
        return <span className="badge badge-gold">Administrador</span>;
      case 'editor':
        return <span className="badge badge-teal">Editor por Área</span>;
      case 'collaborator':
        return <span className="badge badge-teal">Colaborador</span>;
      case 'member':
        return <span className="badge badge-teal">Membro Ativo</span>;
      default:
        return <span className="badge badge-gray">Visitante Cadastrado</span>;
    }
  };

  return (
    <div className="container section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Área de Membros</h1>
          <p style={{ color: '#94a3b8' }}>Bem-vindo de volta, {profile?.full_name}!</p>
        </div>
        <div>
          {profile && getRoleBadge(profile.role)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
        
        {/* Profile Card */}
        <Card title="Meus Dados" subtitle="Informações de Cadastro">
          <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {msg.text && (
              <div style={{
                background: msg.type === 'success' ? 'rgba(13, 148, 136, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                border: msg.type === 'success' ? '1px solid rgba(13, 148, 136, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                color: msg.type === 'success' ? 'var(--teal-light)' : '#ef4444',
                fontSize: '0.9rem'
              }}>
                {msg.text}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="mem-email">Endereço de E-mail</label>
              <input 
                type="text" 
                id="mem-email" 
                className="form-control" 
                value={user?.email || ''} 
                disabled 
                style={{ opacity: 0.6, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mem-name">Nome Completo</label>
              <input 
                type="text" 
                id="mem-name" 
                className="form-control" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={updating}>
              {updating ? <RefreshCw size={16} className="spinner" /> : <Save size={16} />} Salvar Alterações
            </button>
          </form>
        </Card>

        {/* Scales / Ministry Agenda Card */}
        <Card title="Escalas de Serviço" subtitle="Minha Agenda nos Cultos">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>Louvor</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>07 Junho - 18:00</span>
              </div>
              <h5 style={{ color: '#ffffff', marginBottom: '4px' }}>Culto de Domingo - Louvor Geral</h5>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Função: Vocal / Apoio</p>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', opacity: 0.8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>Recepção</span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>14 Junho - 17:45</span>
              </div>
              <h5 style={{ color: '#ffffff', marginBottom: '4px' }}>Culto de Domingo - Recepção e Portaria</h5>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Função: Distribuição de boletins e acolhimento</p>
            </div>
          </div>
        </Card>

        {/* Contributions / UDF Courses */}
        <Card title="Cursos & Integrações" subtitle="Crescimento Espiritual">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ color: 'var(--gold)' }}><Award size={24} /></div>
              <div>
                <h5 style={{ color: '#ffffff' }}>Fundamentos da Família (UDF)</h5>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Status: Matriculado (Turma A - Terça às 20h)</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)', opacity: 0.6 }}>
              <div style={{ color: '#94a3b8' }}><Award size={24} /></div>
              <div>
                <h5 style={{ color: '#ffffff' }}>Educação Financeira (UDF)</h5>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Disponível para inscrição no próximo semestre</p>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};
