import { json } from '../_shared/http.js';

// GET /api/configuracoes — público (retorna configurações da igreja)
// PUT /api/configuracoes — admin apenas
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT chave, valor FROM configuracoes`
  ).all();

  const config = Object.fromEntries(results.map((r) => [r.chave, r.valor]));
  return json({ data: config });
}

export async function onRequestPut({ request, env, data }) {
  if (!['master', 'admin'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, { status: 400 });
  }

  const allowedKeys = [
    'email_contato',
    'whatsapp',
    'endereco',
    'google_maps_url',
    'email_destino',
    'rss_spotify_url'
  ];

  const entries = Object.entries(body).filter(([k]) => allowedKeys.includes(k));
  if (entries.length === 0) {
    return json({ error: 'Nenhuma chave válida fornecida' }, { status: 400 });
  }

  await Promise.all(
    entries.map(([chave, valor]) =>
      env.DB.prepare(
        `INSERT INTO configuracoes (chave, valor, atualizado_em)
         VALUES (?, ?, datetime('now'))
         ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, atualizado_em = datetime('now')`
      ).bind(chave, String(valor)).run()
    )
  );

  return json({ ok: true });
}
