// Script para extrair os dados atuais do Supabase e gerar o seed.sql para o Cloudflare D1.
// Uso: node scripts/fetch-supabase-data.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

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
  } catch {}
  return env;
}

const env = loadEnv();
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Erro: Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.');
  process.exit(1);
}

const supabase = createClient(url, key);

const tables = [
  'profiles',
  'system_pages',
  'page_permissions',
  'admin_invitations',
  'events',
  'prayer_requests',
  'ministries',
  'projects',
  'ministry_materials',
  'audit_logs'
];

async function run() {
  console.log('Iniciando extração de dados do Supabase...');
  let sql = '-- SEED DE MIGRAÇÃO DO SUPABASE PARA CLOUDFLARE D1\n';
  sql += '-- Gerado automaticamente em ' + new Date().toISOString() + '\n\n';

  for (const table of tables) {
    console.log(`Buscando dados da tabela: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.warn(`Aviso: Não foi possível ler a tabela ${table}:`, error.message);
      continue;
    }

    if (!data || data.length === 0) {
      console.log(`Tabela ${table} está vazia.`);
      continue;
    }

    console.log(`Encontrados ${data.length} registros na tabela ${table}.`);
    sql += `-- Dados para a tabela ${table}\n`;

    for (const row of data) {
      const columns = Object.keys(row);
      const values = columns.map(col => {
        const val = row[col];
        if (val === null) return 'NULL';
        if (typeof val === 'object') {
          // Para JSON/JSONB e Arrays, serializamos como string JSON para o SQLite
          return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        }
        if (typeof val === 'string') {
          return `'${val.replace(/'/g, "''")}'`;
        }
        if (typeof val === 'boolean') {
          return val ? '1' : '0';
        }
        return val;
      });

      sql += `INSERT INTO ${table} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
    }
    sql += '\n';
  }

  // Adiciona o administrador master padrão solicitado pelo usuário: DeusEterno / Mavi@142536
  // Vamos usar um hash PBKDF2 ou SHA-256 pré-calculado para Mavi@142536.
  // Para fins de simplificação e compatibilidade direta no SQLite e no login.js,
  // vamos armazenar a senha com um hash SHA-256 simples em formato hexadecimal.
  // O SHA-256 de "Mavi@142536" é: e1c3d18388439df68641ebbc324e934a365b2d7168d601b08e5f1b1c7c9ad074 (vamos verificar ou calcular no código)
  // Para fins do seed.sql, podemos inserir o registro do perfil master.
  sql += `-- Administrador Master padrão (DeusEterno)\n`;
  // O id do DeusEterno pode ser um UUID fixo ou o próprio nome. Vamos usar um UUID fixo.
  const masterId = '00000000-0000-0000-0000-000000000000';
  // O hash SHA-256 de "Mavi@142536" (calculado via JS standard no backend):
  // Usaremos um hash gerado por crypto.subtle no Worker. Para o D1, vamos inserir o hash correspondente.
  // Calculando o hash de "Mavi@142536" com SHA-256:
  // "Mavi@142536" -> f97116900f074d081f9b3b85c13e54b693e5a59336bbd121c25227d825c31ff7 (vamos calcular abaixo no script e colocar o valor exato no SQL)
  
  // Vamos calcular o hash do master admin agora no Node.js usando a biblioteca crypto nativa para colocar o valor exato no seed.sql!
  const crypto = await import('node:crypto');
  const password = 'Mavi@142536';
  const hash = crypto.createHash('sha256').update(password).digest('hex');

  sql += `INSERT INTO profiles ("id", "full_name", "email", "role", "password_hash", "created_at", "updated_at") \n`;
  sql += `VALUES ('${masterId}', 'DeusEterno', 'deuseterno@cemuc.com', 'super_admin', '${hash}', datetime('now'), datetime('now')) \n`;
  sql += `ON CONFLICT ("email") DO UPDATE SET "role" = 'super_admin', "password_hash" = '${hash}';\n\n`;

  writeFileSync(new URL('../seed.sql', import.meta.url), sql, 'utf8');
  console.log('Arquivo seed.sql gerado com sucesso em c:/Site-MUC/seed.sql');
}

run().catch(console.error);
