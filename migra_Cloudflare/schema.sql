PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('master', 'admin', 'editor')),
  status_ativo INTEGER NOT NULL DEFAULT 1 CHECK (status_ativo IN (0, 1)),
  ultimo_login_em TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS membros_igreja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  nome TEXT,
  telefone TEXT,
  observacoes TEXT,
  status_ativo INTEGER NOT NULL DEFAULT 1 CHECK (status_ativo IN (0, 1)),
  criado_por_usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS paginas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  resumo TEXT,
  conteudo TEXT,
  imagem_capa_url TEXT,
  apenas_membros INTEGER NOT NULL DEFAULT 0 CHECK (apenas_membros IN (0, 1)),
  publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1)),
  criado_por_usuario_id INTEGER,
  atualizado_por_usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (atualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ministerios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  conteudo TEXT,
  imagem_capa_url TEXT,
  lider_nome TEXT,
  lider_email TEXT COLLATE NOCASE,
  apenas_membros INTEGER NOT NULL DEFAULT 0 CHECK (apenas_membros IN (0, 1)),
  publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1)),
  criado_por_usuario_id INTEGER,
  atualizado_por_usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (atualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS permissoes_ministerios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  ministerio_id INTEGER NOT NULL,
  pode_editar INTEGER NOT NULL DEFAULT 1 CHECK (pode_editar IN (0, 1)),
  pode_publicar INTEGER NOT NULL DEFAULT 0 CHECK (pode_publicar IN (0, 1)),
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (usuario_id, ministerio_id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (ministerio_id) REFERENCES ministerios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS arquivos_r2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bucket TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  url_publica TEXT NOT NULL,
  nome_original TEXT,
  mime_type TEXT,
  tamanho_bytes INTEGER,
  criado_por_usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pregacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  pregador TEXT,
  data_pregacao TEXT,
  audio_arquivo_id INTEGER,
  imagem_capa_url TEXT,
  duracao_segundos INTEGER,
  apenas_membros INTEGER NOT NULL DEFAULT 0 CHECK (apenas_membros IN (0, 1)),
  publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1)),
  criado_por_usuario_id INTEGER,
  atualizado_por_usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (audio_arquivo_id) REFERENCES arquivos_r2(id) ON DELETE SET NULL,
  FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (atualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  local TEXT,
  inicio_em TEXT NOT NULL,
  fim_em TEXT,
  imagem_capa_url TEXT,
  apenas_membros INTEGER NOT NULL DEFAULT 0 CHECK (apenas_membros IN (0, 1)),
  publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0, 1)),
  criado_por_usuario_id INTEGER,
  atualizado_por_usuario_id INTEGER,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  atualizado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (criado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  FOREIGN KEY (atualizado_por_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER,
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes_json TEXT,
  ip TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_membros_igreja_email_status ON membros_igreja(email, status_ativo);
CREATE INDEX IF NOT EXISTS idx_paginas_slug_publicado ON paginas(slug, publicado);
CREATE INDEX IF NOT EXISTS idx_paginas_apenas_membros ON paginas(apenas_membros);
CREATE INDEX IF NOT EXISTS idx_ministerios_slug_publicado ON ministerios(slug, publicado);
CREATE INDEX IF NOT EXISTS idx_ministerios_apenas_membros ON ministerios(apenas_membros);
CREATE INDEX IF NOT EXISTS idx_pregacoes_slug_publicado ON pregacoes(slug, publicado);
CREATE INDEX IF NOT EXISTS idx_pregacoes_data ON pregacoes(data_pregacao);
CREATE INDEX IF NOT EXISTS idx_pregacoes_apenas_membros ON pregacoes(apenas_membros);
CREATE INDEX IF NOT EXISTS idx_eventos_inicio ON eventos(inicio_em);
CREATE INDEX IF NOT EXISTS idx_eventos_apenas_membros ON eventos(apenas_membros);
CREATE INDEX IF NOT EXISTS idx_audit_logs_usuario ON audit_logs(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_criado_em ON audit_logs(criado_em);

INSERT INTO usuarios (email, nome, role, status_ativo)
VALUES ('joselourdes2005@gmail.com', 'Administrador Master', 'master', 1)
ON CONFLICT(email) DO UPDATE SET
  role = 'master',
  status_ativo = 1,
  atualizado_em = datetime('now');

INSERT INTO membros_igreja (email, nome, status_ativo)
VALUES ('joselourdes2005@gmail.com', 'Administrador Master', 1)
ON CONFLICT(email) DO UPDATE SET
  status_ativo = 1,
  atualizado_em = datetime('now');

INSERT INTO paginas (slug, titulo, resumo, conteudo, apenas_membros, publicado)
VALUES
  ('home', 'Início', 'Página inicial da CEMUC.', '', 0, 1),
  ('sobre', 'Sobre Nós', 'Conheça a Comunidade Evangélica Missão União em Cristo.', '', 0, 1),
  ('ministerios', 'Ministérios', 'Áreas de cuidado, ensino, comunhão, adoração e serviço.', '', 0, 1),
  ('projetos', 'Projetos', 'Projetos e ações da CEMUC.', '', 0, 1),
  ('eventos', 'Eventos', 'Agenda e programação da CEMUC.', '', 0, 1),
  ('oracao', 'Pedidos de Oração', 'Envie seu pedido de oração.', '', 0, 1),
  ('contato', 'Contato', 'Fale com a secretaria pastoral.', '', 0, 1)
ON CONFLICT(slug) DO NOTHING;
