import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';

// Páginas carregadas sob demanda (code splitting) para reduzir o bundle inicial.
// A Home não é "lazy" para que a primeira tela apareça sem espera de chunk.
import { Home } from './pages/Home';
const About = lazy(() => import('./pages/About').then((m) => ({ default: m.About })));
const Ministries = lazy(() => import('./pages/Ministries').then((m) => ({ default: m.Ministries })));
const MinistryDetails = lazy(() => import('./pages/MinistryDetails').then((m) => ({ default: m.MinistryDetails })));
const Projects = lazy(() => import('./pages/Projects').then((m) => ({ default: m.Projects })));
const Events = lazy(() => import('./pages/Events').then((m) => ({ default: m.Events })));
const Prayer = lazy(() => import('./pages/Prayer').then((m) => ({ default: m.Prayer })));
const Contato = lazy(() => import('./pages/Contato').then((m) => ({ default: m.Contato })));
const MemberArea = lazy(() => import('./pages/MemberArea').then((m) => ({ default: m.MemberArea })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));

import './App.css';

const PageFallback = () => (
  <div className="loading-container">
    <div className="spinner"></div>
    <p>Carregando...</p>
  </div>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/ministerios" element={<Ministries />} />
            <Route path="/ministerios/:slug" element={<MinistryDetails />} />
            <Route path="/projetos" element={<Projects />} />
            <Route path="/eventos" element={<Events />} />
            <Route path="/oracao" element={<Prayer />} />
            <Route path="/contato" element={<Contato />} />
            
            {/* Rota Protegida: Área de Membros */}
            <Route 
              path="/membros" 
              element={
                <ProtectedRoute>
                  <MemberArea />
                </ProtectedRoute>
              } 
            />

            {/* Rota Protegida: Painel de Controle Admin */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRoles={['super_admin', 'admin', 'editor', 'collaborator']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
          </Suspense>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
