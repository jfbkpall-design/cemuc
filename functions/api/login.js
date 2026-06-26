import { json, sessionCookie } from '../_shared/http.js';
import { signJwt } from '../_shared/jwt.js';
import { verifyPassword } from '../_shared/password.js';

export async function onRequestPost({ request, env }) {
  try {
    // Verifica binding do banco
    if (!env.DB) {
      console.error('LOGIN_ERROR: env.DB não está disponível');
      return json({ error: 'Configuração interna inválida (DB)' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const identifier = String(body.email || body.usuario || '').trim().toLowerCase();
    const senha = String(body.senha || body.password || '');

    if (!identifier || !senha) {
      return json({ error: 'Informe usuário/e-mail e senha' }, { status: 400 });
    }

    const admin = await env.DB.prepare(
      `SELECT id, email, nome, role, senha_hash, status_ativo
       FROM usuarios
       WHERE (lower(email) = lower(?) OR lower(nome) = lower(?)) AND status_ativo = 1
       LIMIT 1`
    ).bind(identifier, identifier).first();

    if (!admin) {
      return json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    if (!admin.senha_hash) {
      console.error(`LOGIN_ERROR: usuário ${identifier} não tem senha_hash`);
      return json({ error: 'Senha não configurada. Contate o administrador.' }, { status: 401 });
    }

    let senhaOk = false;
    try {
      senhaOk = await verifyPassword(senha, admin.senha_hash);
    } catch (cryptoErr) {
      console.error('LOGIN_ERROR crypto:', cryptoErr?.message || cryptoErr);
      return json({ error: 'Erro ao verificar senha. Tente novamente.' }, { status: 500 });
    }

    if (!senhaOk) {
      return json({ error: 'Credenciais inválidas' }, { status: 401 });
    }

    const token = await signJwt(
      {
        sub: String(admin.id),
        email: admin.email,
        nome: admin.nome || admin.email,
        role: admin.role || 'admin'
      },
      env.JWT_SECRET
    );

    await env.DB.prepare(
      `UPDATE usuarios
       SET ultimo_login_em = datetime('now'), atualizado_em = datetime('now')
       WHERE id = ?`
    ).bind(admin.id).run();

    return json(
      {
        ok: true,
        user: {
          id: String(admin.id),
          email: admin.email,
          nome: admin.nome || admin.email,
          role: admin.role || 'admin'
        }
      },
      { headers: { 'set-cookie': sessionCookie(env, token) } }
    );
  } catch (error) {
    console.error('LOGIN_ERROR geral:', error?.message || error, error?.stack);
    return json({ error: 'Erro interno no login: ' + (error?.message || 'desconhecido') }, { status: 500 });
  }
}

