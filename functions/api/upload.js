import { json } from '../_shared/http.js';
import { slugify } from '../_shared/api.js';

const ALLOWED_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

export async function onRequestPost({ request, env, data }) {
  if (!['master', 'admin', 'editor'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  if (!env.MEDIA_BUCKET) {
    return json({ error: 'Bucket R2 MEDIA_BUCKET não configurado' }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) {
    return json({ error: 'Arquivo ausente' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ error: 'Tipo de arquivo não permitido' }, { status: 415 });
  }

  const folder = file.type.startsWith('audio/') ? 'pregacoes' : 'imagens';
  const safeName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'arquivo';
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  const objectKey = `${folder}/${Date.now()}-${safeName}.${ext}`;

  await env.MEDIA_BUCKET.put(objectKey, file.stream(), {
    httpMetadata: {
      contentType: file.type
    }
  });

  const publicBase = (env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const urlPublica = publicBase ? `${publicBase}/${objectKey}` : `/api/media/${objectKey}`;

  const result = await env.DB.prepare(
    `INSERT INTO arquivos_r2 (bucket, object_key, url_publica, nome_original, mime_type, tamanho_bytes, criado_por_usuario_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     RETURNING id`
  ).bind(
    'cemuc-media',
    objectKey,
    urlPublica,
    file.name,
    file.type,
    file.size,
    data.session?.sub || null
  ).first();

  return json({
    ok: true,
    arquivo: {
      id: result.id,
      object_key: objectKey,
      url_publica: urlPublica,
      mime_type: file.type,
      tamanho_bytes: file.size
    }
  });
}
