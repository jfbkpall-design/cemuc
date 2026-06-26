import { badRequest, readJson, requireFields, slugify } from '../../_shared/api.js';
import { json } from '../../_shared/http.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, titulo, resumo, conteudo, imagem_capa_url, apenas_membros, publicado, atualizado_em
     FROM paginas
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
  const error = requireFields(body, ['titulo']);
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
    body.resumo || '',
    body.conteudo || '',
    body.imagem_capa_url || '',
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1,
    data.session?.sub || null,
    data.session?.sub || null
  ).run();

  return json({ ok: true, slug });
}
