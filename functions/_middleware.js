import { getCookie, json } from './_shared/http.js';
import { verifyJwt } from './_shared/jwt.js';

const PROTECTED_PREFIXES = [
  '/admin',
  '/api/admin',
  '/api/upload'
];

const MEMBER_CONTENT_PREFIXES = [
  '/api/paginas',
  '/api/conteudos',
  '/api/ministerios',
  '/api/projetos',
  '/api/pregacoes',
  '/api/eventos',
  '/api/avisos',
  '/api/calendario'
];

const ADMIN_ROLES = new Set(['master', 'admin', 'editor']);
const AUTHORIZED_ROLES = new Set(['master', 'admin', 'editor', 'member', 'membro']);

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname === '/api/admin/bootstrap-password') {
    return context.next();
  }

  const session = await getSession(context.request, context.env);
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  const isMemberContentRoute = MEMBER_CONTENT_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));

  context.data.session = session;

  if (isProtectedRoute && !session) {
    return unauthorized();
  }

  if (url.pathname.startsWith('/api/admin') && !hasAdminRole(session)) {
    return forbidden();
  }

  if (
    isMemberContentRoute &&
    await requestNeedsMemberAccess(context.env, context.request, url) &&
    !hasAuthorizedRole(session)
  ) {
    return unauthorized();
  }

  return context.next();
}

async function getSession(request, env) {
  const cookieName = env.JWT_COOKIE_NAME || 'cemuc_session';
  const token = getCookie(request, cookieName);

  if (!token) {
    return null;
  }

  return verifyJwt(token, env.JWT_SECRET);
}

async function requestNeedsMemberAccess(env, request, url) {
  if (url.searchParams.get('apenas_membros') === '1') {
    return true;
  }

  if (url.searchParams.get('restricted') === '1') {
    return true;
  }

  if (request.method !== 'GET' && request.headers.get('x-cemuc-restricted') === '1') {
    return true;
  }

  if (request.method !== 'GET') {
    return false;
  }

  return contentItemIsRestricted(env, url.pathname);
}

async function contentItemIsRestricted(env, pathname) {
  const match = pathname.match(/^\/api\/(paginas|ministerios|projetos|pregacoes|eventos|avisos|calendario)\/([^/]+)$/);

  if (!match) {
    return false;
  }

  const [, resource, rawIdentifier] = match;
  const identifier = decodeURIComponent(rawIdentifier);
  const tableByResource = {
    paginas: 'paginas',
    ministerios: 'ministerios',
    projetos: 'projetos',
    pregacoes: 'pregacoes',
    eventos: 'eventos',
    avisos: 'avisos',
    calendario: 'calendario'
  };
  const table = tableByResource[resource];
  const column = /^\d+$/.test(identifier) ? 'id' : 'slug';
  const row = await env.DB.prepare(
    `SELECT apenas_membros FROM ${table} WHERE ${column} = ? LIMIT 1`
  ).bind(identifier).first();

  return row?.apenas_membros === 1;
}

function hasAuthorizedRole(session) {
  return Boolean(session?.email && AUTHORIZED_ROLES.has(session.role));
}

function hasAdminRole(session) {
  return Boolean(session?.email && ADMIN_ROLES.has(session.role));
}

function unauthorized() {
  return json({ error: 'Sessão de membro necessária' }, { status: 401 });
}

function forbidden() {
  return json({ error: 'Acesso administrativo não autorizado' }, { status: 403 });
}
