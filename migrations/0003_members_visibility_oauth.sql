ALTER TABLE membros_igreja ADD COLUMN nome_completo TEXT;
ALTER TABLE membros_igreja ADD COLUMN email_google TEXT;

UPDATE membros_igreja
SET
  nome_completo = COALESCE(nome_completo, nome),
  email_google = COALESCE(email_google, email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membros_igreja_email_google
ON membros_igreja(email_google);

CREATE TABLE IF NOT EXISTS avisos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  conteudo TEXT,
  apenas_membros INTEGER NOT NULL DEFAULT 0 CHECK (apenas_membros IN (0, 1)),
  publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1)),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS calendario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  inicio_em TEXT NOT NULL,
  fim_em TEXT,
  apenas_membros INTEGER NOT NULL DEFAULT 0 CHECK (apenas_membros IN (0, 1)),
  publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1)),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_avisos_apenas_membros ON avisos(apenas_membros);
CREATE INDEX IF NOT EXISTS idx_calendario_apenas_membros ON calendario(apenas_membros);
