import { json } from '../../_shared/http.js';
import { notFound } from '../../_shared/api.js';

export async function onRequestGet({ params, env }) {
  const page = await env.DB.prepare(
    `SELECT id, slug, titulo, resumo, conteudo, imagem_capa_url, apenas_membros, publicado, atualizado_em
     FROM paginas
     WHERE slug = ? AND publicado = 1
     LIMIT 1`
  ).bind(params.slug).first();

  if (!page) return notFound('Página não encontrada');
  return json({ data: page });
}

export async function onRequestPut({ params, request, env, data }) {
  if (!['master', 'admin', 'editor'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'JSON inválido' }, { status: 400 });
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
    body.apenas_membros != null ? (body.apenas_membros ? 1 : 0) : null,
    body.publicado != null ? (body.publicado ? 1 : 0) : null,
    data.session?.sub ?? null,
    params.slug
  ).run();

  if (result.changes === 0) {
    return json({ error: 'Página não encontrada' }, { status: 404 });
  }

  return json({ ok: true });
}

export async function onRequestDelete({ params, env, data }) {
  if (!['master', 'admin'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  await env.DB.prepare('DELETE FROM paginas WHERE slug = ?').bind(params.slug).run();
  return json({ ok: true });
}

