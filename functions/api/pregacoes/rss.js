import { json } from '../../_shared/http.js';

/**
 * GET /api/pregacoes/rss
 * Faz proxy do RSS feed do Spotify/Anchor e retorna episódios formatados.
 * Respeita autenticação: se o conteúdo for apenas_membros e o usuário não
 * for membro, retorna 401.
 */
export async function onRequestGet({ env, data }) {
  // Buscar URL do RSS nas configurações
  const config = await env.DB.prepare(
    `SELECT valor FROM configuracoes WHERE chave = 'rss_spotify_url' LIMIT 1`
  ).first();

  const rssUrl = config?.valor?.trim();

  if (!rssUrl) {
    return json({ error: 'URL do RSS não configurada. Configure em Configurações no painel admin.' }, { status: 503 });
  }

  // Verificar se conteúdo RSS é restrito a membros
  const restrictConfig = await env.DB.prepare(
    `SELECT valor FROM configuracoes WHERE chave = 'pregacoes_apenas_membros' LIMIT 1`
  ).first();

  const apenasMembrosCfg = restrictConfig?.valor === '1';
  const AUTHORIZED = new Set(['master', 'admin', 'editor', 'member', 'membro']);
  const isAuthorized = Boolean(data.session?.role && AUTHORIZED.has(data.session.role));

  if (apenasMembrosCfg && !isAuthorized) {
    return json({ error: 'Conteúdo restrito a membros' }, { status: 401 });
  }

  // Buscar RSS
  let rssText;
  try {
    const resp = await fetch(rssUrl, {
      headers: { 'User-Agent': 'CEMUC-Site/1.0' },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    rssText = await resp.text();
  } catch (err) {
    return json({ error: `Falha ao buscar RSS: ${err.message}` }, { status: 502 });
  }

  // Parse simples do RSS XML
  const episodes = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(rssText)) !== null) {
    const item = match[1];
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return m ? (m[1] ?? m[2] ?? '').trim() : '';
    };
    const getAttr = (tag, attr) => {
      const m = item.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"[^/]*/>`));
      return m ? m[1] : '';
    };

    const pubDate = get('pubDate');
    const dateObj = pubDate ? new Date(pubDate) : null;

    episodes.push({
      guid:        get('guid'),
      titulo:      get('title'),
      descricao:   get('description').replace(/<[^>]*>/g, '').slice(0, 500),
      audio_url:   getAttr('enclosure', 'url'),
      duracao:     getAttr('itunes:duration', 'duration') || get('itunes:duration'),
      imagem_url:  getAttr('itunes:image', 'href') || '',
      data:        dateObj ? dateObj.toISOString() : pubDate,
      apenas_membros: apenasMembrosCfg ? 1 : 0
    });
  }

  // Ordenar por data decrescente (mais recente primeiro)
  episodes.sort((a, b) => {
    if (!a.data && !b.data) return 0;
    if (!a.data) return 1;
    if (!b.data) return -1;
    return new Date(b.data) - new Date(a.data);
  });

  return json({ data: episodes, source: rssUrl });
}
