import { json } from './http.js';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export function googleAuthUrl(request, env) {
  const url = new URL(request.url);
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForGoogleUser(request, env, code) {
  const url = new URL(request.url);
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
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

  if (!tokenResponse.ok) {
    return null;
  }

  const tokenData = await tokenResponse.json();

  return getGoogleUserFromAccessToken(tokenData.access_token);
}

export async function getGoogleUserFromAccessToken(accessToken) {
  if (!accessToken) {
    return null;
  }

  const userResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!userResponse.ok) {
    return null;
  }

  return userResponse.json();
}

export async function parseGoogleLoginRequest(request, env) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    return {
      error: json({ error: 'OAuth Google não configurado' }, { status: 500 })
    };
  }

  if (request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    const accessToken = body.access_token || body.accessToken;

    if (!accessToken) {
      return {
        error: json({ error: 'access_token do Google ausente' }, { status: 400 })
      };
    }

    return { googleUser: await getGoogleUserFromAccessToken(accessToken) };
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return {
      error: json({ error: 'Código OAuth do Google ausente' }, { status: 400 })
    };
  }

  return { googleUser: await exchangeCodeForGoogleUser(request, env, code) };
}
