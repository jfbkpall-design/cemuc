import { notFound } from '../../_shared/api.js';
import { json } from '../../_shared/http.js';

export async function onRequestGet({ params, env }) {
  const row = await env.DB.prepare(
    `SELECT p.id, p.slug, p.titulo, p.descricao, p.pregador, p.data_pregacao,
            p.imagem_capa_url, p.duracao_segundos, p.apenas_membros, p.publicado,
            a.url_publica AS audio_url, a.mime_type AS audio_mime_type
     FROM pregacoes p
     LEFT JOIN arquivos_r2 a ON a.id = p.audio_arquivo_id
     WHERE p.slug = ? AND p.publicado = 1
     LIMIT 1`
  ).bind(params.slug).first();

  if (!row) return notFound('Pregação não encontrada');
  return json({ data: row });
}

export async function onRequestDelete({ params, env, data }) {
  if (!['master', 'admin'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  await env.DB.prepare('DELETE FROM pregacoes WHERE slug = ?').bind(params.slug).run();
  return json({ ok: true });
}
