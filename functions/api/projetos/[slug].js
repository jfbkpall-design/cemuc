import { json } from '../../_shared/http.js';

export async function onRequestDelete({ params, env, data }) {
  if (!['master', 'admin'].includes(data.session?.role)) {
    return json({ error: 'Acesso negado' }, { status: 403 });
  }

  await env.DB.prepare('DELETE FROM projetos WHERE slug = ?').bind(params.slug).run();
  return json({ ok: true });
}
