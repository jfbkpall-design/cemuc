import { json, getCookie } from '../../_shared/http.js';
import { verifyJwt } from '../../_shared/jwt.js';
import { hashPassword, verifyPassword } from '../../_shared/password.js';

/**
 * POST /api/admin/change-password
 * Body: { senha_atual, nova_senha, confirmar_senha }
 * Requer: sessão ativa (qualquer role autenticado)
 * Master pode trocar de qualquer usuário (body.usuario_id opcional)
 */
export async function onRequestPost({ request, env, data }) {
  const session = data.session;
  if (!session?.sub) {
    return json({ error: 'Não autenticado' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { senha_atual, nova_senha, confirmar_senha, usuario_id } = body;

  if (!nova_senha || nova_senha.length < 8) {
    return json({ error: 'Nova senha deve ter pelo menos 8 caracteres' }, { status: 400 });
  }

  if (nova_senha !== confirmar_senha) {
    return json({ error: 'A confirmação da senha não confere' }, { status: 400 });
  }

  // Master pode trocar senha de outro usuário sem informar a atual
  const isMaster = session.role === 'master';
  const targetId = (isMaster && usuario_id) ? Number(usuario_id) : Number(session.sub);

  const user = await env.DB.prepare(
    `SELECT id, nome, email, role, senha_hash FROM usuarios WHERE id = ? AND status_ativo = 1 LIMIT 1`
  ).bind(targetId).first();

  if (!user) {
    return json({ error: 'Usuário não encontrado' }, { status: 404 });
  }

  // Se não é master (ou é master trocando a própria senha), exige senha atual
  const ownChange = targetId === Number(session.sub);
  if (!isMaster || ownChange) {
    if (!senha_atual) {
      return json({ error: 'Informe a senha atual' }, { status: 400 });
    }
    if (!user.senha_hash || !(await verifyPassword(senha_atual, user.senha_hash))) {
      return json({ error: 'Senha atual incorreta' }, { status: 401 });
    }
  }

  const novoHash = await hashPassword(nova_senha);

  await env.DB.prepare(
    `UPDATE usuarios
     SET senha_hash = ?, senha_atualizada_em = datetime('now'), atualizado_em = datetime('now')
     WHERE id = ?`
  ).bind(novoHash, targetId).run();

  return json({ ok: true, mensagem: 'Senha atualizada com sucesso' });
}
