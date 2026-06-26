import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('super_admin' | 'admin' | 'editor' | 'collaborator' | 'member')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Verificando credenciais...</p>
      </div>
    );
  }

  if (!user) {
    // Salva a localização atual para redirecionamento pós-login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && profile && !(allowedRoles as string[]).includes(profile.role)) {
    // Se o perfil do usuário não tiver um papel permitido, envia-o para a área básica de membros
    return <Navigate to="/membros" replace />;
  }

  return <>{children}</>;
};
