var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _shared/http.js
function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init.headers || {}
    }
  });
}
__name(json, "json");
function redirect(location, init = {}) {
  return new Response(null, {
    status: init.status || 302,
    headers: {
      location,
      ...init.headers || {}
    }
  });
}
__name(redirect, "redirect");
function getCookie(request, name) {
  const cookie = request.headers.get("cookie") || "";
  const parts = cookie.split(";").map((part) => part.trim());
  const match2 = parts.find((part) => part.startsWith(`${name}=`));
  return match2 ? decodeURIComponent(match2.slice(name.length + 1)) : null;
}
__name(getCookie, "getCookie");
function sessionCookie(env, token, maxAgeSeconds = 60 * 60 * 24 * 7) {
  const name = env.JWT_COOKIE_NAME || "cemuc_session";
  return [
    `${name}=${encodeURIComponent(token)}`,
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict"
  ].join("; ");
}
__name(sessionCookie, "sessionCookie");

// _shared/jwt.js
var encoder = new TextEncoder();
function base64UrlEncode(input) {
  const bytes = input instanceof Uint8Array ? input : encoder.encode(JSON.stringify(input));
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(base64UrlEncode, "base64UrlEncode");
function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
__name(base64UrlDecode, "base64UrlDecode");
async function importKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
__name(importKey, "importKey");
async function signJwt(payload, secret, expiresInSeconds = 60 * 60 * 24 * 7) {
  if (!secret) {
    throw new Error("JWT_SECRET ausente");
  }
  const now = Math.floor(Date.now() / 1e3);
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };
  const signingInput = `${base64UrlEncode(header)}.${base64UrlEncode(body)}`;
  const key = await importKey(secret);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput)));
  return `${signingInput}.${base64UrlEncode(signature)}`;
}
__name(signJwt, "signJwt");
async function verifyJwt(token, secret) {
  if (!token || !secret) {
    return null;
  }
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return null;
  }
  const key = await importKey(secret);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlDecode(encodedSignature),
    encoder.encode(signingInput)
  );
  if (!valid) {
    return null;
  }
  const payloadText = new TextDecoder().decode(base64UrlDecode(encodedPayload));
  const payload = JSON.parse(payloadText);
  const now = Math.floor(Date.now() / 1e3);
  if (payload.exp && payload.exp < now) {
    return null;
  }
  return payload;
}
__name(verifyJwt, "verifyJwt");

// _shared/session.js
async function findAuthorizedIdentity(env, googleUser) {
  const email = googleUser?.email?.toLowerCase();
  if (!email || googleUser.email_verified === false) {
    return null;
  }
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
    role: user?.role || "membro",
    avatarUrl: googleUser.picture || null
  };
}
__name(findAuthorizedIdentity, "findAuthorizedIdentity");
async function createSessionResponse(env, identity, init = {}) {
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
  return {
    token,
    headers: {
      "set-cookie": sessionCookie(env, token),
      ...init.headers || {}
    }
  };
}
__name(createSessionResponse, "createSessionResponse");

// api/auth/google/callback.js
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
async function onRequestGet({ request, env }) {
  try {
    assertEnv(env);
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const oauthError = requestUrl.searchParams.get("error");
    if (oauthError) {
      throw new Error(`Google OAuth recusou o login: ${oauthError}`);
    }
    if (!code) {
      throw new Error("Codigo OAuth do Google ausente");
    }
    const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || `${requestUrl.origin}/api/auth/google/callback`;
    const tokenData = await exchangeCodeForTokens(env, code, redirectUri);
    const googleUser = await getGoogleUser(tokenData.access_token);
    if (!googleUser?.email) {
      throw new Error("Google nao retornou e-mail do usuario");
    }
    if (googleUser.email_verified === false) {
      throw new Error("E-mail Google nao verificado");
    }
    const identity = await findAuthorizedIdentity(env, googleUser);
    if (!identity) {
      throw new Error("Acesso Negado. Seu e-mail nao esta cadastrado na secretaria da igreja.");
    }
    const session = await createSessionResponse(env, identity);
    const destination = identity.role === "membro" || identity.role === "member" ? "/membros" : "/admin";
    return redirect(destination, { headers: session.headers });
  } catch (error) {
    console.error("GOOGLE_CALLBACK_ERROR:", error?.message || error, error?.stack);
    const siteUrl = env.PUBLIC_SITE_URL || new URL(request.url).origin;
    const message = encodeURIComponent(error?.message || "Falha no login com Google");
    return Response.redirect(`${siteUrl}/login?error=${message}`, 302);
  }
}
__name(onRequestGet, "onRequestGet");
function assertEnv(env) {
  if (!env.DB) {
    throw new Error("Binding DB ausente no Cloudflare Pages");
  }
  if (!env.JWT_SECRET) {
    throw new Error("JWT_SECRET ausente no Cloudflare Pages");
  }
  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID ausente no Cloudflare Pages");
  }
  if (!env.GOOGLE_CLIENT_SECRET) {
    throw new Error("GOOGLE_CLIENT_SECRET ausente no Cloudflare Pages");
  }
}
__name(assertEnv, "assertEnv");
async function exchangeCodeForTokens(env, code, redirectUri) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Resposta invalida do Google Token endpoint: ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(`Google Token endpoint falhou (${response.status}): ${data.error_description || data.error || text}`);
  }
  if (!data.access_token) {
    throw new Error("Google Token endpoint nao retornou access_token");
  }
  return data;
}
__name(exchangeCodeForTokens, "exchangeCodeForTokens");
async function getGoogleUser(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` }
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Resposta invalida do Google UserInfo endpoint: ${text.slice(0, 200)}`);
  }
  if (!response.ok) {
    throw new Error(`Google UserInfo endpoint falhou (${response.status}): ${data.error_description || data.error || text}`);
  }
  return data;
}
__name(getGoogleUser, "getGoogleUser");

