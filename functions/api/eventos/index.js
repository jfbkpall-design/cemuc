import { badRequest, readJson, requireFields, slugify } from '../../_shared/api.js';
import { json } from '../../_shared/http.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, titulo, descricao, local, inicio_em, fim_em, imagem_capa_url, apenas_membros, publicado
     FROM eventos
     WHERE publicado = 1
     ORDER BY inicio_em DESC`
  ).all();

  return json({ data: results });
}

export async function onRequestPost({ request, env, data }) {
  if (!['master', 'admin', 'editor'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await readJson(request);
  const error = requireFields(body, ['titulo', 'inicio_em']);
  if (error) return badRequest(error);

  const slug = body.slug ? slugify(body.slug) : `${slugify(body.titulo)}-${Date.now()}`;

  await env.DB.prepare(
    `INSERT INTO eventos (slug, titulo, descricao, local, inicio_em, fim_em, imagem_capa_url, apenas_membros, publicado, criado_por_usuario_id, atualizado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    slug,
    body.titulo,
    body.descricao || '',
    body.local || '',
    body.inicio_em,
    body.fim_em || null,
    body.imagem_capa_url || '',
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1,
    data.session?.sub || null,
    data.session?.sub || null
  ).run();

  return json({ ok: true, slug });
}
