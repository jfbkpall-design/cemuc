import { json, sessionCookie } from '../_shared/http.js';
import { signJwt } from '../_shared/jwt.js';
import { verifyPassword } from '../_shared/password.js';

export async function onRequestPost({ request, env }) {
  try {
    if (!env.DB) {
      console.error('ADMIN_LOGIN_ERROR: env.DB ausente');
      return json({ error: 'Configuracao interna invalida (DB)' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const identifier = String(body.identifier || body.email || body.usuario || '').trim().toLowerCase();
    const password = String(body.password || body.senha || '');
    const compactIdentifier = identifier.replace(/\s+/g, '');
    const aliasIdentifier = compactIdentifier === 'deusesterno' ? 'deuseterno' : compactIdentifier;

    console.log('Tentativa de login admin:', identifier || '(vazio)');

    if (!identifier || !password) {
      return json({ error: 'Informe usuario/e-mail e senha' }, { status: 400 });
    }

    const admin = await env.DB.prepare(
      `SELECT id, email, nome, role, senha_hash, status_ativo
       FROM usuarios
       WHERE status_ativo = 1
         AND (
           lower(email) = lower(?)
           OR lower(nome) = lower(?)
           OR replace(lower(nome), ' ', '') = lower(?)
           OR replace(lower(nome), ' ', '') = lower(?)
         )
       LIMIT 1`
    ).bind(identifier, identifier, compactIdentifier, aliasIdentifier).first();

    if (!admin) {
      console.log('ADMIN_LOGIN_NOT_FOUND:', identifier);
      return json({ error: 'Credenciais invalidas' }, { status: 401 });
    }

    if (!admin.senha_hash) {
      console.error('ADMIN_LOGIN_NO_PASSWORD_HASH:', admin.id, admin.email);
      return json({ error: 'Senha nao configurada. Contate o administrador.' }, { status: 401 });
    }

    let passwordOk = false;
    try {
      passwordOk = await verifyPassword(password, admin.senha_hash);
    } catch (cryptoError) {
      console.error('ADMIN_LOGIN_CRYPTO_ERROR:', cryptoError?.message || cryptoError);
      return json({ error: 'Erro ao verificar senha. Tente novamente.' }, { status: 500 });
    }

    if (!passwordOk) {
      console.log('ADMIN_LOGIN_BAD_PASSWORD:', admin.id, admin.email);
      return json({ error: 'Credenciais invalidas' }, { status: 401 });
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
    console.error('ADMIN_LOGIN_FATAL:', error?.message || error, error?.stack);
    return json({ error: 'Erro interno no login: ' + (error?.message || 'desconhecido') }, { status: 500 });
  }
}
