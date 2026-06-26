import { badRequest, readJson, requireFields, slugify } from '../../_shared/api.js';
import { json } from '../../_shared/http.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT id,
            slug,
            COALESCE(titulo_curto, nome) AS title,
            COALESCE(grupo, 'Cuidado') AS "group",
            COALESCE(descricao, '') AS "desc",
            COALESCE(icone, 'HeartHandshake') AS icon,
            COALESCE(imagem_capa_url, '') AS image,
            apenas_membros
     FROM ministerios
     WHERE publicado = 1
     ORDER BY title`
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
    `INSERT INTO ministerios (slug, nome, titulo_curto, grupo, descricao, conteudo, icone, imagem_capa_url, apenas_membros, publicado, criado_por_usuario_id, atualizado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       nome = excluded.nome,
       titulo_curto = excluded.titulo_curto,
       grupo = excluded.grupo,
       descricao = excluded.descricao,
       conteudo = excluded.conteudo,
       icone = excluded.icone,
       imagem_capa_url = excluded.imagem_capa_url,
       apenas_membros = excluded.apenas_membros,
       publicado = excluded.publicado,
       atualizado_por_usuario_id = excluded.atualizado_por_usuario_id,
       atualizado_em = datetime('now')`
  ).bind(
    slug,
    body.title,
    body.title,
    body.group || 'Cuidado',
    body.desc || '',
    body.conteudo || '',
    body.icon || 'HeartHandshake',
    body.image || '',
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1,
    data.session?.sub || null,
    data.session?.sub || null
  ).run();

  return json({ ok: true, slug });
}
