import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogIn, LogOut, Shield, Phone } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const publicNavItems = [
  { to: '/', label: 'Início' },
  { to: '/sobre', label: 'Sobre Nós' },
  { to: '/ministerios', label: 'Ministérios' },
  { to: '/projetos', label: 'Projetos' },
  { to: '/eventos', label: 'Eventos' },
  { to: '/oracao', label: 'Oração' },
  { to: '/contato', label: 'Contato' }
];

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const isAdmin = profile && ['super_admin', 'admin', 'editor', 'collaborator'].includes(profile.role);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      closeMobileMenu();
      navigate('/');
    } catch (e) {
      console.error('Erro ao sair:', e);
    }
  };

  return (
    <div className="app-container">
      <header className="navbar-header">
        <div className="container navbar-container">
          <Link to="/" className="logo-link" onClick={closeMobileMenu}>
            <div className="logo-text">
              CEMUC<span className="logo-sub">.</span>
            </div>
          </Link>

          <nav className="desktop-nav" aria-label="Navegação principal">
            <ul className="nav-menu">
              {publicNavItems.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                    {item.label}
                  </NavLink>
                </li>
              ))}

              {profile ? (
                <>
                  <li>
                    <NavLink to="/membros" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                      Área de Membros
                    </NavLink>
                  </li>
                  {isAdmin && (
                    <li>
                      <Link to="/admin" className="btn btn-secondary nav-action-btn">
                        <Shield size={14} /> Admin
                      </Link>
                    </li>
                  )}
                  <li>
                    <button onClick={handleLogout} className="btn btn-danger nav-action-btn">
                      <LogOut size={14} /> Sair
                    </button>
                  </li>
                </>
              ) : (
                <li>
                  <Link to="/login" className="btn btn-primary nav-action-btn">
                    <LogIn size={15} /> Entrar
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <button
            className="mobile-nav-toggle"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <button className="mobile-menu-backdrop" aria-label="Fechar menu" onClick={closeMobileMenu} />
            <aside className="mobile-drawer" aria-label="Menu do site">
              <div className="mobile-drawer-header">
                <span className="logo-text">
                  CEMUC<span className="logo-sub">.</span>
                </span>
                <button className="mobile-drawer-close" onClick={closeMobileMenu} aria-label="Fechar menu">
                  <X size={24} />
                </button>
              </div>

              <nav className="mobile-nav-list">
                {publicNavItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => isActive ? 'mobile-nav-link active' : 'mobile-nav-link'}
                    onClick={closeMobileMenu}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </nav>

              <div className="mobile-drawer-actions">
                {profile ? (
                  <>
                    <NavLink to="/membros" className="mobile-nav-link" onClick={closeMobileMenu}>
                      Área de Membros
                    </NavLink>
                    {isAdmin && (
                      <Link to="/admin" className="btn btn-secondary" onClick={closeMobileMenu}>
                        <Shield size={16} /> Painel Administrativo
                      </Link>
                    )}
                    <button onClick={handleLogout} className="btn btn-danger">
                      <LogOut size={16} /> Sair
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="btn btn-primary" onClick={closeMobileMenu}>
                    <LogIn size={16} /> Entrar com Google
                  </Link>
                )}
              </div>
            </aside>
          </>
        )}
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer-section">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-column">
              <h4>CEMUC</h4>
              <p style={{ fontSize: '0.9rem', marginBottom: '15px' }}>
                Comunidade Evangélica Missão União em Cristo. Uma igreja acolhedora de pessoas imperfeitas que buscam seguir e honrar a Jesus Cristo.
              </p>
              <p style={{ fontSize: '0.85rem' }}>
                Estrada General Canrobert Pereira da Costa, 485 <br />
                Magalhães Bastos, Rio de Janeiro - RJ <br />
                CEP: 21710-400
              </p>
            </div>

            <div className="footer-column">
              <h4>Acesso Rápido</h4>
              <ul className="footer-links">
                <li><Link to="/sobre">Quem Somos</Link></li>
                <li><Link to="/ministerios">Nossos Ministérios</Link></li>
                <li><Link to="/eventos">Calendário de Eventos</Link></li>
                <li><Link to="/oracao">Pedir Oração</Link></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Comunidade</h4>
              <ul className="footer-links">
                <li><Link to="/membros">Área de Membros</Link></li>
                <li><Link to="/contato">Secretaria Pastoral</Link></li>
                <li><a href="https://t.me/cemuc" target="_blank" rel="noopener noreferrer">Sermões no Telegram</a></li>
              </ul>
            </div>

            <div className="footer-column">
              <h4>Contatos & Redes</h4>
              <p style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Phone size={14} className="logo-sub" /> (21) 97525-9839
              </p>
              <div className="footer-socials">
                <a href="#" className="footer-social-btn" aria-label="Facebook"><span style={{ fontWeight: 'bold' }}>F</span></a>
                <a href="#" className="footer-social-btn" aria-label="Instagram"><span style={{ fontWeight: 'bold' }}>I</span></a>
                <a href="https://t.me/cemuc" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Telegram"><span style={{ fontWeight: 'bold' }}>T</span></a>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>&copy; {new Date().getFullYear()} CEMUC - Comunidade Evangélica Missão União em Cristo. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
