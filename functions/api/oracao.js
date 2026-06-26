import { badRequest, readJson, requireFields } from '../_shared/api.js';
import { json } from '../_shared/http.js';

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const error = requireFields(body, ['pedido']);
  if (error) return badRequest(error);

  await env.DB.prepare(
    `INSERT INTO pedidos_oracao (nome, email, telefone, pedido, confidencial, status)
     VALUES (?, ?, ?, ?, ?, 'pendente')`
  ).bind(
    body.nome || 'Anônimo',
    body.email || null,
    body.telefone || null,
    body.pedido,
    body.confidencial === false ? 0 : 1
  ).run();

  return json({ ok: true });
}

export async function onRequestGet({ env, data }) {
  if (!['master', 'admin', 'editor'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { results } = await env.DB.prepare(
    `SELECT id, nome, email, telefone, pedido, confidencial, status, criado_em
     FROM pedidos_oracao
     ORDER BY criado_em DESC`
  ).all();

  return json({ data: results });
}
