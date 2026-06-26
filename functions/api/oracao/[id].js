import { readJson } from '../../_shared/api.js';
import { json } from '../../_shared/http.js';

export async function onRequestPatch({ params, request, env, data }) {
  if (!['master', 'admin', 'editor'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  const body = await readJson(request);
  const status = body.status === 'arquivado' ? 'arquivado' : 'orado';

  await env.DB.prepare(
    `UPDATE pedidos_oracao
     SET status = ?, atualizado_em = datetime('now')
     WHERE id = ?`
  ).bind(status, params.id).run();

  return json({ ok: true });
}
