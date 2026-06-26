export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {})
    }
  });
}

export function redirect(location, init = {}) {
  return new Response(null, {
    status: init.status || 302,
    headers: {
      location,
      ...(init.headers || {})
    }
  });
}

export function getCookie(request, name) {
  const cookie = request.headers.get('cookie') || '';
  const parts = cookie.split(';').map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function sessionCookie(env, token, maxAgeSeconds = 60 * 60 * 24 * 7) {
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
