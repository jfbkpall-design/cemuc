import { badRequest, readJson, requireFields, slugify } from '../../_shared/api.js';
import { json } from '../../_shared/http.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.slug, p.titulo, p.descricao, p.pregador, p.data_pregacao,
            p.imagem_capa_url, p.duracao_segundos, p.apenas_membros, p.publicado,
            a.url_publica AS audio_url, a.mime_type AS audio_mime_type
     FROM pregacoes p
     LEFT JOIN arquivos_r2 a ON a.id = p.audio_arquivo_id
     WHERE p.publicado = 1
     ORDER BY p.data_pregacao DESC, p.criado_em DESC`
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
    `INSERT INTO pregacoes (slug, titulo, descricao, pregador, data_pregacao, audio_arquivo_id, imagem_capa_url, duracao_segundos, apenas_membros, publicado, criado_por_usuario_id, atualizado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(slug) DO UPDATE SET
       titulo = excluded.titulo,
       descricao = excluded.descricao,
       pregador = excluded.pregador,
       data_pregacao = excluded.data_pregacao,
       audio_arquivo_id = excluded.audio_arquivo_id,
       imagem_capa_url = excluded.imagem_capa_url,
       duracao_segundos = excluded.duracao_segundos,
       apenas_membros = excluded.apenas_membros,
       publicado = excluded.publicado,
       atualizado_por_usuario_id = excluded.atualizado_por_usuario_id,
       atualizado_em = datetime('now')`
  ).bind(
    slug,
    body.titulo,
    body.descricao || '',
    body.pregador || '',
    body.data_pregacao || null,
    body.audio_arquivo_id || null,
    body.imagem_capa_url || '',
    body.duracao_segundos || null,
    body.apenas_membros ? 1 : 0,
    body.publicado === false ? 0 : 1,
    data.session?.sub || null,
    data.session?.sub || null
  ).run();

  return json({ ok: true, slug });
}
