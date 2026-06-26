import { getCookie, json } from '../../_shared/http.js';
import { verifyJwt } from '../../_shared/jwt.js';

export async function onRequestGet({ request, env }) {
  const token = getCookie(request, env.JWT_COOKIE_NAME || 'cemuc_session');
  const session = await verifyJwt(token, env.JWT_SECRET);

  if (!session) {
    return json({ user: null }, { status: 401 });
  }

  return json({
    user: {
      id: session.sub,
      member_id: session.member_id,
      email: session.email,
      nome: session.nome,
      role: session.role,
      avatar_url: session.avatar_url
    }
  });
}
