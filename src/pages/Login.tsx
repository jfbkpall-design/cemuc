import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdminLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithPassword(email, senha);
      navigate('/admin');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container section" style={{ maxWidth: '760px' }}>
      <div className="glass-panel" style={{ padding: '36px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ color: 'var(--gold)', marginBottom: '18px' }}>
            <ShieldCheck size={44} />
          </div>
          <h1 style={{ fontSize: '2.4rem', marginBottom: '12px' }}>Entrar na CEMUC</h1>
          <p style={{ color: '#94a3b8' }}>
            Membros entram com Google autorizado pela secretaria. Administradores entram com senha do painel.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '10px' }}>Área de Membros</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '18px' }}>
              O acesso só é liberado se o e-mail Google estiver cadastrado e ativo na secretaria.
            </p>
            <a href="/api/auth/google" className="btn btn-primary">
              <LogIn size={18} /> Entrar com Google
            </a>
          </div>

          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2 style={{ fontSize: '1.3rem' }}>Admin</h2>
            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.9rem' }}>{error}</div>
            )}
            <input
              className="form-control"
              type="text"
              placeholder="usuário ou e-mail do administrador"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <input
              className="form-control"
              type="password"
              placeholder="senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              required
            />
            <button className="btn btn-secondary" disabled={loading}>
              <LogIn size={18} /> {loading ? 'Entrando...' : 'Entrar no Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