// _shared/api.js
async function readJson(request) {
  return request.json().catch(() => ({}));
}
__name(readJson, "readJson");
function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === void 0 || body[field] === null || body[field] === "");
  return missing.length ? `Campos obrigat\xF3rios ausentes: ${missing.join(", ")}` : null;
}
__name(requireFields, "requireFields");
function slugify(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
__name(slugify, "slugify");
function notFound(message = "Registro n\xE3o encontrado") {
  return json({ error: message }, { status: 404 });
}
__name(notFound, "notFound");
function badRequest(message) {
  return json({ error: message }, { status: 400 });
}
__name(badRequest, "badRequest");

// api/admin/membros/[id].js
async function onRequestPut({ params, request, env }) {
  const body = await readJson(request);
  const email = String(body.email_google || "").trim().toLowerCase();
  const permissions = body.permissions ? JSON.stringify(body.permissions) : null;
  await env.DB.prepare(
    `UPDATE membros_igreja
     SET nome = ?,
         email = ?,
         nome_completo = ?,
         email_google = ?,
         telefone = ?,
         status_ativo = ?,
         permissions = COALESCE(?, permissions),
         atualizado_em = datetime('now')
     WHERE id = ?`
  ).bind(
    body.nome_completo || "",
    email,
    body.nome_completo || "",
    email,
    body.telefone || null,
    body.status_ativo === false ? 0 : 1,
    permissions,
    params.id
  ).run();
  if (body.role) {
    await env.DB.prepare(
      `INSERT INTO usuarios (email, nome, role, status_ativo)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         role = excluded.role,
         status_ativo = excluded.status_ativo,
         atualizado_em = datetime('now')`
    ).bind(email, body.nome_completo || email, body.role, body.status_ativo === false ? 0 : 1).run();
  }
  return json({ ok: true });
}
__name(onRequestPut, "onRequestPut");
async function onRequestDelete({ params, env }) {
  await env.DB.prepare(
    `UPDATE membros_igreja
     SET status_ativo = 0, atualizado_em = datetime('now')
     WHERE id = ?`
  ).bind(params.id).run();
  return json({ ok: true });
}
__name(onRequestDelete, "onRequestDelete");

// _shared/password.js
var encoder2 = new TextEncoder();
function toBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
__name(toBase64, "toBase64");
function fromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
__name(fromBase64, "fromBase64");
async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", encoder2.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}
__name(pbkdf2, "pbkdf2");
async function sha256Salted(password, saltText) {
  const bytes = encoder2.encode(`${saltText}:${password}`);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return toBase64(hash);
}
__name(sha256Salted, "sha256Salted");
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 12e4;
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${toBase64(salt)}$${toBase64(hash)}`;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;
  const parts = storedHash.split("$");
  const algorithm = parts[0];
  if (algorithm === "sha256") {
    const [, saltText2, hashText2] = parts;
    return await sha256Salted(password, saltText2) === hashText2;
  }
  const [, iterationsText, saltText, hashText] = parts;
  if (algorithm !== "pbkdf2") return false;
  const iterations = Number(iterationsText);
  const salt = fromBase64(saltText);
  const expected = fromBase64(hashText);
  const actual = await pbkdf2(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
__name(verifyPassword, "verifyPassword");

// api/admin/bootstrap-password.js
async function onRequestPost({ request, env }) {
  const token = getCookie(request, env.JWT_COOKIE_NAME || "cemuc_session");
  const session = await verifyJwt(token, env.JWT_SECRET);
  const body = await request.json().catch(() => ({}));
  const bootstrapSecret = request.headers.get("x-bootstrap-secret") || body.bootstrapSecret;
  if (bootstrapSecret !== env.ADMIN_BOOTSTRAP_SECRET) {
    return json({ error: "Bootstrap n\xE3o autorizado" }, { status: 403 });
  }
  const email = String(body.email || session?.email || "").trim().toLowerCase();
  const senha = String(body.senha || body.password || "");
  if (!email || senha.length < 10) {
    return json({ error: "Informe e-mail e senha com pelo menos 10 caracteres" }, { status: 400 });
  }
  const senhaHash = await hashPassword(senha);
  await env.DB.prepare(
    `UPDATE usuarios
     SET senha_hash = ?, senha_atualizada_em = datetime('now'), atualizado_em = datetime('now')
     WHERE lower(email) = lower(?)`
  ).bind(senhaHash, email).run();
  return json({ ok: true });
}
__name(onRequestPost, "onRequestPost");

// api/admin/change-password.js
async function onRequestPost2({ request, env, data }) {
  const session = data.session;
  if (!session?.sub) {
    return json({ error: "N\xE3o autenticado" }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inv\xE1lido" }, { status: 400 });
  }
  const { senha_atual, nova_senha, confirmar_senha, usuario_id } = body;
  if (!nova_senha || nova_senha.length < 8) {
    return json({ error: "Nova senha deve ter pelo menos 8 caracteres" }, { status: 400 });
  }
  if (nova_senha !== confirmar_senha) {
    return json({ error: "A confirma\xE7\xE3o da senha n\xE3o confere" }, { status: 400 });
  }
  const isMaster = session.role === "master";
  const targetId = isMaster && usuario_id ? Number(usuario_id) : Number(session.sub);
  const user = await env.DB.prepare(
    `SELECT id, nome, email, role, senha_hash FROM usuarios WHERE id = ? AND status_ativo = 1 LIMIT 1`
  ).bind(targetId).first();
  if (!user) {
    return json({ error: "Usu\xE1rio n\xE3o encontrado" }, { status: 404 });
  }
  const ownChange = targetId === Number(session.sub);
  if (!isMaster || ownChange) {
    if (!senha_atual) {
      return json({ error: "Informe a senha atual" }, { status: 400 });
    }
    if (!user.senha_hash || !await verifyPassword(senha_atual, user.senha_hash)) {
      return json({ error: "Senha atual incorreta" }, { status: 401 });
    }
  }
  const novoHash = await hashPassword(nova_senha);
  await env.DB.prepare(
    `UPDATE usuarios
     SET senha_hash = ?, senha_atualizada_em = datetime('now'), atualizado_em = datetime('now')
     WHERE id = ?`
  ).bind(novoHash, targetId).run();
  return json({ ok: true, mensagem: "Senha atualizada com sucesso" });
}
__name(onRequestPost2, "onRequestPost");

// api/admin/delegate-master.js
async function onRequestPost3({ request, env, data }) {
  if (data.session?.role !== "master") {
    return json({ error: "Apenas o Super Admin pode delegar fun\xE7\xF5es" }, { status: 403 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inv\xE1lido" }, { status: 400 });
  }
  const { usuario_id, role } = body;
  const ROLES_VALIDOS = ["master", "admin", "editor", "membro"];
  if (!usuario_id || !role || !ROLES_VALIDOS.includes(role)) {
    return json({ error: `Role inv\xE1lido. Use: ${ROLES_VALIDOS.join(", ")}` }, { status: 400 });
  }
  const userId = Number(usuario_id);
  const selfId = Number(data.session.sub);
  if (userId === selfId && role !== "master") {
    return json({ error: "Voc\xEA n\xE3o pode rebaixar seu pr\xF3prio acesso Master" }, { status: 400 });
  }
  const user = await env.DB.prepare(
    `SELECT id, nome, email FROM usuarios WHERE id = ? AND status_ativo = 1 LIMIT 1`
  ).bind(userId).first();
  if (!user) {
    return json({ error: "Usu\xE1rio n\xE3o encontrado" }, { status: 404 });
  }
  await env.DB.prepare(
    `UPDATE usuarios SET role = ?, atualizado_em = datetime('now') WHERE id = ?`
  ).bind(role, userId).run();
  await env.DB.prepare(
    `UPDATE membros_igreja SET atualizado_em = datetime('now') WHERE lower(email_google) = lower(?) OR lower(email) = lower(?)`
  ).bind(user.email, user.email).run();
  return json({
    ok: true,
    mensagem: `Role de ${user.nome || user.email} alterado para '${role}'`
  });
}
__name(onRequestPost3, "onRequestPost");
async function onRequestGet2({ env, data }) {
  if (data.session?.role !== "master") {
    return json({ error: "Apenas o Super Admin pode ver este painel" }, { status: 403 });
  }
  const { results } = await env.DB.prepare(
    `SELECT id, nome, email, role, status_ativo,
            ultimo_login_em
     FROM usuarios
     ORDER BY CASE role WHEN 'master' THEN 1 WHEN 'admin' THEN 2 WHEN 'editor' THEN 3 ELSE 4 END, nome`
  ).all();
  return json({ data: results || [] });
}
__name(onRequestGet2, "onRequestGet");

// api/admin/membros/index.js
async function onRequestGet3({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id,
            COALESCE(nome_completo, nome) AS nome_completo,
            COALESCE(email_google, email) AS email_google,
            telefone,
            status_ativo,
            criado_em AS data_cadastro
     FROM membros_igreja
     ORDER BY status_ativo DESC, nome_completo ASC`
  ).all();
  return json({ data: results });
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost4({ request, env }) {
  const body = await readJson(request);
  const error = requireFields(body, ["nome_completo", "email_google"]);
  if (error) return badRequest(error);
  const email = String(body.email_google).trim().toLowerCase();
  await env.DB.prepare(
    `INSERT INTO membros_igreja (nome, email, nome_completo, email_google, telefone, status_ativo)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(email_google) DO UPDATE SET
       nome_completo = excluded.nome_completo,
       nome = excluded.nome,
       telefone = excluded.telefone,
       status_ativo = excluded.status_ativo,
       atualizado_em = datetime('now')`
  ).bind(
    body.nome_completo,
    email,
    body.nome_completo,
    email,
    body.telefone || null,
    body.status_ativo === false ? 0 : 1
  ).run();
  return json({ ok: true });
}
__name(onRequestPost4, "onRequestPost");

