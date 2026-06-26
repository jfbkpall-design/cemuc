import { json } from '../../_shared/http.js';

// PUT  /api/ministerios/:slug  — editar ministério
// DELETE /api/ministerios/:slug — excluir ministério
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
    body.apenas_membros != null ? (body.apenas_membros ? 1 : 0) : null,
    body.publicado != null ? (body.publicado ? 1 : 0) : null,
    data.session?.sub ?? null,
    slug
  ).run();

  if (result.changes === 0) {
    return json({ error: 'Ministério não encontrado' }, { status: 404 });
  }

  return json({ ok: true });
}

export async function onRequestDelete({ params, env, data }) {
  if (!['master', 'admin'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  const { slug } = params;

  const result = await env.DB.prepare(
    `DELETE FROM ministerios WHERE slug = ?`
  ).bind(slug).run();

  if (result.changes === 0) {
    return json({ error: 'Ministério não encontrado' }, { status: 404 });
  }

  return json({ ok: true });
}

export async function onRequestGet({ params, env }) {
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
    return json({ error: 'Não encontrado' }, { status: 404 });
  }

  return json({ data: row });
}
