import { badRequest, readJson, requireFields, slugify } from '../../_shared/api.js';
import { json } from '../../_shared/http.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, titulo AS title, descricao AS "desc", COALESCE(icone, 'Activity') AS icon, apenas_membros
     FROM projetos
     WHERE publicado = 1
     ORDER BY titulo`
  ).all();

  return json({ data: results });
}

export async function onRequestPost({ request, env, data }) {
  if (!['master', 'admin', 'editor'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await readJson(request);
  const error = requireFields(body, ['title']);
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
    body.desc || '',
    body.icon || 'Activity',
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1
  ).run();

  return json({ ok: true, slug });
}
