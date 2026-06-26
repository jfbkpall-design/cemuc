import React, { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, Calendar, FileText, Heart, Lock, MapPin, MessageSquare,
  Music, Phone, Save, Settings, Shield, Trash2, Rss, Pencil, Users, Key, Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';

type Tab = 'membros' | 'ministerios' | 'paginas' | 'pregacoes' | 'eventos' | 'oracao' | 'configuracoes' | 'conta' | 'delegacao';

const ROLES = [
  { value: 'membro',       label: 'Membro' },
  { value: 'editor',       label: 'Editor' },
  { value: 'admin',        label: 'Administrador Geral' },
  { value: 'master',       label: 'Super Admin' },
];

const PERMISSION_AREAS = [
  { key: 'ministerios',  label: 'Ministérios',    icon: <Shield size={14}/> },
  { key: 'projetos',     label: 'Projetos',        icon: <BookOpen size={14}/> },
  { key: 'eventos',      label: 'Eventos / Agenda',icon: <Calendar size={14}/> },
  { key: 'pregacoes',    label: 'Pregações',       icon: <Music size={14}/> },
  { key: 'paginas',      label: 'Páginas',         icon: <FileText size={14}/> },
  { key: 'oracao',       label: 'Pedidos de Oração',icon: <Heart size={14}/> },
  { key: 'configuracoes',label: 'Configurações',   icon: <Settings size={14}/> },
];

interface Membro {
  id: number;
  nome_completo: string;
  email_google: string;
  telefone?: string;
  status_ativo: number;
  permissions?: string;
}

interface Page {
  id: number;
  slug: string;
  titulo: string;
  resumo?: string;
  conteudo?: string;
  apenas_membros: number;
}

interface Ministry {
  id: number;
  slug: string;
  title: string;
  group: string;
  desc: string;
  icon: string;
  image: string;
  apenas_membros: number;
}

interface Evento {
  id: number;
  slug: string;
  titulo: string;
  descricao?: string;
  local?: string;
  inicio_em: string;
  apenas_membros: number;
}

interface Prayer {
  id: number;
  nome: string;
  pedido: string;
  confidencial: number;
  status: string;
  criado_em: string;
}

interface Config {
  email_contato?: string;
  whatsapp?: string;
  endereco?: string;
  google_maps_url?: string;
  email_destino?: string;
  rss_spotify_url?: string;
  pregacoes_apenas_membros?: string;
}

async function api(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      accept: 'application/json',
      ...(init?.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(init?.headers || {})
    },
    ...init
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error((payload as { error?: string }).error || 'Erro na requisição');
  return payload;
}

interface UsuarioDelegacao {
  id: number;
  nome: string;
  email: string;
  role: string;
  status_ativo: number;
  ultimo_login_em?: string;
}

export const AdminDashboard: React.FC = () => {
  const { user: currentUser } = useAuth();
  const isMaster = currentUser?.role === 'master';

  const [tab, setTab] = useState<Tab>('membros');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'success' | 'error'>('success');

  const [members, setMembers] = useState<Membro[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [prayers, setPrayers] = useState<Prayer[]>([]);
  const [config, setConfig] = useState<Config>({});

  // Change password state
  const [pwSenhaAtual, setPwSenhaAtual] = useState('');
  const [pwNova, setPwNova] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');

  // Delegation state
  const [delegaUsers, setDelegaUsers] = useState<UsuarioDelegacao[]>([]);
  const [delegaLoading, setDelegaLoading] = useState(false);

  // Member form
  const [memberId, setMemberId] = useState<number | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberActive, setMemberActive] = useState(true);
  const [memberRole, setMemberRole] = useState('membro');
  const [memberPerms, setMemberPerms] = useState<Record<string, boolean>>({});

  // Page form
  const [pageSlugEdit, setPageSlugEdit] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [pageSlug, setPageSlug] = useState('');
  const [pageSummary, setPageSummary] = useState('');
  const [pageBody, setPageBody] = useState('');
  const [pageMembersOnly, setPageMembersOnly] = useState(false);

  // Ministry form
  const [ministrySlugEdit, setMinistrySlugEdit] = useState<string | null>(null);
  const [ministryTitle, setMinistryTitle] = useState('');
  const [ministryGroup, setMinistryGroup] = useState('Cuidado');
  const [ministryDesc, setMinistryDesc] = useState('');
  const [ministryIcon, setMinistryIcon] = useState('HeartHandshake');
  const [ministryImage, setMinistryImage] = useState('');
  const [ministryMembersOnly, setMinistryMembersOnly] = useState(false);

  // Event form
  const [eventoSlugEdit, setEventoSlugEdit] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventMembersOnly, setEventMembersOnly] = useState(false);

  // Sermons (RSS)
  const [rssUrl, setRssUrl] = useState('');
  const [sermonMembersOnly, setSermonMembersOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState('');

  // Config form
  const [cfgEmailContato, setCfgEmailContato] = useState('');
  const [cfgWhatsapp, setCfgWhatsapp] = useState('');
  const [cfgEndereco, setCfgEndereco] = useState('');
  const [cfgMapsUrl, setCfgMapsUrl] = useState('');
  const [cfgEmailDestino, setCfgEmailDestino] = useState('');

  const showFeedback = (msg: string, type: 'success' | 'error' = 'success') => {
    setFeedback(msg);
    setFeedbackType(type);
    setTimeout(() => setFeedback(''), 4000);
  };

  const loadData = useCallback(async () => {
    try {
      const [m, p, min, ev, pr, cfg] = await Promise.all([
        api('/api/admin/membros'),
        api('/api/paginas'),
        api('/api/ministerios'),
        api('/api/eventos'),
        api('/api/oracao'),
        api('/api/configuracoes'),
      ]);
      setMembers(m.data || []);
      setPages(p.data || []);
      setMinistries(min.data || []);
      setEventos(ev.data || []);
      setPrayers(pr.data || []);
      const cfgData: Config = cfg.data || {};
      setConfig(cfgData);
      setCfgEmailContato(cfgData.email_contato || '');
      setCfgWhatsapp(cfgData.whatsapp || '');
      setCfgEndereco(cfgData.endereco || '');
      setCfgMapsUrl(cfgData.google_maps_url || '');
      setCfgEmailDestino(cfgData.email_destino || '');
      setRssUrl(cfgData.rss_spotify_url || '');
      setSermonMembersOnly(cfgData.pregacoes_apenas_membros === '1');
    } catch (e: unknown) {
      showFeedback((e as Error).message, 'error');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── MEMBERS ────────────────────────────────────────────────────────
  const resetMemberForm = () => {
    setMemberId(null); setMemberName(''); setMemberEmail('');
    setMemberPhone(''); setMemberActive(true); setMemberRole('membro');
    setMemberPerms({});
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = JSON.stringify({
        nome_completo: memberName, email_google: memberEmail,
        telefone: memberPhone, status_ativo: memberActive,
        role: memberRole, permissions: memberPerms
      });
      await api(memberId ? `/api/admin/membros/${memberId}` : '/api/admin/membros', {
        method: memberId ? 'PUT' : 'POST', body
      });
      showFeedback('Membro salvo com sucesso!');
      resetMemberForm();
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  const deactivateMember = async (id: number) => {
    if (!confirm('Desativar este membro?')) return;
    try {
      await api(`/api/admin/membros/${id}`, { method: 'DELETE' });
      showFeedback('Membro desativado.');
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  const editMember = (m: Membro) => {
    setMemberId(m.id); setMemberName(m.nome_completo); setMemberEmail(m.email_google);
    setMemberPhone(m.telefone || ''); setMemberActive(Boolean(m.status_ativo));
    try { setMemberPerms(m.permissions ? JSON.parse(m.permissions) : {}); } catch { setMemberPerms({}); }
  };

  // ── PAGES ──────────────────────────────────────────────────────────
  const resetPageForm = () => {
    setPageSlugEdit(null); setPageTitle(''); setPageSlug('');
    setPageSummary(''); setPageBody(''); setPageMembersOnly(false);
  };

  const savePage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = pageSlugEdit !== null;
      await api(isEdit ? `/api/paginas/${pageSlugEdit}` : '/api/paginas', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({ titulo: pageTitle, slug: pageSlug, resumo: pageSummary, conteudo: pageBody, apenas_membros: pageMembersOnly })
      });
      showFeedback('Página salva!');
      resetPageForm();
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  const editPage = (p: Page) => {
    setPageSlugEdit(p.slug); setPageTitle(p.titulo); setPageSlug(p.slug);
    setPageSummary(p.resumo || ''); setPageBody(p.conteudo || '');
    setPageMembersOnly(Boolean(p.apenas_membros));
  };

  const deletePage = async (slug: string) => {
    if (!confirm('Excluir esta página?')) return;
    try {
      await api(`/api/paginas/${slug}`, { method: 'DELETE' });
      showFeedback('Página excluída.');
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  // ── MINISTRIES ─────────────────────────────────────────────────────
  const resetMinistryForm = () => {
    setMinistrySlugEdit(null); setMinistryTitle(''); setMinistryGroup('Cuidado');
    setMinistryDesc(''); setMinistryIcon('HeartHandshake'); setMinistryImage('');
    setMinistryMembersOnly(false);
  };

  const saveMinistry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = ministrySlugEdit !== null;
      await api(isEdit ? `/api/ministerios/${ministrySlugEdit}` : '/api/ministerios', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({ title: ministryTitle, group: ministryGroup, desc: ministryDesc, icon: ministryIcon, image: ministryImage, apenas_membros: ministryMembersOnly })
      });
      showFeedback('Ministério salvo!');
      resetMinistryForm();
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  const editMinistry = (m: Ministry) => {
    setMinistrySlugEdit(m.slug); setMinistryTitle(m.title); setMinistryGroup(m.group);
    setMinistryDesc(m.desc); setMinistryIcon(m.icon); setMinistryImage(m.image);
    setMinistryMembersOnly(Boolean(m.apenas_membros));
  };

  const deleteMinistry = async (slug: string) => {
    if (!confirm('Excluir este ministério?')) return;
    try {
      await api(`/api/ministerios/${slug}`, { method: 'DELETE' });
      showFeedback('Ministério excluído.');
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  // ── EVENTS ─────────────────────────────────────────────────────────
  const resetEventForm = () => {
    setEventoSlugEdit(null); setEventTitle(''); setEventDate('');
    setEventLocation(''); setEventDesc(''); setEventMembersOnly(false);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = eventoSlugEdit !== null;
      await api(isEdit ? `/api/eventos/${eventoSlugEdit}` : '/api/eventos', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify({ titulo: eventTitle, descricao: eventDesc, local: eventLocation, inicio_em: new Date(eventDate).toISOString(), apenas_membros: eventMembersOnly })
      });
      showFeedback('Evento salvo!');
      resetEventForm();
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  const editEvento = (ev: Evento) => {
    setEventoSlugEdit(ev.slug); setEventTitle(ev.titulo); setEventDesc(ev.descricao || '');
    setEventLocation(ev.local || ''); setEventMembersOnly(Boolean(ev.apenas_membros));
    if (ev.inicio_em) {
      const d = new Date(ev.inicio_em);
      const iso = d.toISOString();
      setEventDate(iso.substring(0, 16));
    }
  };

  const deleteEvento = async (slug: string) => {
    if (!confirm('Excluir este evento?')) return;
    try {
      await api(`/api/eventos/${slug}`, { method: 'DELETE' });
      showFeedback('Evento excluído.');
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  // ── PRAYERS ────────────────────────────────────────────────────────
  const updatePrayer = async (id: number, status: 'orado' | 'arquivado') => {
    try {
      await api(`/api/oracao/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      showFeedback('Pedido atualizado.');
      await loadData();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  // ── SERMONS RSS ────────────────────────────────────────────────────
  const saveRssConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/configuracoes', {
        method: 'PUT',
        body: JSON.stringify({
          rss_spotify_url: rssUrl,
          pregacoes_apenas_membros: sermonMembersOnly ? '1' : '0'
        })
      });
      showFeedback('Configuração do RSS salva!');
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  // ── CONFIG ─────────────────────────────────────────────────────────
  const saveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/configuracoes', {
        method: 'PUT',
        body: JSON.stringify({
          email_contato: cfgEmailContato,
          whatsapp: cfgWhatsapp,
          endereco: cfgEndereco,
          google_maps_url: cfgMapsUrl,
          email_destino: cfgEmailDestino,
        })
      });
      showFeedback('Configurações salvas!');
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; masterOnly?: boolean }> = [
    { id: 'membros',       label: 'Membros',       icon: <Users size={15}/> },
    { id: 'ministerios',   label: 'Ministérios',   icon: <Shield size={15}/> },
    { id: 'paginas',       label: 'Páginas',        icon: <FileText size={15}/> },
    { id: 'pregacoes',     label: 'Pregações',      icon: <Rss size={15}/> },
    { id: 'eventos',       label: 'Eventos',        icon: <Calendar size={15}/> },
    { id: 'oracao',        label: 'Oração',         icon: <Heart size={15}/> },
    { id: 'configuracoes', label: 'Configurações',  icon: <Settings size={15}/> },
    { id: 'conta',         label: 'Minha Conta',    icon: <Key size={15}/> },
    { id: 'delegacao',     label: 'Delegação',      icon: <Crown size={15}/>, masterOnly: true },
  ];

  // Load delegation users when tab is selected
  const loadDelegaUsers = useCallback(async () => {
    if (!isMaster) return;
    setDelegaLoading(true);
    try {
      const res = await api('/api/admin/delegate-master');
      setDelegaUsers(res.data || []);
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
    finally { setDelegaLoading(false); }
  }, [isMaster]);

  const handleDelegaRole = async (userId: number, role: string) => {
    try {
      const res = await api('/api/admin/delegate-master', {
        method: 'POST',
        body: JSON.stringify({ usuario_id: userId, role })
      });
      showFeedback(res.mensagem || 'Role atualizado!');
      await loadDelegaUsers();
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({
          senha_atual: pwSenhaAtual,
          nova_senha: pwNova,
          confirmar_senha: pwConfirm
        })
      });
      showFeedback('Senha alterada com sucesso!');
      setPwSenhaAtual(''); setPwNova(''); setPwConfirm('');
    } catch (e: unknown) { showFeedback((e as Error).message, 'error'); }
  };

  // Filtered events by date
  const eventosFiltrados = dateFilter
    ? eventos.filter(ev => ev.inicio_em?.startsWith(dateFilter))
    : eventos;

  return (
    <div className="container section">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Painel Administrativo</h1>
        <p style={{ color: '#94a3b8' }}>Cloudflare D1, Pages Functions e R2 · CEMUC</p>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
        {tabs.filter(t => !t.masterOnly || isMaster).map((item) => (
          <button
            key={item.id}
            className={`btn ${tab === item.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setTab(item.id); if (item.id === 'delegacao') loadDelegaUsers(); }}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="glass-panel" style={{
          padding: '14px 18px', marginBottom: '24px',
          color: feedbackType === 'error' ? '#f87171' : 'var(--gold)',
          borderLeft: `3px solid ${feedbackType === 'error' ? '#f87171' : 'var(--gold)'}`
        }}>
          {feedback}
        </div>
      )}

      {/* ── MEMBROS ────────────────────────────────────────────────── */}
      {tab === 'membros' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 460px) 1fr', gap: '24px' }}>
          <Card title={memberId ? 'Editar Membro' : 'Adicionar Membro'} subtitle="Whitelist + permissões por área">
            <form onSubmit={saveMember} style={{ display: 'grid', gap: '12px' }}>
              <input className="form-control" placeholder="Nome completo" value={memberName} onChange={(e) => setMemberName(e.target.value)} required />
              <input className="form-control" type="email" placeholder="email@gmail.com" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required />
              <input className="form-control" placeholder="Telefone" value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} />
              <select className="form-control" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#cbd5e1', fontSize: '.9rem' }}>
                <input type="checkbox" checked={memberActive} onChange={(e) => setMemberActive(e.target.checked)} />
                Membro ativo
              </label>

              {/* Permissões granulares */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: '12px' }}>
                <p style={{ color: '#94a3b8', fontSize: '.85rem', marginBottom: '8px' }}>Permissões de acesso às áreas:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  {PERMISSION_AREAS.map(area => (
                    <label key={area.key} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#cbd5e1', fontSize: '.85rem' }}>
                      <input
                        type="checkbox"
                        checked={!!memberPerms[area.key]}
                        onChange={(e) => setMemberPerms(prev => ({ ...prev, [area.key]: e.target.checked }))}
                      />
                      {area.icon} {area.label}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save size={15}/> Salvar
                </button>
                {memberId && (
                  <button type="button" className="btn btn-secondary" onClick={resetMemberForm}>Cancelar</button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Membros Cadastrados" subtitle={`${members.length} membros`}>
            <div style={{ display: 'grid', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {members.map((m) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', padding: '12px', border: '1px solid rgba(255,255,255,.07)', borderRadius: '8px' }}>
                  <div>
                    <strong style={{ color: '#e2e8f0' }}>{m.nome_completo}</strong>
                    <p style={{ color: '#94a3b8', fontSize: '.85rem', margin: '2px 0' }}>{m.email_google}</p>
                    <p style={{ color: m.status_ativo ? '#4ade80' : '#f87171', fontSize: '.75rem' }}>
                      {m.status_ativo ? '● Ativo' : '● Inativo'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => editMember(m)}>
                      <Pencil size={12}/> Editar
                    </button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => deactivateMember(m.id)}>
                      <Trash2 size={12}/> Desativar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── MINISTÉRIOS ─────────────────────────────────────────────── */}
      {tab === 'ministerios' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 460px) 1fr', gap: '24px' }}>
          <Card title={ministrySlugEdit ? 'Editar Ministério' : 'Novo Ministério'} subtitle="Conteúdo e imagem">
            <form onSubmit={saveMinistry} style={{ display: 'grid', gap: '12px' }}>
              <input className="form-control" placeholder="Nome do ministério" value={ministryTitle} onChange={(e) => setMinistryTitle(e.target.value)} required />
              <select className="form-control" value={ministryGroup} onChange={(e) => setMinistryGroup(e.target.value)}>
                {['Cuidado','Serviço','Formação','Ensino','Comunhão','Celebração','Evangelismo','Comunicação','Crianças'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <textarea className="form-control" rows={3} placeholder="Descrição" value={ministryDesc} onChange={(e) => setMinistryDesc(e.target.value)} />
              <input className="form-control" placeholder="Ícone (ex: HeartHandshake, Users, Music)" value={ministryIcon} onChange={(e) => setMinistryIcon(e.target.value)} />
              <input className="form-control" placeholder="URL da imagem de capa" value={ministryImage} onChange={(e) => setMinistryImage(e.target.value)} />
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#cbd5e1', fontSize: '.9rem' }}>
                <input type="checkbox" checked={ministryMembersOnly} onChange={(e) => setMinistryMembersOnly(e.target.checked)} />
                <Lock size={14}/> Restrito a membros
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save size={15}/> Salvar
                </button>
                {ministrySlugEdit && (
                  <button type="button" className="btn btn-secondary" onClick={resetMinistryForm}>Cancelar</button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Ministérios Cadastrados" subtitle={`${ministries.length} ministérios`}>
            <div style={{ display: 'grid', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {ministries.map((m) => (
                <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', padding: '12px', border: '1px solid rgba(255,255,255,.07)', borderRadius: '8px', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#e2e8f0' }}>{m.title}</strong>
                    <p style={{ color: '#64748b', fontSize: '.8rem' }}>{m.group}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => editMinistry(m)}>
                      <Pencil size={12}/> Editar
                    </button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => deleteMinistry(m.slug)}>
                      <Trash2 size={12}/> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── PÁGINAS ─────────────────────────────────────────────────── */}
      {tab === 'paginas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 500px) 1fr', gap: '24px' }}>
          <Card title={pageSlugEdit ? 'Editar Página' : 'Nova Página'} subtitle="Conteúdo público ou restrito">
            <form onSubmit={savePage} style={{ display: 'grid', gap: '12px' }}>
              <input className="form-control" placeholder="Título" value={pageTitle} onChange={(e) => setPageTitle(e.target.value)} required />
              <input className="form-control" placeholder="slug-da-pagina" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} disabled={!!pageSlugEdit} />
              <textarea className="form-control" rows={2} placeholder="Resumo" value={pageSummary} onChange={(e) => setPageSummary(e.target.value)} />
              <textarea className="form-control" rows={6} placeholder="Conteúdo" value={pageBody} onChange={(e) => setPageBody(e.target.value)} />
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#cbd5e1', fontSize: '.9rem' }}>
                <input type="checkbox" checked={pageMembersOnly} onChange={(e) => setPageMembersOnly(e.target.checked)} />
                <Lock size={14}/> Restrito a membros
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save size={15}/> Salvar Página
                </button>
                {pageSlugEdit && (
                  <button type="button" className="btn btn-secondary" onClick={resetPageForm}>Cancelar</button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Páginas" subtitle={`${pages.length} páginas`}>
            <div style={{ display: 'grid', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {pages.map((p) => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', padding: '12px', border: '1px solid rgba(255,255,255,.07)', borderRadius: '8px', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#e2e8f0' }}>{p.titulo}</strong>
                    <p style={{ color: '#64748b', fontSize: '.8rem' }}>/{p.slug} {p.apenas_membros ? '· 🔒 restrita' : ''}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => editPage(p)}>
                      <Pencil size={12}/> Editar
                    </button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => deletePage(p.slug)}>
                      <Trash2 size={12}/> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── PREGAÇÕES (RSS) ─────────────────────────────────────────── */}
      {tab === 'pregacoes' && (
        <div style={{ display: 'grid', gap: '24px' }}>
          <Card title="Configuração do RSS" subtitle="Spotify / Anchor Podcast">
            <form onSubmit={saveRssConfig} style={{ display: 'grid', gap: '14px', maxWidth: '640px' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'block', marginBottom: '6px' }}>
                  <Rss size={14} style={{ display: 'inline', marginRight: '4px' }}/>
                  URL do RSS Feed (Spotify / Anchor)
                </label>
                <input
                  className="form-control"
                  type="url"
                  placeholder="https://anchor.fm/s/xxxxxxxx/podcast/rss"
                  value={rssUrl}
                  onChange={(e) => setRssUrl(e.target.value)}
                />
                <p style={{ color: '#475569', fontSize: '.78rem', marginTop: '4px' }}>
                  No Spotify for Podcasters: Configurações → RSS feed → Copiar URL
                </p>
              </div>

              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#cbd5e1', fontSize: '.9rem' }}>
                <input type="checkbox" checked={sermonMembersOnly} onChange={(e) => setSermonMembersOnly(e.target.checked)} />
                <Lock size={14}/> Pregações visíveis apenas para membros
              </label>

              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                <Save size={15}/> Salvar Configuração RSS
              </button>
            </form>
          </Card>

          <Card title="Buscar Pregações por Data" subtitle="Filtro do feed RSS">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                className="form-control"
                type="month"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{ maxWidth: '200px' }}
              />
              {dateFilter && (
                <button className="btn btn-secondary" onClick={() => setDateFilter('')} style={{ fontSize: '.85rem' }}>
                  Limpar filtro
                </button>
              )}
            </div>
            {rssUrl && (
              <p style={{ color: '#64748b', fontSize: '.85rem', marginTop: '12px' }}>
                Feed configurado: <a href={rssUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--gold)' }}>{rssUrl}</a>
              </p>
            )}
          </Card>
        </div>
      )}

      {/* ── EVENTOS ─────────────────────────────────────────────────── */}
      {tab === 'eventos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 460px) 1fr', gap: '24px' }}>
          <Card title={eventoSlugEdit ? 'Editar Evento' : 'Novo Evento'} subtitle="Agenda pública ou restrita">
            <form onSubmit={saveEvent} style={{ display: 'grid', gap: '12px' }}>
              <input className="form-control" placeholder="Título" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} required />
              <input className="form-control" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required />
              <input className="form-control" placeholder="Local" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} />
              <textarea className="form-control" rows={3} placeholder="Descrição" value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} />
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#cbd5e1', fontSize: '.9rem' }}>
                <input type="checkbox" checked={eventMembersOnly} onChange={(e) => setEventMembersOnly(e.target.checked)} />
                <Lock size={14}/> Restrito a membros
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Save size={15}/> Salvar Evento
                </button>
                {eventoSlugEdit && (
                  <button type="button" className="btn btn-secondary" onClick={resetEventForm}>Cancelar</button>
                )}
              </div>
            </form>
          </Card>

          <Card title="Eventos" subtitle={`${eventosFiltrados.length} eventos · mais recente primeiro`}>
            <div style={{ display: 'grid', gap: '10px', maxHeight: '520px', overflowY: 'auto' }}>
              {eventosFiltrados.map((ev) => (
                <div key={ev.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', padding: '12px', border: '1px solid rgba(255,255,255,.07)', borderRadius: '8px', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#e2e8f0' }}>{ev.titulo}</strong>
                    <p style={{ color: '#64748b', fontSize: '.8rem' }}>
                      {new Date(ev.inicio_em).toLocaleString('pt-BR')}
                      {ev.local ? ` · ${ev.local}` : ''}
                      {ev.apenas_membros ? ' · 🔒' : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => editEvento(ev)}>
                      <Pencil size={12}/> Editar
                    </button>
                    <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => deleteEvento(ev.slug)}>
                      <Trash2 size={12}/> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── ORAÇÃO ──────────────────────────────────────────────────── */}
      {tab === 'oracao' && (
        <Card title="Pedidos de Oração" subtitle="Fila pastoral">
          <div style={{ display: 'grid', gap: '14px' }}>
            {prayers.length === 0 && <p style={{ color: '#64748b' }}>Nenhum pedido pendente.</p>}
            {prayers.map((prayer) => (
              <div key={prayer.id} style={{ padding: '14px', border: '1px solid rgba(255,255,255,.08)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <strong style={{ color: '#e2e8f0' }}>{prayer.nome}</strong>
                  <span style={{ fontSize: '.75rem', color: '#475569' }}>{new Date(prayer.criado_em).toLocaleDateString('pt-BR')}</span>
                </div>
                <p style={{ color: '#94a3b8', marginBottom: '12px', fontSize: '.9rem' }}>{prayer.pedido}</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-teal" style={{ fontSize: '.85rem' }} onClick={() => updatePrayer(prayer.id, 'orado')}>✓ Marcar orado</button>
                  <button className="btn btn-secondary" style={{ fontSize: '.85rem' }} onClick={() => updatePrayer(prayer.id, 'arquivado')}>Arquivar</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── CONFIGURAÇÕES ───────────────────────────────────────────── */}
      {tab === 'configuracoes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 580px) 1fr', gap: '24px' }}>
          <Card title="Informações de Contato da Igreja" subtitle="Editável pelo administrador">
            <form onSubmit={saveConfig} style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <MessageSquare size={13}/> E-mail de contato (exibido no site)
                </label>
                <input className="form-control" type="email" placeholder="secretaria@cemuc.com" value={cfgEmailContato} onChange={(e) => setCfgEmailContato(e.target.value)} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <MessageSquare size={13}/> E-mail de destino (recebe as mensagens)
                </label>
                <input className="form-control" type="email" placeholder="pastor@cemuc.com" value={cfgEmailDestino} onChange={(e) => setCfgEmailDestino(e.target.value)} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <Phone size={13}/> WhatsApp (formato: 5521XXXXXXXXX)
                </label>
                <input className="form-control" placeholder="5521999999999" value={cfgWhatsapp} onChange={(e) => setCfgWhatsapp(e.target.value)} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <MapPin size={13}/> Endereço físico da igreja
                </label>
                <textarea className="form-control" rows={2} placeholder="Rua da CEMUC, s/n – Magalhães Bastos, Rio de Janeiro/RJ" value={cfgEndereco} onChange={(e) => setCfgEndereco(e.target.value)} />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                  <MapPin size={13}/> URL do Google Maps embed
                </label>
                <input className="form-control" placeholder="https://maps.google.com/maps?q=..." value={cfgMapsUrl} onChange={(e) => setCfgMapsUrl(e.target.value)} />
              </div>
              <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                <Save size={15}/> Salvar Configurações
              </button>
            </form>
          </Card>

          <div style={{ display: 'grid', gap: '16px', alignContent: 'start' }}>
            <Card title="Pré-visualização" subtitle="Como aparece no site">
              <div style={{ display: 'grid', gap: '10px', color: '#cbd5e1', fontSize: '.9rem' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <MessageSquare size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--gold)' }}/>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '.78rem' }}>E-mail</p>
                    <p>{cfgEmailContato || config.email_contato || '—'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <Phone size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--gold)' }}/>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '.78rem' }}>WhatsApp</p>
                    <p>{cfgWhatsapp || config.whatsapp || '—'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--gold)' }}/>
                  <div>
                    <p style={{ color: '#94a3b8', fontSize: '.78rem' }}>Endereço</p>
                    <p>{cfgEndereco || config.endereco || '—'}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
      {/* ── MINHA CONTA (alterar senha) ─────────────────────────── */}
      {tab === 'conta' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 480px) 1fr', gap: '24px' }}>
          <Card title="Alterar Senha" subtitle={`Logado como ${currentUser?.nome || currentUser?.email || '—'} · ${currentUser?.role}`}>
            <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: '14px' }}>
              {/* Master trocando sua própria senha ainda precisa da atual */}
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'block', marginBottom: '6px' }}>Senha atual</label>
                <input
                  className="form-control"
                  type="password"
                  placeholder="Senha atual"
                  value={pwSenhaAtual}
                  onChange={(e) => setPwSenhaAtual(e.target.value)}
                  required
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'block', marginBottom: '6px' }}>Nova senha (mín. 8 caracteres)</label>
                <input
                  className="form-control"
                  type="password"
                  placeholder="Nova senha"
                  value={pwNova}
                  onChange={(e) => setPwNova(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label style={{ color: '#94a3b8', fontSize: '.85rem', display: 'block', marginBottom: '6px' }}>Confirmar nova senha</label>
                <input
                  className="form-control"
                  type="password"
                  placeholder="Repetir nova senha"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  required
                />
              </div>
              {pwNova && pwConfirm && pwNova !== pwConfirm && (
                <p style={{ color: '#f87171', fontSize: '.85rem' }}>⚠ As senhas não conferem</p>
              )}
              <button
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}
                disabled={!!pwNova && !!pwConfirm && pwNova !== pwConfirm}
              >
                <Key size={15}/> Alterar Senha
              </button>
            </form>
          </Card>

          <Card title="Informações da Conta" subtitle="Dados do usuário atual">
            <div style={{ display: 'grid', gap: '14px' }}>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,.07)' }}>
                <p style={{ color: '#64748b', fontSize: '.8rem', marginBottom: '4px' }}>Nome</p>
                <p style={{ color: '#e2e8f0' }}>{currentUser?.nome || '—'}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,.07)' }}>
                <p style={{ color: '#64748b', fontSize: '.8rem', marginBottom: '4px' }}>E-mail</p>
                <p style={{ color: '#e2e8f0' }}>{currentUser?.email || '—'}</p>
              </div>
              <div style={{ padding: '16px', background: 'rgba(255,255,255,.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,.07)' }}>
                <p style={{ color: '#64748b', fontSize: '.8rem', marginBottom: '4px' }}>Nível de Acesso</p>
                <p style={{ color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase' }}>{currentUser?.role || '—'}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── DELEGAÇÃO DE ACESSO (master only) ────────────────────── */}
      {tab === 'delegacao' && isMaster && (
        <Card title="Delegação de Acesso" subtitle="Conceda ou revogue funções administrativas">
          {delegaLoading && <p style={{ color: '#64748b' }}>Carregando usuários...</p>}
          <div style={{ display: 'grid', gap: '10px' }}>
            {delegaUsers.map((u) => (
              <div key={u.id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto',
                gap: '12px', padding: '14px',
                border: '1px solid rgba(255,255,255,.07)', borderRadius: '8px', alignItems: 'center'
              }}>
                <div>
                  <strong style={{ color: '#e2e8f0' }}>{u.nome || u.email}</strong>
                  <p style={{ color: '#64748b', fontSize: '.8rem' }}>{u.email}</p>
                  <span style={{
                    display: 'inline-block', marginTop: '4px',
                    padding: '2px 8px', borderRadius: '99px', fontSize: '.75rem', fontWeight: 700,
                    background: u.role === 'master' ? 'rgba(217,119,6,.2)' : u.role === 'admin' ? 'rgba(59,130,246,.2)' : 'rgba(255,255,255,.06)',
                    color: u.role === 'master' ? 'var(--gold)' : u.role === 'admin' ? '#60a5fa' : '#94a3b8',
                  }}>{u.role.toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {['master','admin','editor','membro'].map(role => (
                    <button
                      key={role}
                      className={`btn ${u.role === role ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 10px', fontSize: '.78rem', minHeight: 'unset' }}
                      onClick={() => handleDelegaRole(u.id, role)}
                      disabled={u.role === role}
                      title={role === 'master' ? 'Conceder Super Admin' : `Definir como ${role}`}
                    >
                      {role === 'master' ? <Crown size={12}/> : null} {role}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
