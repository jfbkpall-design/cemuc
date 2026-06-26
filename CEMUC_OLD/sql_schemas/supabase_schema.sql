-- SCRIPT DE INICIALIZAÇÃO DO BANCO DE DADOS (SUPABASE POSTGRES)
-- Execute este script no SQL Editor do seu painel do Supabase.

-- Habilita extensão de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfis de Usuários (profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'visitor' CHECK (role IN ('super_admin', 'admin', 'editor', 'collaborator', 'member', 'visitor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Páginas/Seções Gerenciáveis (system_pages)
CREATE TABLE IF NOT EXISTS system_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Permissões Específicas (page_permissions)
CREATE TABLE IF NOT EXISTS page_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    page_slug TEXT NOT NULL REFERENCES system_pages(slug) ON DELETE CASCADE,
    can_edit BOOLEAN NOT NULL DEFAULT TRUE,
    can_publish BOOLEAN NOT NULL DEFAULT FALSE,
    granted_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, page_slug)
);

-- 4. Convites Administrativos (admin_invitations)
CREATE TABLE IF NOT EXISTS admin_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    target_role TEXT NOT NULL CHECK (target_role IN ('admin', 'editor', 'collaborator')),
    allowed_pages TEXT[] NOT NULL DEFAULT '{}',
    token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted BOOLEAN DEFAULT FALSE NOT NULL,
    granted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Eventos (events)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    location TEXT NOT NULL,
    banner_url TEXT,
    category TEXT CHECK (category IN ('culto', 'conferencia', 'acao_social', 'outro')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Pedidos de Oração (prayer_requests)
CREATE TABLE IF NOT EXISTS prayer_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    request TEXT NOT NULL,
    is_confidential BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'prayed', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Logs de Auditoria (audit_logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    user_email TEXT,
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Ativar Row Level Security (RLS) nas Tabelas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 9. Criação de Políticas RLS no Supabase

-- Perfis: Qualquer um visualiza perfis básicos; o dono edita o próprio perfil
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Páginas do Sistema: Públicas para leitura, escrita apenas para editores/admins
CREATE POLICY "Public Read Pages" ON system_pages
    FOR SELECT USING (true);

CREATE POLICY "Admin/Editor Write Pages" ON system_pages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin')
        ) OR
        EXISTS (
            SELECT 1 FROM page_permissions
            WHERE page_permissions.user_id = auth.uid() 
              AND page_permissions.page_slug = system_pages.slug
              AND page_permissions.can_edit = true
        )
    );

-- Convites: apenas super administradores e administradores gerenciam convites
CREATE POLICY "Admins manage invitations" ON admin_invitations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin')
        )
    );

-- Eventos: Qualquer um visualiza eventos; escrita por admins/colaboradores
CREATE POLICY "Events viewable by everyone" ON events
    FOR SELECT USING (true);

CREATE POLICY "Admins/Editors write events" ON events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'editor', 'collaborator')
        )
    );

-- Pedidos de Oração: Inserção pública para qualquer um; leitura apenas para administradores/pastores
CREATE POLICY "Anyone can insert prayer requests" ON prayer_requests
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Only admins/pastors view prayers" ON prayer_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'editor')
        )
    );

-- Logs de Auditoria: Apenas Super Admins visualizam; inserção pelo sistema autenticado
CREATE POLICY "Only super admins read audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
        )
    );

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
