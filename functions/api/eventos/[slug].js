import { json } from '../../_shared/http.js';
import { readJson } from '../../_shared/api.js';

// GET /api/eventos/:slug — detalhes do evento
export async function onRequestGet({ params, env }) {
  const { slug } = params;
  const row = await env.DB.prepare(
    `SELECT id, slug, titulo, descricao, local, inicio_em, fim_em, imagem_capa_url, apenas_membros, publicado
     FROM eventos WHERE slug = ? LIMIT 1`
  ).bind(slug).first();

  if (!row) return json({ error: 'Evento não encontrado' }, { status: 404 });
  return json({ data: row });
}

// PUT /api/eventos/:slug — editar evento
export async function onRequestPut({ params, request, env, data }) {
  if (!['master', 'admin', 'editor'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
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
    body.apenas_membros != null ? (body.apenas_membros ? 1 : 0) : null,
    body.publicado != null ? (body.publicado ? 1 : 0) : null,
    data.session?.sub ?? null,
    slug
  ).run();

  if (result.changes === 0) {
    return json({ error: 'Evento não encontrado' }, { status: 404 });
  }

  return json({ ok: true });
}

// DELETE /api/eventos/:slug — excluir evento
export async function onRequestDelete({ params, env, data }) {
  if (!['master', 'admin'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  const result = await env.DB.prepare(
    `DELETE FROM eventos WHERE slug = ?`
  ).bind(params.slug).run();

  if (result.changes === 0) {
    return json({ error: 'Evento não encontrado' }, { status: 404 });
  }

  return json({ ok: true });
}
