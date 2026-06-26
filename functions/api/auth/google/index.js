export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account'
  });

  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
}
