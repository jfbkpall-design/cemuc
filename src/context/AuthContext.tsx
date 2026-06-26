/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface CloudflareUser {
  id: string;
  member_id?: number;
  email: string;
  nome: string;
  role: 'master' | 'admin' | 'editor' | 'member' | 'membro';
  avatar_url?: string | null;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor' | 'collaborator' | 'member' | 'visitor';
  created_at: string;
}

interface AuthContextType {
  user: CloudflareUser | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithPassword: (email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toLegacyProfile(user: CloudflareUser | null): Profile | null {
  if (!user) return null;

  const roleMap: Record<CloudflareUser['role'], Profile['role']> = {
    master: 'super_admin',
    admin: 'admin',
    editor: 'editor',
    member: 'member',
    membro: 'member'
  };

  return {
    id: user.id,
    full_name: user.nome || user.email,
    email: user.email,
    role: roleMap[user.role] || 'member',
    created_at: ''
  };
}

async function fetchCurrentUser(): Promise<CloudflareUser | null> {
  const response = await fetch('/api/auth/me', {
    credentials: 'include',
    headers: { accept: 'application/json' }
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as { user?: CloudflareUser | null };
  return data.user || null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CloudflareUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
      setProfile(toLegacyProfile(currentUser));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const signInWithGoogle = async () => {
    window.location.href = '/api/auth/google';
  };

  const signInWithPassword = async (email: string, senha: string) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || 'Não foi possível entrar');
    }

    await refreshProfile();
  };

  const signOut = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    }).catch(() => undefined);

    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signInWithPassword, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
