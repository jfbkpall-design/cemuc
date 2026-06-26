import { getCookie, json } from '../_shared/http.js';
import { verifyJwt } from '../_shared/jwt.js';

const AUTHORIZED = new Set(['master', 'admin', 'editor', 'member', 'membro']);

export async function onRequestGet({ request, env }) {
  const token = getCookie(request, env.JWT_COOKIE_NAME || 'cemuc_session');
  const session = await verifyJwt(token, env.JWT_SECRET);
  const canSeeRestricted = Boolean(session?.role && AUTHORIZED.has(session.role));
  const whereVisibility = canSeeRestricted ? '' : 'AND apenas_membros = 0';

  const [paginas, pregacoes, eventos, avisos, calendario] = await Promise.all([
    env.DB.prepare(
      `SELECT 'pagina' AS tipo, id, slug, titulo, resumo AS descricao, apenas_membros, atualizado_em AS data
       FROM paginas
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY atualizado_em DESC`
    ).all(),
    env.DB.prepare(
      `SELECT 'pregacao' AS tipo, id, slug, titulo, descricao, apenas_membros, data_pregacao AS data
       FROM pregacoes
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY data_pregacao DESC`
    ).all(),
    env.DB.prepare(
      `SELECT 'evento' AS tipo, id, slug, titulo, descricao, apenas_membros, inicio_em AS data
       FROM eventos
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY inicio_em DESC`
    ).all(),
    env.DB.prepare(
      `SELECT 'aviso' AS tipo, id, NULL AS slug, titulo, conteudo AS descricao, apenas_membros, criado_em AS data
       FROM avisos
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY criado_em DESC`
    ).all(),
    env.DB.prepare(
      `SELECT 'calendario' AS tipo, id, NULL AS slug, titulo, descricao, apenas_membros, inicio_em AS data
       FROM calendario
       WHERE publicado = 1 ${whereVisibility}
       ORDER BY inicio_em DESC`
    ).all()
  ]);

  return json({
    data: [
      ...paginas.results,
      ...pregacoes.results,
      ...eventos.results,
      ...avisos.results,
      ...calendario.results
    ]
  });
}
