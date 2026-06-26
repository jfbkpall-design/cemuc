import { parseGoogleLoginRequest } from '../../../_shared/google.js';
import { json, redirect } from '../../../_shared/http.js';
import { createSessionResponse, findAuthorizedIdentity } from '../../../_shared/session.js';

export async function onRequestGet({ request, env }) {
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

  return redirect('/admin', { headers: session.headers });
}
