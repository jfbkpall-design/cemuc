ALTER TABLE ministerios ADD COLUMN titulo_curto TEXT;
ALTER TABLE ministerios ADD COLUMN grupo TEXT;
ALTER TABLE ministerios ADD COLUMN icone TEXT;

CREATE TABLE IF NOT EXISTS projetos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  icone TEXT,
  apenas_membros INTEGER NOT NULL DEFAULT 0 CHECK (apenas_membros IN (0, 1)),
  publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1)),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_projetos_apenas_membros ON projetos(apenas_membros);
