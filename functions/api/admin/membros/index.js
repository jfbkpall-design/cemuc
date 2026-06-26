import { badRequest, readJson, requireFields } from '../../../_shared/api.js';
import { json } from '../../../_shared/http.js';

export async function onRequestGet({ env }) {
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

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const error = requireFields(body, ['nome_completo', 'email_google']);
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
