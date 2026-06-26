import { getCookie, json } from '../../_shared/http.js';
import { verifyJwt } from '../../_shared/jwt.js';
import { hashPassword } from '../../_shared/password.js';

export async function onRequestPost({ request, env }) {
  const token = getCookie(request, env.JWT_COOKIE_NAME || 'cemuc_session');
  const session = await verifyJwt(token, env.JWT_SECRET);
  const body = await request.json().catch(() => ({}));
  const bootstrapSecret = request.headers.get('x-bootstrap-secret') || body.bootstrapSecret;

  if (bootstrapSecret !== env.ADMIN_BOOTSTRAP_SECRET) {
    return json({ error: 'Bootstrap não autorizado' }, { status: 403 });
  }

  const email = String(body.email || session?.email || '').trim().toLowerCase();
  const senha = String(body.senha || body.password || '');

  if (!email || senha.length < 10) {
    return json({ error: 'Informe e-mail e senha com pelo menos 10 caracteres' }, { status: 400 });
  }

  const senhaHash = await hashPassword(senha);

  await env.DB.prepare(
    `UPDATE usuarios
     SET senha_hash = ?, senha_atualizada_em = datetime('now'), atualizado_em = datetime('now')
     WHERE lower(email) = lower(?)`
  ).bind(senhaHash, email).run();

  return json({ ok: true });
}
