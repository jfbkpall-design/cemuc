import { sessionCookie } from './http.js';
import { signJwt } from './jwt.js';

export async function findAuthorizedIdentity(env, googleUser) {
  const email = googleUser?.email?.toLowerCase();

  if (!email || googleUser.email_verified === false) {
    return null;
  }

  const member = await env.DB.prepare(
    `SELECT id, email, nome, status_ativo
     FROM membros_igreja
     WHERE lower(email) = lower(?) AND status_ativo = 1
     LIMIT 1`
  ).bind(email).first();

  if (!member) {
    return null;
  }

  const user = await env.DB.prepare(
    `SELECT id, email, nome, role, status_ativo
     FROM usuarios
     WHERE lower(email) = lower(?) AND status_ativo = 1
     LIMIT 1`
  ).bind(email).first();

  return {
    id: user?.id || member.id,
    memberId: member.id,
    email,
    nome: user?.nome || member.nome || googleUser.name || email,
    role: user?.role || 'member',
    avatarUrl: googleUser.picture || null
  };
}

export async function createSessionResponse(env, identity, init = {}) {
  const token = await signJwt(
    {
      sub: String(identity.id),
      member_id: identity.memberId,
      email: identity.email,
      nome: identity.nome,
      role: identity.role,
      avatar_url: identity.avatarUrl
    },
    env.JWT_SECRET
  );

  await env.DB.prepare(
    `UPDATE usuarios
     SET ultimo_login_em = datetime('now'), atualizado_em = datetime('now')
     WHERE lower(email) = lower(?)`
  ).bind(identity.email).run();

  return {
    token,
    headers: {
      'set-cookie': sessionCookie(env, token),
      ...(init.headers || {})
    }
  };
}
