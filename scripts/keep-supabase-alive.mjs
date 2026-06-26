// Mantém o projeto Supabase (free-tier) "acordado" para evitar a hibernação
// que ocorre após ~7 dias sem atividade e causa lentidão na primeira requisição.
//
// Faz uma consulta leve à API REST. Rode periodicamente (a cada ~3 dias) via
// GitHub Actions, cron do Linux/macOS ou Agendador de Tarefas do Windows.
//
// Uso:
//   node scripts/keep-supabase-alive.mjs
//
// As credenciais são lidas das variáveis de ambiente ou, se ausentes, do arquivo .env.

import { readFileSync } from 'node:fs';

function loadEnv() {
  const env = { ...process.env };
  try {
    const file = readFileSync(new URL('../.env', import.meta.url), 'utf8');
    for (const line of file.split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match && !env[match[1]]) {
        env[match[1]] = match[2].trim();
      }
    }
  } catch {
    // .env é opcional quando as variáveis já vêm do ambiente (ex: GitHub Secrets).
  }
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (no .env ou no ambiente).');
  process.exit(1);
}

// system_pages é uma tabela usada pelo site (hook useManagedPage), então é uma boa "pingada".
const endpoint = `${url}/rest/v1/system_pages?select=slug&limit=1`;

try {
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    console.error(`Ping falhou: HTTP ${response.status} ${response.statusText}`);
    process.exit(1);
  }

  console.log(`Supabase acordado com sucesso (HTTP ${response.status}).`);
} catch (err) {
  console.error('Erro ao pingar o Supabase:', err.message);
  process.exit(1);
}
