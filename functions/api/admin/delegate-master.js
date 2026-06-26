import { json } from '../../_shared/http.js';

/**
 * POST /api/admin/delegate-master
 * Body: { usuario_id, role }  — role pode ser 'master', 'admin', 'editor', 'membro'
 * Apenas usuários com role 'master' podem alterar roles.
 */
export async function onRequestPost({ request, env, data }) {
  if (data.session?.role !== 'master') {
    return json({ error: 'Apenas o Super Admin pode delegar funções' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { usuario_id, role } = body;
  const ROLES_VALIDOS = ['master', 'admin', 'editor', 'membro'];

  if (!usuario_id || !role || !ROLES_VALIDOS.includes(role)) {
    return json({ error: `Role inválido. Use: ${ROLES_VALIDOS.join(', ')}` }, { status: 400 });
  }

  const userId = Number(usuario_id);
  const selfId = Number(data.session.sub);

  if (userId === selfId && role !== 'master') {
    return json({ error: 'Você não pode rebaixar seu próprio acesso Master' }, { status: 400 });
  }

  const user = await env.DB.prepare(
    `SELECT id, nome, email FROM usuarios WHERE id = ? AND status_ativo = 1 LIMIT 1`
  ).bind(userId).first();

  if (!user) {
    return json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // Atualiza role na tabela usuarios
  await env.DB.prepare(
    `UPDATE usuarios SET role = ?, atualizado_em = datetime('now') WHERE id = ?`
  ).bind(role, userId).run();

  // Sincroniza role na tabela membros_igreja (se existir)
  await env.DB.prepare(
    `UPDATE membros_igreja SET atualizado_em = datetime('now') WHERE lower(email_google) = lower(?) OR lower(email) = lower(?)`
  ).bind(user.email, user.email).run();

  return json({
    ok: true,
    mensagem: `Role de ${user.nome || user.email} alterado para '${role}'`
  });
}

/**
 * GET /api/admin/delegate-master
 * Lista todos os usuários com seu role atual (para o painel de delegação)
 */
export async function onRequestGet({ env, data }) {
  if (data.session?.role !== 'master') {
    return json({ error: 'Apenas o Super Admin pode ver este painel' }, { status: 403 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, nome, email, role, status_ativo,
            ultimo_login_em
     FROM usuarios
     ORDER BY CASE role WHEN 'master' THEN 1 WHEN 'admin' THEN 2 WHEN 'editor' THEN 3 ELSE 4 END, nome`
  ).all();

  return json({ data: results || [] });
}
