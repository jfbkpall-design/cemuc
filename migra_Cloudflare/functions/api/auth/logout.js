import { json } from '../../_shared/http.js';

export async function onRequestPost({ env }) {
  const cookieName = env.JWT_COOKIE_NAME || 'cemuc_session';

  return json(
    { ok: true },
    {
      headers: {
        'set-cookie': `${cookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
      }
    }
  );
}
