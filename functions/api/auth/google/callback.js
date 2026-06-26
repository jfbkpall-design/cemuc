const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const encoder = new TextEncoder();

export async function onRequestGet({ request, env }) {
  try {
    assertEnv(env);

    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const oauthError = requestUrl.searchParams.get('error');

    if (oauthError) {
      throw new Error(`Google OAuth recusou o login: ${oauthError}`);
    }

    if (!code) {
      throw new Error('Codigo OAuth do Google ausente');
    }

    const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || `${requestUrl.origin}/api/auth/google/callback`;
    const tokenData = await exchangeCodeForTokens(env, code, redirectUri);
    const googleUser = await getGoogleUser(tokenData.access_token);

    if (!googleUser?.email) {
      throw new Error('Google nao retornou e-mail do usuario');
    }

    if (googleUser.email_verified === false) {
      throw new Error('E-mail Google nao verificado');
    }

    const identity = await findAuthorizedIdentity(env, googleUser);

    if (!identity) {
      throw new Error('Acesso Negado. Seu e-mail nao esta cadastrado na secretaria da igreja.');
    }

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

    const destination = identity.role === 'membro' || identity.role === 'member' ? '/membros' : '/admin';
    const response = Response.redirect(new URL(destination, request.url).toString(), 302);
    response.headers.append('set-cookie', sessionCookie(env, token));
    return response;
  } catch (error) {
    console.error('GOOGLE_CALLBACK_ERROR:', error?.message || error, error?.stack);
    const message = encodeURIComponent(error?.message || String(error) || 'Falha no login com Google');
    return Response.redirect(new URL(`/login?error=${message}`, request.url).toString(), 302);
  }
}

function assertEnv(env) {
  if (!env.DB) {
    throw new Error('Binding DB ausente no Cloudflare Pages');
  }

  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET ausente no Cloudflare Pages');
  }

  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID ausente no Cloudflare Pages');
  }

  if (!env.GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_SECRET ausente no Cloudflare Pages');
  }
}

async function exchangeCodeForTokens(env, code, redirectUri) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const text = await response.text();
  const data = parseJson(text, 'Google Token endpoint');

  if (!response.ok) {
    throw new Error(`Google Token endpoint falhou (${response.status}): ${data.error_description || data.error || text}`);
  }

  if (!data.access_token) {
    throw new Error('Google Token endpoint nao retornou access_token');
  }

  return data;
}

async function getGoogleUser(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` }
  });

  const text = await response.text();
  const data = parseJson(text, 'Google UserInfo endpoint');

  if (!response.ok) {
    throw new Error(`Google UserInfo endpoint falhou (${response.status}): ${data.error_description || data.error || text}`);
  }

  return data;
}

function parseJson(text, label) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Resposta invalida do ${label}: ${text.slice(0, 200)}`);
  }
}

async function findAuthorizedIdentity(env, googleUser) {
  const email = googleUser.email.toLowerCase();

  const member = await env.DB.prepare(
    `SELECT id,
            COALESCE(email_google, email) AS email,
            COALESCE(nome_completo, nome) AS nome,
            status_ativo
     FROM membros_igreja
     WHERE lower(COALESCE(email_google, email)) = lower(?) AND status_ativo = 1
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
    role: user?.role || 'membro',
    avatarUrl: googleUser.picture || null
  };
}

async function signJwt(payload, secret, expiresInSeconds = 60 * 60 * 24 * 7) {
  if (!secret) {
    throw new Error('JWT_SECRET ausente');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const signingInput = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput)));

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

function base64UrlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : encoder.encode(JSON.stringify(input));
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function sessionCookie(env, token, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const name = env.JWT_COOKIE_NAME || 'cemuc_session';

  return [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=Strict'
  ].join('; ');
}
