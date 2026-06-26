import { googleAuthUrl, parseGoogleLoginRequest } from '../../_shared/google.js';
import { json, redirect } from '../../_shared/http.js';
import { createSessionResponse, findAuthorizedIdentity } from '../../_shared/session.js';

export async function onRequestGet({ request, env }) {
  if (new URL(request.url).searchParams.has('code')) {
    return finishGoogleLogin(request, env);
  }

  const authUrl = googleAuthUrl(request, env);
  if (!authUrl) {
    return json({ error: 'Google OAuth não configurado no servidor. Contacte o administrador.' }, { status: 500 });
  }

  return redirect(authUrl);
}


export async function onRequestPost({ request, env }) {
  return finishGoogleLogin(request, env);
}

async function finishGoogleLogin(request, env) {
  const { googleUser, error } = await parseGoogleLoginRequest(request, env);

  if (error) {
    return error;
  }

  if (!googleUser?.email) {
    return json({ error: 'Não foi possível validar o e-mail do Google' }, { status: 401 });
  }

  const identity = await findAuthorizedIdentity(env, googleUser);

  if (!identity) {
    return json({ error: 'Acesso Negado. Seu e-mail não está cadastrado na secretaria da igreja.' }, { status: 403 });
  }

  const session = await createSessionResponse(env, identity);

  if (request.method === 'POST') {
    return json(
      {
        ok: true,
        user: {
          id: identity.id,
          email: identity.email,
          nome: identity.nome,
          role: identity.role,
          avatar_url: identity.avatarUrl
        }
      },
      { headers: session.headers }
    );
  }

  return redirect('/admin', { headers: session.headers });
}
