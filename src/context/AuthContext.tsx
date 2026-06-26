/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'editor' | 'collaborator' | 'member' | 'visitor';
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const fetchedUserIds = useRef<string>('');
  const [profile, setProfileState] = useState<Profile | null>(() => {
    try {
      const cached = localStorage.getItem('cemuc_profile');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const hasCachedProfile = localStorage.getItem('cemuc_profile') !== null;
      return hasCachedProfile; // Inicia como true se houver cache, para esperar carregar o usuário e evitar redirect
    } catch {
      return true;
    }
  });

  const setProfile = useCallback((newProfile: Profile | null) => {
    setProfileState(newProfile);
    try {
      if (newProfile) {
        localStorage.setItem('cemuc_profile', JSON.stringify(newProfile));
      } else {
        localStorage.removeItem('cemuc_profile');
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const acceptPendingInvitation = async (profileData: Profile) => {
    const email = profileData.email?.toLowerCase();
    if (!email) return profileData;

    const { data: invitation } = await supabase
      .from('admin_invitations')
      .select('*')
      .eq('email', email)
      .eq('accepted', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!invitation) return profileData;

    const invitedRole = invitation.target_role as Profile['role'];
    const allowedPages = (invitation.allowed_pages || []) as string[];

    await supabase
      .from('profiles')
      .update({ role: invitedRole, updated_at: new Date().toISOString() })
      .eq('id', profileData.id);

    if (allowedPages.length > 0) {
      await supabase.from('page_permissions').upsert(
        allowedPages.map((pageSlug) => ({
          user_id: profileData.id,
          page_slug: pageSlug,
          can_edit: true,
          can_publish: invitedRole === 'admin' || invitedRole === 'editor',
          granted_by: invitation.granted_by || null
        })),
        { onConflict: 'user_id,page_slug' }
      );
    }

    await supabase
      .from('admin_invitations')
      .update({ accepted: true })
      .eq('id', invitation.id);

    await supabase.from('audit_logs').insert([{
      user_id: profileData.id,
      user_email: profileData.email,
      action: 'ACCEPT_INVITATION',
      target_resource: `invites/${profileData.email}`,
      details: { role: invitedRole, pages: allowedPages }
    }]);

    return { ...profileData, role: invitedRole };
  };

  const fetchProfile = async (userId: string, userEmail: string, userFullName: string) => {
    if (fetchedUserIds.current === userId) {
      return; // Evita requisições duplicadas simultâneas na montagem do app
    }
    fetchedUserIds.current = userId;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Perfil não existe no banco de dados, criamos um padrão
        const newProfile = {
          id: userId,
          full_name: userFullName || 'Membro CEMUC',
          email: userEmail,
          role: 'visitor' as const
        };
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (!insertError && inserted) {
          setProfile(await acceptPendingInvitation(inserted as Profile));
        }
      } else if (!error && data) {
        const userProfile = data as Profile;
        // Sempre verifica se há convites pendentes para atualizar a role do usuário (ex: de membro para admin)
        setProfile(await acceptPendingInvitation(userProfile));
      }
    } catch (e) {
      console.error('Erro ao carregar perfil:', e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        const userProfile = data as Profile;
        // Sempre verifica se há convites pendentes para atualizar a role do usuário
        setProfile(await acceptPendingInvitation(userProfile));
      }
    }
  };

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const hasCachedProfile = localStorage.getItem('cemuc_profile') !== null;
          if (hasCachedProfile) {
            setLoading(false); // Libera o loading imediatamente se já temos cache
          }
          await fetchProfile(
            currentUser.id, 
            currentUser.email || '', 
            currentUser.user_metadata.full_name || ''
          );
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error('Erro ao recuperar sessão inicial:', e);
        if (active) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Escuta mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          const hasCachedProfile = localStorage.getItem('cemuc_profile') !== null;
          if (hasCachedProfile) {
            setLoading(false); // Libera o loading imediatamente se já temos cache
          }
          await fetchProfile(
            currentUser.id, 
            currentUser.email || '', 
            currentUser.user_metadata.full_name || ''
          );
        } else {
          setProfile(null);
        }
      } catch (e) {
        console.error('Erro na alteração de estado de autenticação:', e);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Erro ao encerrar sessão no Supabase:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
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