// api/login.js
async function onRequestPost5({ request, env }) {
  try {
    if (!env.DB) {
      console.error("ADMIN_LOGIN_ERROR: env.DB ausente");
      return json({ error: "Configuracao interna invalida (DB)" }, { status: 500 });
    }
    const body = await request.json().catch(() => ({}));
    const identifier = String(body.identifier || body.email || body.usuario || "").trim().toLowerCase();
    const password = String(body.password || body.senha || "");
    const compactIdentifier = identifier.replace(/\s+/g, "");
    const aliasIdentifier = compactIdentifier === "deusesterno" ? "deuseterno" : compactIdentifier;
    console.log("Tentativa de login admin:", identifier || "(vazio)");
    if (!identifier || !password) {
      return json({ error: "Informe usuario/e-mail e senha" }, { status: 400 });
    }
    const admin = await env.DB.prepare(
      `SELECT id, email, nome, role, senha_hash, status_ativo
       FROM usuarios
       WHERE status_ativo = 1
         AND (
           lower(email) = lower(?)
           OR lower(nome) = lower(?)
           OR replace(lower(nome), ' ', '') = lower(?)
           OR replace(lower(nome), ' ', '') = lower(?)
         )
       LIMIT 1`
    ).bind(identifier, identifier, compactIdentifier, aliasIdentifier).first();
    if (!admin) {
      console.log("ADMIN_LOGIN_NOT_FOUND:", identifier);
      return json({ error: "Credenciais invalidas" }, { status: 401 });
    }
    if (!admin.senha_hash) {
      console.error("ADMIN_LOGIN_NO_PASSWORD_HASH:", admin.id, admin.email);
      return json({ error: "Senha nao configurada. Contate o administrador." }, { status: 401 });
    }
    let passwordOk = false;
    try {
      passwordOk = await verifyPassword(password, admin.senha_hash);
    } catch (cryptoError) {
      console.error("ADMIN_LOGIN_CRYPTO_ERROR:", cryptoError?.message || cryptoError);
      return json({ error: "Erro ao verificar senha. Tente novamente." }, { status: 500 });
    }
    if (!passwordOk) {
      console.log("ADMIN_LOGIN_BAD_PASSWORD:", admin.id, admin.email);
      return json({ error: "Credenciais invalidas" }, { status: 401 });
    }
    const token = await signJwt(
      {
        sub: String(admin.id),
        email: admin.email,
        nome: admin.nome || admin.email,
        role: admin.role || "admin"
      },
      env.JWT_SECRET
    );
    await env.DB.prepare(
      `UPDATE usuarios
       SET ultimo_login_em = datetime('now'), atualizado_em = datetime('now')
       WHERE id = ?`
    ).bind(admin.id).run();
    return json(
      {
        ok: true,
        user: {
          id: String(admin.id),
          email: admin.email,
          nome: admin.nome || admin.email,
          role: admin.role || "admin"
        }
      },
      { headers: { "set-cookie": sessionCookie(env, token) } }
    );
  } catch (error) {
    console.error("ADMIN_LOGIN_FATAL:", error?.message || error, error?.stack);
    return json({ error: "Erro interno no login: " + (error?.message || "desconhecido") }, { status: 500 });
  }
}
__name(onRequestPost5, "onRequestPost");

// api/auth/google/index.js
async function onRequestGet4({ request, env }) {
  const url = new URL(request.url);
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account"
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
}
__name(onRequestGet4, "onRequestGet");

// api/auth/logout.js
async function onRequestPost6({ env }) {
  const cookieName = env.JWT_COOKIE_NAME || "cemuc_session";
  return json(
    { ok: true },
    {
      headers: {
        "set-cookie": `${cookieName}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`
      }
    }
  );
}
__name(onRequestPost6, "onRequestPost");

