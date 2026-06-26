import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  Calendar,
  Check,
  FileText,
  Heart,
  Mail,
  Plus,
  RefreshCw,
  Save,
  Shield,
  Users
} from 'lucide-react';
import { Card } from '../components/Card';

type Role = 'super_admin' | 'admin' | 'editor' | 'collaborator' | 'member' | 'visitor';
type AdminTab = 'access' | 'pages' | 'events' | 'prayers' | 'logs' | 'ministries' | 'projects';

interface DbMinistry {
  id: string;
  title: string;
  group: string;
  desc: string;
  icon: string;
  image: string;
}

interface DbProject {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
}

interface ManagedPage {
  id: string;
  slug: string;
  title: string;
  content: {
    headline?: string;
    summary?: string;
    body?: string;
    status?: 'draft' | 'published';
    image_url?: string;
    leader1_image?: string;
    leader2_image?: string;
  };
  updated_at: string;
}

interface PagePermission {
  id: string;
  user_id: string;
  page_slug: string;
  can_edit: boolean;
  can_publish: boolean;
  profiles?: Pick<Profile, 'full_name' | 'email'>;
}

interface AdminInvitation {
  id: string;
  email: string;
  target_role: 'admin' | 'editor' | 'collaborator';
  allowed_pages: string[];
  accepted: boolean;
  expires_at: string;
  created_at: string;
}

interface PrayerRequest {
  id: string;
  name: string;
  request: string;
  is_confidential: boolean;
  status: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_email: string;
  action: string;
  target_resource: string;
  created_at: string;
  details: Record<string, unknown>;
}

const editableRoles: Role[] = ['super_admin', 'admin', 'editor', 'collaborator', 'member', 'visitor'];

const roleLabel: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  collaborator: 'Colaborador',
  member: 'Membro',
  visitor: 'Visitante'
};

const createToken = () => {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('');
};

