import { readJson } from '../../../_shared/api.js';
import { json } from '../../../_shared/http.js';

export async function onRequestPut({ params, request, env }) {
  const body = await readJson(request);
  const email = String(body.email_google || '').trim().toLowerCase();
  const permissions = body.permissions ? JSON.stringify(body.permissions) : null;

  // Atualizar membro
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
    body.nome_completo || '',
    email,
    body.nome_completo || '',
    email,
    body.telefone || null,
    body.status_ativo === false ? 0 : 1,
    permissions,
    params.id
  ).run();

  // Se o role foi informado, upsert na tabela de usuários também
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


export async function onRequestDelete({ params, env }) {
  await env.DB.prepare(
    `UPDATE membros_igreja
     SET status_ativo = 0, atualizado_em = datetime('now')
     WHERE id = ?`
  ).bind(params.id).run();

  return json({ ok: true });
}