// api/auth/me.js
async function onRequestGet5({ request, env }) {
  const token = getCookie(request, env.JWT_COOKIE_NAME || "cemuc_session");
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
__name(onRequestGet5, "onRequestGet");

// api/pregacoes/rss.js
async function onRequestGet6({ env, data }) {
  const config = await env.DB.prepare(
    `SELECT valor FROM configuracoes WHERE chave = 'rss_spotify_url' LIMIT 1`
  ).first();
  const rssUrl = config?.valor?.trim();
  if (!rssUrl) {
    return json({ error: "URL do RSS n\xE3o configurada. Configure em Configura\xE7\xF5es no painel admin." }, { status: 503 });
  }
  const restrictConfig = await env.DB.prepare(
    `SELECT valor FROM configuracoes WHERE chave = 'pregacoes_apenas_membros' LIMIT 1`
  ).first();
  const apenasMembrosCfg = restrictConfig?.valor === "1";
  const AUTHORIZED2 = /* @__PURE__ */ new Set(["master", "admin", "editor", "member", "membro"]);
  const isAuthorized = Boolean(data.session?.role && AUTHORIZED2.has(data.session.role));
  if (apenasMembrosCfg && !isAuthorized) {
    return json({ error: "Conte\xFAdo restrito a membros" }, { status: 401 });
  }
  let rssText;
  try {
    const resp = await fetch(rssUrl, {
      headers: { "User-Agent": "CEMUC-Site/1.0" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    rssText = await resp.text();
  } catch (err) {
    return json({ error: `Falha ao buscar RSS: ${err.message}` }, { status: 502 });
  }
  const episodes = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match2;
  while ((match2 = itemRegex.exec(rssText)) !== null) {
    const item = match2[1];
    const get = /* @__PURE__ */ __name((tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return m ? (m[1] ?? m[2] ?? "").trim() : "";
    }, "get");
    const getAttr = /* @__PURE__ */ __name((tag, attr) => {
      const m = item.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^/]*/>`));
      return m ? m[1] : "";
    }, "getAttr");
    const pubDate = get("pubDate");
    const dateObj = pubDate ? new Date(pubDate) : null;
    episodes.push({
      guid: get("guid"),
      titulo: get("title"),
      descricao: get("description").replace(/<[^>]*>/g, "").slice(0, 500),
      audio_url: getAttr("enclosure", "url"),
      duracao: getAttr("itunes:duration", "duration") || get("itunes:duration"),
      imagem_url: getAttr("itunes:image", "href") || "",
      data: dateObj ? dateObj.toISOString() : pubDate,
      apenas_membros: apenasMembrosCfg ? 1 : 0
    });
  }
  episodes.sort((a, b) => {
    if (!a.data && !b.data) return 0;
    if (!a.data) return 1;
    if (!b.data) return -1;
    return new Date(b.data) - new Date(a.data);
  });
  return json({ data: episodes, source: rssUrl });
}
__name(onRequestGet6, "onRequestGet");

// api/eventos/[slug].js
async function onRequestGet7({ params, env }) {
  const { slug } = params;
  const row = await env.DB.prepare(
    `SELECT id, slug, titulo, descricao, local, inicio_em, fim_em, imagem_capa_url, apenas_membros, publicado
     FROM eventos WHERE slug = ? LIMIT 1`
  ).bind(slug).first();
  if (!row) return json({ error: "Evento n\xE3o encontrado" }, { status: 404 });
  return json({ data: row });
}
__name(onRequestGet7, "onRequestGet");
async function onRequestPut2({ params, request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await readJson(request);
  const { slug } = params;
  const result = await env.DB.prepare(
    `UPDATE eventos
     SET
       titulo                    = COALESCE(?, titulo),
       descricao                 = COALESCE(?, descricao),
       local                     = COALESCE(?, local),
       inicio_em                 = COALESCE(?, inicio_em),
       fim_em                    = COALESCE(?, fim_em),
       imagem_capa_url           = COALESCE(?, imagem_capa_url),
       apenas_membros            = COALESCE(?, apenas_membros),
       publicado                 = COALESCE(?, publicado),
       atualizado_por_usuario_id = ?,
       atualizado_em             = datetime('now')
     WHERE slug = ?`
  ).bind(
    body.titulo ?? null,
    body.descricao ?? null,
    body.local ?? null,
    body.inicio_em ?? null,
    body.fim_em ?? null,
    body.imagem_capa_url ?? null,
    body.apenas_membros != null ? body.apenas_membros ? 1 : 0 : null,
    body.publicado != null ? body.publicado ? 1 : 0 : null,
    data.session?.sub ?? null,
    slug
  ).run();
  if (result.changes === 0) {
    return json({ error: "Evento n\xE3o encontrado" }, { status: 404 });
  }
  return json({ ok: true });
}
__name(onRequestPut2, "onRequestPut");
async function onRequestDelete2({ params, env, data }) {
  if (!["master", "admin"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const result = await env.DB.prepare(
    `DELETE FROM eventos WHERE slug = ?`
  ).bind(params.slug).run();
  if (result.changes === 0) {
    return json({ error: "Evento n\xE3o encontrado" }, { status: 404 });
  }
  return json({ ok: true });
}
__name(onRequestDelete2, "onRequestDelete");

// api/ministerios/[slug].js
async function onRequestPut3({ params, request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inv\xE1lido" }, { status: 400 });
  }
  const { slug } = params;
  const result = await env.DB.prepare(
    `UPDATE ministerios
     SET
       nome                    = COALESCE(?, nome),
       titulo_curto            = COALESCE(?, titulo_curto),
       grupo                   = COALESCE(?, grupo),
       descricao               = COALESCE(?, descricao),
       conteudo                = COALESCE(?, conteudo),
       icone                   = COALESCE(?, icone),
       imagem_capa_url         = COALESCE(?, imagem_capa_url),
       apenas_membros          = COALESCE(?, apenas_membros),
       publicado               = COALESCE(?, publicado),
       atualizado_por_usuario_id = ?,
       atualizado_em           = datetime('now')
     WHERE slug = ?`
  ).bind(
    body.title ?? null,
    body.title ?? null,
    body.group ?? null,
    body.desc ?? null,
    body.conteudo ?? null,
    body.icon ?? null,
    body.image ?? null,
    body.apenas_membros != null ? body.apenas_membros ? 1 : 0 : null,
    body.publicado != null ? body.publicado ? 1 : 0 : null,
    data.session?.sub ?? null,
    slug
  ).run();
  if (result.changes === 0) {
    return json({ error: "Minist\xE9rio n\xE3o encontrado" }, { status: 404 });
  }
  return json({ ok: true });
}
__name(onRequestPut3, "onRequestPut");
async function onRequestDelete3({ params, env, data }) {
  if (!["master", "admin"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const { slug } = params;
  const result = await env.DB.prepare(
    `DELETE FROM ministerios WHERE slug = ?`
  ).bind(slug).run();
  if (result.changes === 0) {
    return json({ error: "Minist\xE9rio n\xE3o encontrado" }, { status: 404 });
  }
  return json({ ok: true });
}
__name(onRequestDelete3, "onRequestDelete");
async function onRequestGet8({ params, env }) {
  const { slug } = params;
  const row = await env.DB.prepare(
    `SELECT id, slug,
            COALESCE(titulo_curto, nome) AS title,
            COALESCE(grupo, 'Cuidado') AS "group",
            COALESCE(descricao, '') AS "desc",
            COALESCE(icone, 'HeartHandshake') AS icon,
            COALESCE(imagem_capa_url, '') AS image,
            conteudo, apenas_membros, publicado
     FROM ministerios
     WHERE slug = ?`
  ).bind(slug).first();
  if (!row) {
    return json({ error: "N\xE3o encontrado" }, { status: 404 });
  }
  return json({ data: row });
}
__name(onRequestGet8, "onRequestGet");

// api/oracao/[id].js
async function onRequestPatch({ params, request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await readJson(request);
  const status = body.status === "arquivado" ? "arquivado" : "orado";
  await env.DB.prepare(
    `UPDATE pedidos_oracao
     SET status = ?, atualizado_em = datetime('now')
     WHERE id = ?`
  ).bind(status, params.id).run();
  return json({ ok: true });
}
__name(onRequestPatch, "onRequestPatch");

// api/paginas/[slug].js
async function onRequestGet9({ params, env }) {
  const page = await env.DB.prepare(
    `SELECT id, slug, titulo, resumo, conteudo, imagem_capa_url, apenas_membros, publicado, atualizado_em
     FROM paginas
     WHERE slug = ? AND publicado = 1
     LIMIT 1`
  ).bind(params.slug).first();
  if (!page) return notFound("P\xE1gina n\xE3o encontrada");
  return json({ data: page });
}
__name(onRequestGet9, "onRequestGet");
async function onRequestPut4({ params, request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inv\xE1lido" }, { status: 400 });
  }
  const result = await env.DB.prepare(
    `UPDATE paginas
     SET
       titulo                    = COALESCE(?, titulo),
       resumo                    = COALESCE(?, resumo),
       conteudo                  = COALESCE(?, conteudo),
       imagem_capa_url           = COALESCE(?, imagem_capa_url),
       apenas_membros            = COALESCE(?, apenas_membros),
       publicado                 = COALESCE(?, publicado),
       atualizado_por_usuario_id = ?,
       atualizado_em             = datetime('now')
     WHERE slug = ?`
  ).bind(
    body.titulo ?? null,
    body.resumo ?? null,
    body.conteudo ?? null,
    body.imagem_capa_url ?? null,
    body.apenas_membros != null ? body.apenas_membros ? 1 : 0 : null,
    body.publicado != null ? body.publicado ? 1 : 0 : null,
    data.session?.sub ?? null,
    params.slug
  ).run();
  if (result.changes === 0) {
    return json({ error: "P\xE1gina n\xE3o encontrada" }, { status: 404 });
  }
  return json({ ok: true });
}
__name(onRequestPut4, "onRequestPut");
async function onRequestDelete4({ params, env, data }) {
  if (!["master", "admin"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  await env.DB.prepare("DELETE FROM paginas WHERE slug = ?").bind(params.slug).run();
  return json({ ok: true });
}
__name(onRequestDelete4, "onRequestDelete");

// api/pregacoes/[slug].js
async function onRequestGet10({ params, env }) {
  const row = await env.DB.prepare(
    `SELECT p.id, p.slug, p.titulo, p.descricao, p.pregador, p.data_pregacao,
            p.imagem_capa_url, p.duracao_segundos, p.apenas_membros, p.publicado,
            a.url_publica AS audio_url, a.mime_type AS audio_mime_type
     FROM pregacoes p
     LEFT JOIN arquivos_r2 a ON a.id = p.audio_arquivo_id
     WHERE p.slug = ? AND p.publicado = 1
     LIMIT 1`
  ).bind(params.slug).first();
  if (!row) return notFound("Prega\xE7\xE3o n\xE3o encontrada");
  return json({ data: row });
}
__name(onRequestGet10, "onRequestGet");
async function onRequestDelete5({ params, env, data }) {
  if (!["master", "admin"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  await env.DB.prepare("DELETE FROM pregacoes WHERE slug = ?").bind(params.slug).run();
  return json({ ok: true });
}
__name(onRequestDelete5, "onRequestDelete");

// api/projetos/[slug].js
async function onRequestDelete6({ params, env, data }) {
  if (!["master", "admin"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  await env.DB.prepare("DELETE FROM projetos WHERE slug = ?").bind(params.slug).run();
  return json({ ok: true });
}
__name(onRequestDelete6, "onRequestDelete");

// api/auth-google.js
async function onRequestGet11({ request, env }) {
  const url = new URL(request.url);
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account"
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
}
__name(onRequestGet11, "onRequestGet");

// api/configuracoes.js
async function onRequestGet12({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT chave, valor FROM configuracoes`
  ).all();
  const config = Object.fromEntries(results.map((r) => [r.chave, r.valor]));
  return json({ data: config });
}
__name(onRequestGet12, "onRequestGet");
async function onRequestPut5({ request, env, data }) {
  if (!["master", "admin"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inv\xE1lido" }, { status: 400 });
  }
  const allowedKeys = [
    "email_contato",
    "whatsapp",
    "endereco",
    "google_maps_url",
    "email_destino",
    "rss_spotify_url"
  ];
  const entries = Object.entries(body).filter(([k]) => allowedKeys.includes(k));
  if (entries.length === 0) {
    return json({ error: "Nenhuma chave v\xE1lida fornecida" }, { status: 400 });
  }
  await Promise.all(
    entries.map(
      ([chave, valor]) => env.DB.prepare(
        `INSERT INTO configuracoes (chave, valor, atualizado_em)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = datetime('now')`
      ).bind(chave, String(valor)).run()
    )
  );
  return json({ ok: true });
}
__name(onRequestPut5, "onRequestPut");

// api/conteudos.js
var AUTHORIZED = /* @__PURE__ */ new Set(["master", "admin", "editor", "member", "membro"]);
async function onRequestGet13({ request, env }) {
  const token = getCookie(request, env.JWT_COOKIE_NAME || "cemuc_session");
  const session = await verifyJwt(token, env.JWT_SECRET);
  const canSeeRestricted = Boolean(session?.role && AUTHORIZED.has(session.role));
  const whereVisibility = canSeeRestricted ? "" : "AND apenas_membros = 0";
  const [paginas, pregacoes, eventos, avisos, calendario] = await Promise.all([
    env.DB.prepare(
      `SELECT 'pagina' AS tipo, id, slug, titulo, resumo AS descricao, apenas_membros, atualizado_em AS data
       FROM paginas
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY atualizado_em DESC`
    ).all(),
    env.DB.prepare(
      `SELECT 'pregacao' AS tipo, id, slug, titulo, descricao, apenas_membros, data_pregacao AS data
       FROM pregacoes
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY data_pregacao DESC`
    ).all(),
    env.DB.prepare(
      `SELECT 'evento' AS tipo, id, slug, titulo, descricao, apenas_membros, inicio_em AS data
       FROM eventos
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY inicio_em DESC`
    ).all(),
    env.DB.prepare(
      `SELECT 'aviso' AS tipo, id, NULL AS slug, titulo, conteudo AS descricao, apenas_membros, criado_em AS data
       FROM avisos
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY criado_em DESC`
    ).all(),
    env.DB.prepare(
      `SELECT 'calendario' AS tipo, id, NULL AS slug, titulo, descricao, apenas_membros, inicio_em AS data
       FROM calendario
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY inicio_em DESC`
    ).all()
  ]);
  return json({
    data: [
      ...paginas.results,
      ...pregacoes.results,
      ...eventos.results,
      ...avisos.results,
      ...calendario.results
    ]
  });
}
__name(onRequestGet13, "onRequestGet");

// api/eventos/index.js
async function onRequestGet14({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, titulo, descricao, local, inicio_em, fim_em, imagem_capa_url, apenas_membros, publicado
     FROM eventos
     WHERE publicado = 1
     ORDER BY inicio_em DESC`
  ).all();
  return json({ data: results });
}
__name(onRequestGet14, "onRequestGet");
async function onRequestPost7({ request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await readJson(request);
  const error = requireFields(body, ["titulo", "inicio_em"]);
  if (error) return badRequest(error);
  const slug = body.slug ? slugify(body.slug) : `${slugify(body.titulo)}-${Date.now()}`;
  await env.DB.prepare(
    `INSERT INTO eventos (slug, titulo, descricao, local, inicio_em, fim_em, imagem_capa_url, apenas_membros, publicado, criado_por_usuario_id, atualizado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    slug,
    body.titulo,
    body.descricao || "",
    body.local || "",
    body.inicio_em,
    body.fim_em || null,
    body.imagem_capa_url || "",
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1,
    data.session?.sub || null,
    data.session?.sub || null
  ).run();
  return json({ ok: true, slug });
}
__name(onRequestPost7, "onRequestPost");

// api/ministerios/index.js
async function onRequestGet15({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id,
            slug,
            COALESCE(titulo_curto, nome) AS title,
            COALESCE(grupo, 'Cuidado') AS "group",
            COALESCE(descricao, '') AS "desc",
            COALESCE(icone, 'HeartHandshake') AS icon,
            COALESCE(imagem_capa_url, '') AS image,
            apenas_membros
     FROM ministerios
     WHERE publicado = 1
     ORDER BY title`
  ).all();
  return json({ data: results });
}
__name(onRequestGet15, "onRequestGet");
async function onRequestPost8({ request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await readJson(request);
  const error = requireFields(body, ["title"]);
  if (error) return badRequest(error);
  const slug = body.slug ? slugify(body.slug) : slugify(body.title);
  await env.DB.prepare(
    `INSERT INTO ministerios (slug, nome, titulo_curto, grupo, descricao, conteudo, icone, imagem_capa_url, apenas_membros, publicado, criado_por_usuario_id, atualizado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       nome = excluded.nome,
       titulo_curto = excluded.titulo_curto,
       grupo = excluded.grupo,
       descricao = excluded.descricao,
       conteudo = excluded.conteudo,
       icone = excluded.icone,
       imagem_capa_url = excluded.imagem_capa_url,
       apenas_membros = excluded.apenas_membros,
       publicado = excluded.publicado,
       atualizado_por_usuario_id = excluded.atualizado_por_usuario_id,
       atualizado_em = datetime('now')`
  ).bind(
    slug,
    body.title,
    body.title,
    body.group || "Cuidado",
    body.desc || "",
    body.conteudo || "",
    body.icon || "HeartHandshake",
    body.image || "",
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1,
    data.session?.sub || null,
    data.session?.sub || null
  ).run();
  return json({ ok: true, slug });
}
__name(onRequestPost8, "onRequestPost");

// api/oracao.js
async function onRequestPost9({ request, env }) {
  const body = await readJson(request);
  const error = requireFields(body, ["pedido"]);
  if (error) return badRequest(error);
  await env.DB.prepare(
    `INSERT INTO pedidos_oracao (nome, email, telefone, pedido, confidencial, status)
     VALUES (?, ?, ?, ?, ?, 'pendente')`
  ).bind(
    body.nome || "An\xF4nimo",
    body.email || null,
    body.telefone || null,
    body.pedido,
    body.confidencial === false ? 0 : 1
  ).run();
  return json({ ok: true });
}
__name(onRequestPost9, "onRequestPost");
async function onRequestGet16({ env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const { results } = await env.DB.prepare(
    `SELECT id, nome, email, telefone, pedido, confidencial, status, criado_em
     FROM pedidos_oracao
     ORDER BY criado_em DESC`
  ).all();
  return json({ data: results });
}
__name(onRequestGet16, "onRequestGet");

// api/paginas/index.js
async function onRequestGet17({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, titulo, resumo, conteudo, imagem_capa_url, apenas_membros, publicado, atualizado_em
     FROM paginas
     WHERE publicado = 1
     ORDER BY titulo`
  ).all();
  return json({ data: results });
}
__name(onRequestGet17, "onRequestGet");
async function onRequestPost10({ request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await readJson(request);
  const error = requireFields(body, ["titulo"]);
  if (error) return badRequest(error);
  const slug = body.slug ? slugify(body.slug) : slugify(body.titulo);
  await env.DB.prepare(
    `INSERT INTO paginas (slug, titulo, resumo, conteudo, imagem_capa_url, apenas_membros, publicado, criado_por_usuario_id, atualizado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       titulo = excluded.titulo,
       resumo = excluded.resumo,
       conteudo = excluded.conteudo,
       imagem_capa_url = excluded.imagem_capa_url,
       apenas_membros = excluded.apenas_membros,
       publicado = excluded.publicado,
       atualizado_por_usuario_id = excluded.atualizado_por_usuario_id,
       atualizado_em = datetime('now')`
  ).bind(
    slug,
    body.titulo,
    body.resumo || "",
    body.conteudo || "",
    body.imagem_capa_url || "",
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1,
    data.session?.sub || null,
    data.session?.sub || null
  ).run();
  return json({ ok: true, slug });
}
__name(onRequestPost10, "onRequestPost");

// api/pregacoes/index.js
async function onRequestGet18({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.slug, p.titulo, p.descricao, p.pregador, p.data_pregacao,
            p.imagem_capa_url, p.duracao_segundos, p.apenas_membros, p.publicado,
            a.url_publica AS audio_url, a.mime_type AS audio_mime_type
     FROM pregacoes p
     LEFT JOIN arquivos_r2 a ON a.id = p.audio_arquivo_id
     WHERE p.publicado = 1
     ORDER BY p.data_pregacao DESC, p.criado_em DESC`
  ).all();
  return json({ data: results });
}
__name(onRequestGet18, "onRequestGet");
async function onRequestPost11({ request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await readJson(request);
  const error = requireFields(body, ["titulo"]);
  if (error) return badRequest(error);
  const slug = body.slug ? slugify(body.slug) : slugify(body.titulo);
  await env.DB.prepare(
    `INSERT INTO pregacoes (slug, titulo, descricao, pregador, data_pregacao, audio_arquivo_id, imagem_capa_url, duracao_segundos, apenas_membros, publicado, criado_por_usuario_id, atualizado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       titulo = excluded.titulo,
       descricao = excluded.descricao,
       pregador = excluded.pregador,
       data_pregacao = excluded.data_pregacao,
       audio_arquivo_id = excluded.audio_arquivo_id,
       imagem_capa_url = excluded.imagem_capa_url,
       duracao_segundos = excluded.duracao_segundos,
       apenas_membros = excluded.apenas_membros,
       publicado = excluded.publicado,
       atualizado_por_usuario_id = excluded.atualizado_por_usuario_id,
       atualizado_em = datetime('now')`
  ).bind(
    slug,
    body.titulo,
    body.descricao || "",
    body.pregador || "",
    body.data_pregacao || null,
    body.audio_arquivo_id || null,
    body.imagem_capa_url || "",
    body.duracao_segundos || null,
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1,
    data.session?.sub || null,
    data.session?.sub || null
  ).run();
  return json({ ok: true, slug });
}
__name(onRequestPost11, "onRequestPost");

// api/projetos/index.js
async function onRequestGet19({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, titulo AS title, descricao AS "desc", COALESCE(icone, 'Activity') AS icon, apenas_membros
     FROM projetos
     WHERE publicado = 1
     ORDER BY titulo`
  ).all();
  return json({ data: results });
}
__name(onRequestGet19, "onRequestGet");
async function onRequestPost12({ request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  const body = await readJson(request);
  const error = requireFields(body, ["title"]);
  if (error) return badRequest(error);
  const slug = body.slug ? slugify(body.slug) : slugify(body.title);
  await env.DB.prepare(
    `INSERT INTO projetos (slug, titulo, descricao, icone, apenas_membros, publicado)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       titulo = excluded.titulo,
       descricao = excluded.descricao,
       icone = excluded.icone,
       apenas_membros = excluded.apenas_membros,
       publicado = excluded.publicado,
       atualizado_em = datetime('now')`
  ).bind(
    slug,
    body.title,
    body.desc || "",
    body.icon || "Activity",
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1
  ).run();
  return json({ ok: true, slug });
}
__name(onRequestPost12, "onRequestPost");

// api/upload.js
var ALLOWED_TYPES = /* @__PURE__ */ new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "image/jpeg",
  "image/png",
  "image/webp"
]);
async function onRequestPost13({ request, env, data }) {
  if (!["master", "admin", "editor"].includes(data.session?.role)) {
    return json({ error: "Acesso negado" }, { status: 403 });
  }
  if (!env.MEDIA_BUCKET) {
    return json({ error: "Bucket R2 MEDIA_BUCKET n\xE3o configurado" }, { status: 503 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ error: "Arquivo ausente" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ error: "Tipo de arquivo n\xE3o permitido" }, { status: 415 });
  }
  const folder = file.type.startsWith("audio/") ? "pregacoes" : "imagens";
  const safeName = slugify(file.name.replace(/\.[^.]+$/, "")) || "arquivo";
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const objectKey = `${folder}/${Date.now()}-${safeName}.${ext}`;
  await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  });
  const publicBase = (env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const urlPublica = publicBase ? `${publicBase}/${objectKey}` : `/api/media/${objectKey}`;
  const result = await env.DB.prepare(
    `INSERT INTO arquivos_r2 (bucket, object_key, url_publica, nome_original, mime_type, tamanho_bytes, criado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING id`
  ).bind(
    "cemuc-media",
    objectKey,
    urlPublica,
    file.name,
    file.type,
    file.size,
    data.session?.sub || null
  ).first();
  return json({
    ok: true,
    arquivo: {
      id: result.id,
      object_key: objectKey,
      url_publica: urlPublica,
      mime_type: file.type,
      tamanho_bytes: file.size
    }
  });
}
__name(onRequestPost13, "onRequestPost");

// _middleware.js
var PROTECTED_PREFIXES = [
  "/admin",
  "/api/admin",
  "/api/upload"
];
var MEMBER_CONTENT_PREFIXES = [
  "/api/paginas",
  "/api/conteudos",
  "/api/ministerios",
  "/api/projetos",
  "/api/pregacoes",
  "/api/eventos",
  "/api/avisos",
  "/api/calendario"
];
var ADMIN_ROLES = /* @__PURE__ */ new Set(["master", "admin", "editor"]);
var AUTHORIZED_ROLES = /* @__PURE__ */ new Set(["master", "admin", "editor", "member", "membro"]);
async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.pathname === "/api/admin/bootstrap-password") {
    return context.next();
  }
  const session = await getSession(context.request, context.env);
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  const isMemberContentRoute = MEMBER_CONTENT_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  context.data.session = session;
  if (isProtectedRoute && !session) {
    return unauthorized();
  }
  if (url.pathname.startsWith("/api/admin") && !hasAdminRole(session)) {
    return forbidden();
  }
  if (isMemberContentRoute && await requestNeedsMemberAccess(context.env, context.request, url) && !hasAuthorizedRole(session)) {
    return unauthorized();
  }
  return context.next();
}
__name(onRequest, "onRequest");
async function getSession(request, env) {
  const cookieName = env.JWT_COOKIE_NAME || "cemuc_session";
  const token = getCookie(request, cookieName);
  if (!token) {
    return null;
  }
  return verifyJwt(token, env.JWT_SECRET);
}
__name(getSession, "getSession");
async function requestNeedsMemberAccess(env, request, url) {
  if (url.searchParams.get("apenas_membros") === "1") {
    return true;
  }
  if (url.searchParams.get("restricted") === "1") {
    return true;
  }
  if (request.method !== "GET" && request.headers.get("x-cemuc-restricted") === "1") {
    return true;
  }
  if (request.method !== "GET") {
    return false;
  }
  return contentItemIsRestricted(env, url.pathname);
}
__name(requestNeedsMemberAccess, "requestNeedsMemberAccess");
async function contentItemIsRestricted(env, pathname) {
  const match2 = pathname.match(/^\/api\/(paginas|ministerios|projetos|pregacoes|eventos|avisos|calendario)\/([^/]+)$/);
  if (!match2) {
    return false;
  }
  const [, resource, rawIdentifier] = match2;
  const identifier = decodeURIComponent(rawIdentifier);
  const tableByResource = {
    paginas: "paginas",
    ministerios: "ministerios",
    projetos: "projetos",
    pregacoes: "pregacoes",
    eventos: "eventos",
    avisos: "avisos",
    calendario: "calendario"
  };
  const table = tableByResource[resource];
  const column = /^\d+$/.test(identifier) ? "id" : "slug";
  const row = await env.DB.prepare(
    `SELECT apenas_membros FROM ${table} WHERE ${column} = ? LIMIT 1`
  ).bind(identifier).first();
  return row?.apenas_membros === 1;
}
__name(contentItemIsRestricted, "contentItemIsRestricted");
function hasAuthorizedRole(session) {
  return Boolean(session?.email && AUTHORIZED_ROLES.has(session.role));
}
__name(hasAuthorizedRole, "hasAuthorizedRole");
function hasAdminRole(session) {
  return Boolean(session?.email && ADMIN_ROLES.has(session.role));
}
__name(hasAdminRole, "hasAdminRole");
function unauthorized() {
  return json({ error: "Sess\xE3o de membro necess\xE1ria" }, { status: 401 });
}
__name(unauthorized, "unauthorized");
function forbidden() {
  return json({ error: "Acesso administrativo n\xE3o autorizado" }, { status: 403 });
}
__name(forbidden, "forbidden");

// ../.wrangler/tmp/pages-ib8wj9/functionsRoutes-0.1911642852787987.mjs
var routes = [
  {
    routePath: "/api/auth/google/callback",
    mountPath: "/api/auth/google",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/admin/membros/:id",
    mountPath: "/api/admin/membros",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete]
  },
  {
    routePath: "/api/admin/membros/:id",
    mountPath: "/api/admin/membros",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut]
  },
  {
    routePath: "/api/admin/bootstrap-password",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/admin/change-password",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/admin/delegate-master",
    mountPath: "/api/admin",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/admin/delegate-master",
    mountPath: "/api/admin",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/admin/membros",
    mountPath: "/api/admin/membros",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/admin/membros",
    mountPath: "/api/admin/membros",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/auth/admin",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/auth/google",
    mountPath: "/api/auth/google",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost6]
  },
  {
    routePath: "/api/auth/me",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet5]
  },
  {
    routePath: "/api/pregacoes/rss",
    mountPath: "/api/pregacoes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet6]
  },
  {
    routePath: "/api/eventos/:slug",
    mountPath: "/api/eventos",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete2]
  },
  {
    routePath: "/api/eventos/:slug",
    mountPath: "/api/eventos",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet7]
  },
  {
    routePath: "/api/eventos/:slug",
    mountPath: "/api/eventos",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut2]
  },
  {
    routePath: "/api/ministerios/:slug",
    mountPath: "/api/ministerios",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete3]
  },
  {
    routePath: "/api/ministerios/:slug",
    mountPath: "/api/ministerios",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet8]
  },
  {
    routePath: "/api/ministerios/:slug",
    mountPath: "/api/ministerios",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut3]
  },
  {
    routePath: "/api/oracao/:id",
    mountPath: "/api/oracao",
    method: "PATCH",
    middlewares: [],
    modules: [onRequestPatch]
  },
  {
    routePath: "/api/paginas/:slug",
    mountPath: "/api/paginas",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete4]
  },
  {
    routePath: "/api/paginas/:slug",
    mountPath: "/api/paginas",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet9]
  },
  {
    routePath: "/api/paginas/:slug",
    mountPath: "/api/paginas",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut4]
  },
  {
    routePath: "/api/pregacoes/:slug",
    mountPath: "/api/pregacoes",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete5]
  },
  {
    routePath: "/api/pregacoes/:slug",
    mountPath: "/api/pregacoes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet10]
  },
  {
    routePath: "/api/projetos/:slug",
    mountPath: "/api/projetos",
    method: "DELETE",
    middlewares: [],
    modules: [onRequestDelete6]
  },
  {
    routePath: "/api/auth-google",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet11]
  },
  {
    routePath: "/api/configuracoes",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet12]
  },
  {
    routePath: "/api/configuracoes",
    mountPath: "/api",
    method: "PUT",
    middlewares: [],
    modules: [onRequestPut5]
  },
  {
    routePath: "/api/conteudos",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet13]
  },
  {
    routePath: "/api/eventos",
    mountPath: "/api/eventos",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet14]
  },
  {
    routePath: "/api/eventos",
    mountPath: "/api/eventos",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost7]
  },
  {
    routePath: "/api/login",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost5]
  },
  {
    routePath: "/api/ministerios",
    mountPath: "/api/ministerios",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet15]
  },
  {
    routePath: "/api/ministerios",
    mountPath: "/api/ministerios",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost8]
  },
  {
    routePath: "/api/oracao",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet16]
  },
  {
    routePath: "/api/oracao",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost9]
  },
  {
    routePath: "/api/paginas",
    mountPath: "/api/paginas",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet17]
  },
  {
    routePath: "/api/paginas",
    mountPath: "/api/paginas",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost10]
  },
  {
    routePath: "/api/pregacoes",
    mountPath: "/api/pregacoes",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet18]
  },
  {
    routePath: "/api/pregacoes",
    mountPath: "/api/pregacoes",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost11]
  },
  {
    routePath: "/api/projetos",
    mountPath: "/api/projetos",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet19]
  },
  {
    routePath: "/api/projetos",
    mountPath: "/api/projetos",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost12]
  },
  {
    routePath: "/api/upload",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost13]
  },
  {
    routePath: "/",
    mountPath: "/",
    method: "",
    middlewares: [onRequest],
    modules: []
  }
];

// ../../Users/LOU/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../Users/LOU/AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
