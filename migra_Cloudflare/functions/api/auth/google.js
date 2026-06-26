import { googleAuthUrl, parseGoogleLoginRequest } from '../../_shared/google.js';
import { json, redirect } from '../../_shared/http.js';
import { createSessionResponse, findAuthorizedIdentity } from '../../_shared/session.js';

export async function onRequestGet({ request, env }) {
  if (new URL(request.url).searchParams.has('code')) {
    return finishGoogleLogin(request, env);
  }

  return redirect(googleAuthUrl(request, env));
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
    return json({ error: 'E-mail não autorizado pela secretaria' }, { status: 403 });
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
