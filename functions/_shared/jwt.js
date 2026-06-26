const encoder = new TextEncoder();

function base64UrlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : encoder.encode(JSON.stringify(input));
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function importKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(payload, secret, expiresInSeconds = 60 * 60 * 24 * 7) {
  if (!secret) {
    throw new Error('JWT_SECRET ausente');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };
  const signingInput = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  const key = await importKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(signingInput)));

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

export async function verifyJwt(token, secret) {
  if (!token || !secret) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }

  const key = await importKey(secret);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    base64UrlDecode(encodedSignature),
    encoder.encode(signingInput)
  );

  if (!valid) {
    return null;
  }

  const payloadText = new TextDecoder().decode(base64UrlDecode(encodedPayload));
  const payload = JSON.parse(payloadText);
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    return null;
  }

  return payload;
}
