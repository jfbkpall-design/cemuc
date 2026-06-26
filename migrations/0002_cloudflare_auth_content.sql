ALTER TABLE usuarios ADD COLUMN senha_hash TEXT;
ALTER TABLE usuarios ADD COLUMN senha_atualizada_em TEXT;

CREATE TABLE IF NOT EXISTS pedidos_oracao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  pedido TEXT NOT NULL,
  confidencial INTEGER NOT NULL DEFAULT 1 CHECK (confidencial IN (0, 1)),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'orado', 'arquivado')),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pedidos_oracao_status ON pedidos_oracao(status);
CREATE INDEX IF NOT EXISTS idx_pedidos_oracao_criado_em ON pedidos_oracao(criado_em);