export const AdminDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('access');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const [users, setUsers] = useState<Profile[]>([]);
  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [permissions, setPermissions] = useState<PagePermission[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [dbMinistries, setDbMinistries] = useState<DbMinistry[]>([]);
  const [minId, setMinId] = useState('');
  const [minTitle, setMinTitle] = useState('');
  const [minGroup, setMinGroup] = useState('Cuidado');
  const [minDesc, setMinDesc] = useState('');
  const [minIcon, setMinIcon] = useState('HeartHandshake');
  const [minImage, setMinImage] = useState('');

  const [dbProjects, setDbProjects] = useState<DbProject[]>([]);
  const [projId, setProjId] = useState('');
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projIcon, setProjIcon] = useState('Activity');

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'collaborator'>('editor');
  const [invitePages, setInvitePages] = useState<string[]>([]);
  const [inviteCanPublish, setInviteCanPublish] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPermissionPages, setSelectedPermissionPages] = useState<string[]>([]);
  const [selectedCanPublish, setSelectedCanPublish] = useState(false);

  const [selectedPageSlug, setSelectedPageSlug] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [pageHeadline, setPageHeadline] = useState('');
  const [pageSummary, setPageSummary] = useState('');
  const [pageBody, setPageBody] = useState('');
  const [pageStatus, setPageStatus] = useState<'draft' | 'published'>('published');
  const [pageImageUrl, setPageImageUrl] = useState('');
  const [pageLeader1Image, setPageLeader1Image] = useState('');
  const [pageLeader2Image, setPageLeader2Image] = useState('');

  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLoc, setEventLoc] = useState('');
  const [eventCat, setEventCat] = useState<'culto' | 'conferencia' | 'acao_social' | 'outro'>('culto');

  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';
  const visiblePages = useMemo(() => {
    if (isAdmin) return pages;
    const allowed = new Set(permissions.filter((permission) => permission.user_id === user?.id && permission.can_edit).map((permission) => permission.page_slug));
    return pages.filter((page) => allowed.has(page.slug));
  }, [isAdmin, pages, permissions, user?.id]);

  const selectedPage = visiblePages.find((page) => page.slug === selectedPageSlug);

  const logAdminAction = async (action: string, target: string, details: Record<string, unknown> = {}) => {
    await supabase.from('audit_logs').insert([{
      user_id: user?.id || null,
      user_email: user?.email || 'admin@cemuc.com',
      action,
      target_resource: target,
      details
    }]);
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback({ type: '', text: '' });

    try {
      const [usersResult, pagesResult, permissionsResult, invitationsResult, prayersResult, logsResult, ministriesResult, projectsResult] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('system_pages').select('*').order('title', { ascending: true }),
        // profiles!page_permissions_user_id_fkey desambigua o embed: page_permissions tem mais de uma FK para profiles (user_id e granted_by)
        supabase.from('page_permissions').select('*, profiles!page_permissions_user_id_fkey(full_name, email)').order('created_at', { ascending: false }),
        isAdmin
          ? supabase.from('admin_invitations').select('*').order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        supabase.from('prayer_requests').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(30),
        supabase.from('ministries').select('*').order('title', { ascending: true }),
        supabase.from('projects').select('*').order('title', { ascending: true })
      ]);

      if (usersResult.error) throw usersResult.error;
      if (pagesResult.error) throw pagesResult.error;
      if (permissionsResult.error) throw permissionsResult.error;
      if (invitationsResult.error) throw invitationsResult.error;
      if (prayersResult.error) throw prayersResult.error;
      if (logsResult.error) throw logsResult.error;
      if (ministriesResult.error) throw ministriesResult.error;
      if (projectsResult.error) throw projectsResult.error;

      if (usersResult.data) setUsers(usersResult.data as Profile[]);
      if (pagesResult.data) {
        const loadedPages = pagesResult.data as ManagedPage[];
        setPages(loadedPages);
        setSelectedPageSlug((current) => {
          if (!current && loadedPages.length > 0) {
            return loadedPages[0].slug;
          }
          return current;
        });
      }
      if (permissionsResult.data) setPermissions(permissionsResult.data as PagePermission[]);
      if (invitationsResult.data) setInvitations(invitationsResult.data as AdminInvitation[]);
      if (prayersResult.data) setPrayers(prayersResult.data as PrayerRequest[]);
      if (logsResult.data) setAuditLogs(logsResult.data as AuditLog[]);
      if (ministriesResult.data) setDbMinistries(ministriesResult.data as DbMinistry[]);
      if (projectsResult.data) setDbProjects(projectsResult.data as DbProject[]);
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err);
      showFeedback('error', 'Erro ao carregar dados do painel: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [profile?.role, loadData]);

  useEffect(() => {
    if (!selectedPage) return;
    const timer = setTimeout(() => {
      setPageTitle(selectedPage.title);
      setPageHeadline(selectedPage.content?.headline || '');
      setPageSummary(selectedPage.content?.summary || '');
      setPageBody(selectedPage.content?.body || '');
      setPageStatus(selectedPage.content?.status || 'published');
      setPageImageUrl(selectedPage.content?.image_url || '');
      setPageLeader1Image(selectedPage.content?.leader1_image || '');
      setPageLeader2Image(selectedPage.content?.leader2_image || '');
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedPage]);

  const toggleInvitePage = (slug: string) => {
    setInvitePages((current) => current.includes(slug) ? current.filter((page) => page !== slug) : [...current, slug]);
  };

  const toggleSelectedPermissionPage = (slug: string) => {
    setSelectedPermissionPages((current) => current.includes(slug) ? current.filter((page) => page !== slug) : [...current, slug]);
  };

  const handleRoleChange = async (targetUser: Profile, newRole: Role) => {
    if (!isAdmin || targetUser.id === user?.id) return;

    setActionLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', targetUser.id);

    if (error) {
      showFeedback('error', `Não foi possível alterar o papel: ${error.message}`);
    } else {
      await logAdminAction('UPDATE_USER_ROLE', `users/${targetUser.email}`, { role: newRole });
      showFeedback('success', `Papel de ${targetUser.email} atualizado para ${roleLabel[newRole]}.`);
      await loadData();
    }
    setActionLoading(false);
  };

  const grantPagesToUser = async (targetUserId: string, pageSlugs: string[], canPublish: boolean) => {
    if (pageSlugs.length === 0) return;

    await supabase.from('page_permissions').upsert(
      pageSlugs.map((pageSlug) => ({
        user_id: targetUserId,
        page_slug: pageSlug,
        can_edit: true,
        can_publish: canPublish,
        granted_by: user?.id || null
      })),
      { onConflict: 'user_id,page_slug' }
    );
  };

  const handleManualGrant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUserId || selectedPermissionPages.length === 0) {
      showFeedback('error', 'Escolha um usuário e ao menos uma página.');
      return;
    }

    setActionLoading(true);
    await grantPagesToUser(selectedUserId, selectedPermissionPages, selectedCanPublish);
    const targetUser = users.find((item) => item.id === selectedUserId);
    await logAdminAction('GRANT_PAGE_ACCESS', `users/${targetUser?.email || selectedUserId}`, {
      pages: selectedPermissionPages,
      canPublish: selectedCanPublish
    });
    setSelectedPermissionPages([]);
    setSelectedCanPublish(false);
    showFeedback('success', 'Permissões concedidas com sucesso.');
    await loadData();
    setActionLoading(false);
  };

  const handleRevokePermission = async (permission: PagePermission) => {
    setActionLoading(true);
    const { error } = await supabase.from('page_permissions').delete().eq('id', permission.id);
    if (error) {
      showFeedback('error', `Não foi possível revogar: ${error.message}`);
    } else {
      await logAdminAction('REVOKE_PAGE_ACCESS', `pages/${permission.page_slug}`, { userId: permission.user_id });
      showFeedback('success', 'Permissão revogada.');
      await loadData();
    }
    setActionLoading(false);
  };

  const handleSendInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    if (inviteRole !== 'admin' && invitePages.length === 0) {
      showFeedback('error', 'Escolha ao menos uma página para editor ou colaborador.');
      return;
    }

    setActionLoading(true);
    const existingUser = users.find((item) => item.email.toLowerCase() === email);

    const { error } = await supabase.from('admin_invitations').insert([{
      email,
      target_role: inviteRole,
      allowed_pages: invitePages,
      token: createToken(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      granted_by: user?.id || null
    }]);

    if (error) {
      showFeedback('error', `Não foi possível criar o convite: ${error.message}`);
      setActionLoading(false);
      return;
    }

    if (existingUser) {
      await supabase
        .from('profiles')
        .update({ role: inviteRole, updated_at: new Date().toISOString() })
        .eq('id', existingUser.id);
      await grantPagesToUser(existingUser.id, invitePages, inviteCanPublish || inviteRole === 'admin');
    }

    await logAdminAction('SEND_INVITATION', `invites/${email}`, {
      role: inviteRole,
      pages: invitePages,
      appliedImmediately: Boolean(existingUser)
    });

    setInviteEmail('');
    setInvitePages([]);
    setInviteCanPublish(false);
    showFeedback('success', existingUser
      ? `Usuário existente atualizado e convite registrado para ${email}.`
      : `Convite registrado para ${email}. Ao entrar com Google usando esse e-mail, o acesso será aplicado.`);
    await loadData();
    setActionLoading(false);
  };

  const handleSavePage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPage) return;

    setActionLoading(true);
    const nextContent = {
      ...(selectedPage.content || {}),
      headline: pageHeadline,
      summary: pageSummary,
      body: pageBody,
      status: pageStatus,
      image_url: pageImageUrl,
      leader1_image: pageLeader1Image,
      leader2_image: pageLeader2Image
    };

    const { error } = await supabase
      .from('system_pages')
      .update({
        title: pageTitle,
        content: nextContent,
        last_updated_by: user?.id || null,
        updated_at: new Date().toISOString()
      })
      .eq('slug', selectedPage.slug);

    if (error) {
      showFeedback('error', `Não foi possível salvar a página: ${error.message}`);
    } else {
      await logAdminAction('UPDATE_PAGE_CONTENT', `pages/${selectedPage.slug}`, { status: pageStatus });
      showFeedback('success', `Página "${pageTitle}" salva com sucesso.`);
      await loadData();
    }
    setActionLoading(false);
  };

  const handleAddEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    setActionLoading(true);

    const { error } = await supabase.from('events').insert([{
      title: eventTitle,
      description: eventDesc,
      start_date: new Date(eventDate).toISOString(),
      location: eventLoc,
      category: eventCat,
      created_by: user?.id
    }]);

    if (error) {
      showFeedback('error', `Não foi possível salvar o evento: ${error.message}`);
    } else {
      await logAdminAction('CREATE_EVENT', `events/${eventTitle}`, { category: eventCat });
      setEventTitle('');
      setEventDesc('');
      setEventDate('');
      setEventLoc('');
      setEventCat('culto');
      showFeedback('success', 'Evento salvo no banco.');
    }
    setActionLoading(false);
  };

  const handlePrayerStatus = async (prayerId: string, status: 'prayed' | 'archived') => {
    setActionLoading(true);
    const { error } = await supabase.from('prayer_requests').update({ status }).eq('id', prayerId);
    if (error) {
      showFeedback('error', `Não foi possível atualizar o pedido: ${error.message}`);
    } else {
      await logAdminAction('UPDATE_PRAYER_STATUS', `prayers/${prayerId}`, { status });
      showFeedback('success', 'Pedido atualizado.');
      await loadData();
    }
    setActionLoading(false);
  };

  const handleSaveMinistry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!minTitle || !minDesc || !minImage) {
      showFeedback('error', 'Preencha todos os campos obrigatórios para o ministério.');
      return;
    }
    setActionLoading(true);

    const payload = {
      title: minTitle,
      group: minGroup,
      desc: minDesc,
      icon: minIcon,
      image: minImage,
      updated_at: new Date().toISOString()
    };

    let error;
    if (minId) {
      const { error: err } = await supabase
        .from('ministries')
        .update(payload)
        .eq('id', minId);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('ministries')
        .insert([payload]);
      error = err;
    }

    if (error) {
      showFeedback('error', `Não foi possível salvar o ministério: ${error.message}`);
    } else {
      await logAdminAction(minId ? 'UPDATE_MINISTRY' : 'CREATE_MINISTRY', `ministries/${minTitle}`);
      setMinId('');
      setMinTitle('');
      setMinGroup('Cuidado');
      setMinDesc('');
      setMinIcon('HeartHandshake');
      setMinImage('');
      showFeedback('success', 'Ministério salvo com sucesso.');
      await loadData();
    }
    setActionLoading(false);
  };

  const handleEditMinistry = (min: DbMinistry) => {
    setMinId(min.id);
    setMinTitle(min.title);
    setMinGroup(min.group);
    setMinDesc(min.desc);
    setMinIcon(min.icon);
    setMinImage(min.image);
    showFeedback('success', `Carregado "${min.title}" para edição.`);
  };

  const handleDeleteMinistry = async (id: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o ministério "${title}"?`)) return;
    setActionLoading(true);

    const { error } = await supabase.from('ministries').delete().eq('id', id);
    if (error) {
      showFeedback('error', `Não foi possível excluir o ministério: ${error.message}`);
    } else {
      await logAdminAction('DELETE_MINISTRY', `ministries/${title}`);
      showFeedback('success', 'Ministério removido.');
      await loadData();
    }
    setActionLoading(false);
  };

  const handleSaveProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!projTitle || !projDesc) {
      showFeedback('error', 'Preencha todos os campos obrigatórios para o projeto.');
      return;
    }
    setActionLoading(true);

    const payload = {
      title: projTitle,
      desc: projDesc,
      icon: projIcon,
      updated_at: new Date().toISOString()
    };

    let error;
    if (projId) {
      const { error: err } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', projId);
      error = err;
    } else {
      const { error: err } = await supabase
        .from('projects')
        .insert([payload]);
      error = err;
    }

    if (error) {
      showFeedback('error', `Não foi possível salvar o projeto: ${error.message}`);
    } else {
      await logAdminAction(projId ? 'UPDATE_PROJECT' : 'CREATE_PROJECT', `projects/${projTitle}`);
      setProjId('');
      setProjTitle('');
      setProjDesc('');
      setProjIcon('Activity');
      showFeedback('success', 'Projeto salvo com sucesso.');
      await loadData();
    }
    setActionLoading(false);
  };

  const handleEditProject = (proj: DbProject) => {
    setProjId(proj.id);
    setProjTitle(proj.title);
    setProjDesc(proj.desc);
    setProjIcon(proj.icon);
    showFeedback('success', `Carregado "${proj.title}" para edição.`);
  };

  const handleDeleteProject = async (id: string, title: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o projeto "${title}"?`)) return;
    setActionLoading(true);

    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      showFeedback('error', `Não foi possível excluir o projeto: ${error.message}`);
    } else {
      await logAdminAction('DELETE_PROJECT', `projects/${title}`);
      showFeedback('success', 'Projeto removido.');
      await loadData();
    }
    setActionLoading(false);
  };

  const tabButton = (tab: AdminTab, label: string, icon: React.ReactNode) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
      style={{ padding: '10px 18px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="container section">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', marginBottom: '30px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Painel Administrativo</h1>
          <p style={{ color: '#94a3b8' }}>
            Controle usuários, permissões por página, conteúdo gerenciável, eventos, oração e auditoria.
          </p>
        </div>
        <button onClick={loadData} className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '30px', overflowX: 'auto' }}>
        {tabButton('access', 'Acessos', <Users size={16} />)}
        {tabButton('pages', 'Páginas', <FileText size={16} />)}
        {tabButton('ministries', 'Ministérios', <FileText size={16} />)}
        {tabButton('projects', 'Projetos', <FileText size={16} />)}
        {tabButton('events', 'Eventos', <Calendar size={16} />)}
        {tabButton('prayers', 'Oração', <Heart size={16} />)}
        {tabButton('logs', 'Auditoria', <Shield size={16} />)}
      </div>

      {feedback.text && (
        <div style={{
          background: feedback.type === 'success' ? 'rgba(13, 148, 136, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: feedback.type === 'success' ? '1px solid rgba(13, 148, 136, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-sm)',
          color: feedback.type === 'success' ? 'var(--teal-light)' : '#ef4444',
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {feedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Carregando painel...</p>
        </div>
      ) : (
        <>
          {activeTab === 'access' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
              <Card title="Usuários" subtitle={isAdmin ? 'Papéis e acesso geral' : 'Você pode ver os usuários cadastrados'}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {users.map((item) => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                      <div>
                        <h5 style={{ color: '#ffffff' }}>{item.full_name}</h5>
                        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{item.email}</p>
                      </div>
                      <select
                        value={item.role}
                        className="form-control"
                        disabled={!isAdmin || item.id === user?.id || actionLoading}
                        onChange={(event) => handleRoleChange(item, event.target.value as Role)}
                        style={{ maxWidth: '150px', padding: '8px', fontSize: '0.85rem' }}
                      >
                        {editableRoles.map((role) => (
                          <option key={role} value={role}>{roleLabel[role]}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Convidar por E-mail" subtitle="Convite com permissões por página">
                <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-email">E-mail</label>
                    <input id="invite-email" type="email" className="form-control" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required disabled={!isAdmin} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="invite-role">Papel</label>
                    <select id="invite-role" className="form-control" value={inviteRole} onChange={(event) => setInviteRole(event.target.value as 'admin' | 'editor' | 'collaborator')} disabled={!isAdmin}>
                      <option value="editor">Editor</option>
                      <option value="collaborator">Colaborador</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Páginas autorizadas</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                      {pages.map((page) => (
                        <label key={page.slug} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                          <input type="checkbox" checked={invitePages.includes(page.slug)} onChange={() => toggleInvitePage(page.slug)} disabled={!isAdmin || inviteRole === 'admin'} />
                          {page.title}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={inviteCanPublish} onChange={(event) => setInviteCanPublish(event.target.checked)} disabled={!isAdmin} />
                    Também pode publicar
                  </label>
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#e2e8f0',
                    background: 'rgba(217, 119, 6, 0.1)',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                    padding: '12px',
                    borderRadius: 'var(--radius-sm)',
                    lineHeight: '1.4'
                  }}>
                    <strong>⚠️ Observação importante:</strong> Este formulário apenas registra o convite no banco de dados; <strong>ele não envia um e-mail para a caixa de entrada</strong>. O papel será aplicado automaticamente quando o convidado entrar no site com sua conta Google desse e-mail. Para promover a <strong>Super Admin</strong>, altere a permissão dele na lista de "Usuários" após o primeiro login.
                  </div>
                  <button type="submit" className="btn btn-teal" disabled={!isAdmin || actionLoading}>
                    <Mail size={16} /> Registrar Convite
                  </button>
                </form>
              </Card>

              <Card title="Conceder Permissão Direta" subtitle="Para usuários que já fizeram login">
                <form onSubmit={handleManualGrant} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <select className="form-control" value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} disabled={!isAdmin}>
                    <option value="">Selecionar usuário</option>
                    {users.map((item) => (
                      <option key={item.id} value={item.id}>{item.full_name} - {item.email}</option>
                    ))}
                  </select>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                    {pages.map((page) => (
                      <label key={page.slug} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                        <input type="checkbox" checked={selectedPermissionPages.includes(page.slug)} onChange={() => toggleSelectedPermissionPage(page.slug)} disabled={!isAdmin} />
                        {page.title}
                      </label>
                    ))}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={selectedCanPublish} onChange={(event) => setSelectedCanPublish(event.target.checked)} disabled={!isAdmin} />
                    Pode publicar
                  </label>
                  <button type="submit" className="btn btn-primary" disabled={!isAdmin || actionLoading}>
                    <Plus size={16} /> Conceder Acesso
                  </button>
                </form>
              </Card>

              <Card title="Permissões Ativas" subtitle="Acesso granular por página">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {permissions.length === 0 ? (
                    <p style={{ color: '#64748b' }}>Nenhuma permissão granular cadastrada.</p>
                  ) : (
                    permissions.map((permission) => (
                      <div key={permission.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <h5>{permission.profiles?.full_name || 'Usuário'}</h5>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{permission.profiles?.email} · {permission.page_slug} · {permission.can_publish ? 'publica' : 'edita'}</p>
                        </div>
                        {isAdmin && (
                          <button className="btn btn-danger" style={{ padding: '8px 12px', fontSize: '0.8rem' }} onClick={() => handleRevokePermission(permission)} disabled={actionLoading}>
                            Revogar
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {isAdmin && (
                <Card title="Convites Registrados" subtitle="Aplicados no próximo login do convidado">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {invitations.length === 0 ? (
                      <p style={{ color: '#64748b' }}>Nenhum convite registrado.</p>
                    ) : (
                      invitations.map((invite) => (
                        <div key={invite.id} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                          <h5>{invite.email}</h5>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                            {invite.target_role} · {invite.accepted ? 'aceito' : 'pendente'} · vence {new Date(invite.expires_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'pages' && (
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '30px' }}>
              <Card title="Páginas">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {visiblePages.map((page) => (
                    <button key={page.slug} onClick={() => setSelectedPageSlug(page.slug)} className={`btn ${selectedPageSlug === page.slug ? 'btn-primary' : 'btn-secondary'}`} style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.85rem' }}>
                      {page.title}
                    </button>
                  ))}
                </div>
              </Card>

              <Card title="Editor de Conteúdo" subtitle={selectedPage ? `Slug: ${selectedPage.slug}` : 'Selecione uma página'}>
                {selectedPage ? (
                  <form onSubmit={handleSavePage} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="page-title">Nome no painel</label>
                      <input id="page-title" className="form-control" value={pageTitle} onChange={(event) => setPageTitle(event.target.value)} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="page-headline">Título principal</label>
                      <input id="page-headline" className="form-control" value={pageHeadline} onChange={(event) => setPageHeadline(event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="page-summary">Resumo</label>
                      <textarea id="page-summary" className="form-control" rows={3} value={pageSummary} onChange={(event) => setPageSummary(event.target.value)} />
                    </div>
                    <div className="form-group">
                      <label className="form-label" htmlFor="page-body">Conteúdo complementar</label>
                      <textarea id="page-body" className="form-control" rows={6} value={pageBody} onChange={(event) => setPageBody(event.target.value)} />
                    </div>
                    {selectedPage.slug === 'home' && (
                      <div className="form-group">
                        <label className="form-label" htmlFor="page-image-url">URL da Imagem de Fundo (Hero)</label>
                        <input id="page-image-url" type="url" className="form-control" value={pageImageUrl} onChange={(event) => setPageImageUrl(event.target.value)} placeholder="https://exemplo.com/imagem.jpg" />
                      </div>
                    )}
                    {selectedPage.slug === 'sobre' && (
                      <>
                        <div className="form-group">
                          <label className="form-label" htmlFor="page-image-url">URL da Imagem da Nossa História</label>
                          <input id="page-image-url" type="url" className="form-control" value={pageImageUrl} onChange={(event) => setPageImageUrl(event.target.value)} placeholder="https://exemplo.com/imagem.jpg" />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="page-leader1-image">URL da Foto do Pastor Presidente</label>
                          <input id="page-leader1-image" type="url" className="form-control" value={pageLeader1Image} onChange={(event) => setPageLeader1Image(event.target.value)} placeholder="https://exemplo.com/foto_pastor.jpg" />
                        </div>
                        <div className="form-group">
                          <label className="form-label" htmlFor="page-leader2-image">URL da Foto do Corpo de Diáconos</label>
                          <input id="page-leader2-image" type="url" className="form-control" value={pageLeader2Image} onChange={(event) => setPageLeader2Image(event.target.value)} placeholder="https://exemplo.com/foto_diaconos.jpg" />
                        </div>
                      </>
                    )}
                    <div className="form-group">
                      <label className="form-label" htmlFor="page-status">Status</label>
                      <select id="page-status" className="form-control" value={pageStatus} onChange={(event) => setPageStatus(event.target.value as 'draft' | 'published')}>
                        <option value="published">Publicado</option>
                        <option value="draft">Rascunho</option>
                      </select>
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                      <Save size={16} /> Salvar Página
                    </button>
                  </form>
                ) : (
                  <p style={{ color: '#64748b' }}>Nenhuma página disponível para seu usuário.</p>
                )}
              </Card>
            </div>
          )}

          {activeTab === 'events' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <Card title="Cadastrar Evento" subtitle="Aparece na página Agenda & Eventos">
                <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input className="form-control" placeholder="Título" value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} required />
                  <textarea className="form-control" rows={3} placeholder="Descrição" value={eventDesc} onChange={(event) => setEventDesc(event.target.value)} />
                  <input className="form-control" type="datetime-local" value={eventDate} onChange={(event) => setEventDate(event.target.value)} required />
                  <input className="form-control" placeholder="Local" value={eventLoc} onChange={(event) => setEventLoc(event.target.value)} required />
                  <select className="form-control" value={eventCat} onChange={(event) => setEventCat(event.target.value as 'culto' | 'conferencia' | 'acao_social' | 'outro')}>
                    <option value="culto">Culto</option>
                    <option value="conferencia">Conferência</option>
                    <option value="acao_social">Ação Social</option>
                    <option value="outro">Outro</option>
                  </select>
                  <button className="btn btn-primary" disabled={actionLoading}>
                    <Plus size={16} /> Salvar Evento
                  </button>
                </form>
              </Card>
            </div>
          )}

          {activeTab === 'prayers' && (
            <Card title="Fila de Oração" subtitle="Pedidos enviados pelo formulário público">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {prayers.length === 0 ? (
                  <p style={{ color: '#64748b' }}>Nenhum pedido de oração.</p>
                ) : prayers.map((prayer) => (
                  <div key={prayer.id} style={{ padding: '18px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      <div>
                        <h4>{prayer.name}</h4>
                        <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{new Date(prayer.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      <span className={prayer.is_confidential ? 'badge badge-gold' : 'badge badge-teal'}>{prayer.is_confidential ? 'Confidencial' : 'Grupo de oração'}</span>
                    </div>
                    <p style={{ color: '#cbd5e1', marginBottom: '14px' }}>{prayer.request}</p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      <button className="btn btn-teal" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => handlePrayerStatus(prayer.id, 'prayed')}>Marcar orado</button>
                      <button className="btn btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={() => handlePrayerStatus(prayer.id, 'archived')}>Arquivar</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'logs' && (
            <Card title="Auditoria" subtitle="Ações administrativas registradas">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {auditLogs.length === 0 ? (
                  <p style={{ color: '#64748b' }}>Nenhum log gravado.</p>
                ) : auditLogs.map((log) => (
                  <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', padding: '12px 16px', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>{log.action}</span>
                      <p style={{ color: '#e2e8f0', fontSize: '0.85rem', marginTop: '6px' }}>{log.target_resource}</p>
                      <p style={{ color: '#64748b', fontSize: '0.8rem' }}>{log.user_email}</p>
                    </div>
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'ministries' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
              <Card title={minId ? 'Editar Ministério' : 'Cadastrar Ministério'} subtitle="Campos dinâmicos para a página de Ministérios">
                <form onSubmit={handleSaveMinistry} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="min-title">Título do Ministério</label>
                    <input id="min-title" className="form-control" value={minTitle} onChange={(e) => setMinTitle(e.target.value)} required placeholder="Ex: Ministério Infantil" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="min-group">Grupo/Categoria</label>
                    <select id="min-group" className="form-control" value={minGroup} onChange={(e) => setMinGroup(e.target.value)}>
                      <option value="Cuidado">Cuidado</option>
                      <option value="Serviço">Serviço</option>
                      <option value="Formação">Formação</option>
                      <option value="Ensino">Ensino</option>
                      <option value="Comunhão">Comunhão</option>
                      <option value="Celebração">Celebração</option>
                      <option value="Evangelismo">Evangelismo</option>
                      <option value="Comunicação">Comunicação</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="min-desc">Descrição</label>
                    <textarea id="min-desc" className="form-control" rows={3} value={minDesc} onChange={(e) => setMinDesc(e.target.value)} required placeholder="Escreva a descrição do ministério..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="min-icon">Ícone Lucide</label>
                    <select id="min-icon" className="form-control" value={minIcon} onChange={(e) => setMinIcon(e.target.value)}>
                      <option value="HeartHandshake">HeartHandshake (Cuidado/Acolhimento)</option>
                      <option value="BookOpen">BookOpen (Bíblia/Ensino)</option>
                      <option value="Music">Music (Música/Louvor)</option>
                      <option value="Shield">Shield (Proteção/Homens/Moto)</option>
                      <option value="Users">Users (Grupo/Jovens/Família)</option>
                      <option value="Activity">Activity (Ação/Serviço)</option>
                      <option value="Smile">Smile (Crianças/Alegria)</option>
                      <option value="Heart">Heart (Coração/Amor)</option>
                      <option value="UserCheck">UserCheck (Discipulado)</option>
                      <option value="Gift">Gift (Serviço/Apoio)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="min-image">URL da Imagem</label>
                    <input id="min-image" className="form-control" value={minImage} onChange={(e) => setMinImage(e.target.value)} required placeholder="https://exemplo.com/imagem.jpg" />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                      <Save size={16} /> Salvar Ministério
                    </button>
                    {minId && (
                      <button type="button" className="btn btn-secondary" onClick={() => {
                        setMinId('');
                        setMinTitle('');
                        setMinGroup('Cuidado');
                        setMinDesc('');
                        setMinIcon('HeartHandshake');
                        setMinImage('');
                      }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </Card>

              <Card title="Lista de Ministérios" subtitle="Ministérios cadastrados no site">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dbMinistries.length === 0 ? (
                    <p style={{ color: '#64748b' }}>Nenhum ministério cadastrado.</p>
                  ) : (
                    dbMinistries.map((min) => (
                      <div key={min.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <h5 style={{ color: '#ffffff' }}>{min.title}</h5>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{min.group} · {min.icon}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleEditMinistry(min)}>
                            Editar
                          </button>
                          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleDeleteMinistry(min.id, min.title)} disabled={actionLoading}>
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'projects' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '30px' }}>
              <Card title={projId ? 'Editar Projeto' : 'Cadastrar Projeto'} subtitle="Campos dinâmicos para a página de Projetos">
                <form onSubmit={handleSaveProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-title">Título do Projeto</label>
                    <input id="proj-title" className="form-control" value={projTitle} onChange={(e) => setProjTitle(e.target.value)} required placeholder="Ex: Hospital Espiritual" />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-desc">Descrição</label>
                    <textarea id="proj-desc" className="form-control" rows={3} value={projDesc} onChange={(e) => setProjDesc(e.target.value)} required placeholder="Escreva a descrição do projeto..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="proj-icon">Ícone Lucide</label>
                    <select id="proj-icon" className="form-control" value={projIcon} onChange={(e) => setProjIcon(e.target.value)}>
                      <option value="Activity">Activity (Ação/Atividade/Esporte)</option>
                      <option value="Smile">Smile (Família/Alegria/Cura)</option>
                      <option value="Heart">Heart (Amor/Missão/Apoio)</option>
                      <option value="UserCheck">UserCheck (Identidade/Edificação)</option>
                      <option value="Gift">Gift (Serviço/Social/Apoio)</option>
                      <option value="BookOpen">BookOpen (Educação/Ensino/Negócios)</option>
                      <option value="HeartHandshake">HeartHandshake (Cuidado/Acolhimento)</option>
                      <option value="Users">Users (Grupo/Comunhão)</option>
                      <option value="Music">Music (Música/Louvor)</option>
                      <option value="Shield">Shield (Segurança/Proteção)</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                      <Save size={16} /> Salvar Projeto
                    </button>
                    {projId && (
                      <button type="button" className="btn btn-secondary" onClick={() => {
                        setProjId('');
                        setProjTitle('');
                        setProjDesc('');
                        setProjIcon('Activity');
                      }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </Card>

              <Card title="Lista de Projetos" subtitle="Projetos cadastrados no site">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dbProjects.length === 0 ? (
                    <p style={{ color: '#64748b' }}>Nenhum projeto cadastrado.</p>
                  ) : (
                    dbProjects.map((proj) => (
                      <div key={proj.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 'var(--radius-sm)' }}>
                        <div>
                          <h5 style={{ color: '#ffffff' }}>{proj.title}</h5>
                          <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{proj.icon}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleEditProject(proj)}>
                            Editar
                          </button>
                          <button className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => handleDeleteProject(proj.id, proj.title)} disabled={actionLoading}>
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
};
