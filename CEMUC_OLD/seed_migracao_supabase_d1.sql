-- SEED DE MIGRAÇÃO DO SUPABASE PARA CLOUDFLARE D1
-- Gerado automaticamente em 2026-06-26T11:59:22.425Z

-- Administrador Master padrão (DeusEterno)
INSERT INTO profiles ("id", "full_name", "email", "role", "password_hash", "created_at", "updated_at") 
VALUES ('00000000-0000-0000-0000-000000000000', 'DeusEterno', 'deuseterno@cemuc.com', 'super_admin', '5ea987f13122de69ca92a863073981400ebd51aa0287d8ead86b81fd3e888b60', datetime('now'), datetime('now')) 
ON CONFLICT ("email") DO UPDATE SET "role" = 'super_admin', "password_hash" = '5ea987f13122de69ca92a863073981400ebd51aa0287d8ead86b81fd3e888b60';

