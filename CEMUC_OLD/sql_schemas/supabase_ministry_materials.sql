-- SCRIPT PARA ADIÇÃO DE CONTEÚDOS E MATERIAIS DOS MINISTÉRIOS
-- Execute este script no SQL Editor do seu painel do Supabase.

-- 1. Adicionar campo de conteúdo longo à tabela de ministérios, caso não exista
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS "long_content" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ministries ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- 2. Habilitar a extensão unaccent para permitir a remoção de acentos no SQL
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 3. Atualizar o campo slug gerando a partir do título para os registros existentes
UPDATE ministries 
SET slug = lower(regexp_replace(regexp_replace(unaccent(title), '[^\w\s]', '', 'g'), '\s+', '-', 'g'))
WHERE slug IS NULL;

-- 4. Adicionar constraint UNIQUE ao slug
ALTER TABLE ministries ADD CONSTRAINT ministries_slug_key UNIQUE (slug);


-- 4. Criar Tabela de Materiais dos Ministérios (ministry_materials)
CREATE TABLE IF NOT EXISTS ministry_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ministry_id UUID NOT NULL REFERENCES ministries(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    resource_url TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('pdf', 'video', 'link', 'document')),
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Ativar RLS para materiais
ALTER TABLE ministry_materials ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS para materiais
DROP POLICY IF EXISTS "Public Read Ministry Materials" ON ministry_materials;
CREATE POLICY "Public Read Ministry Materials" ON ministry_materials
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage ministry materials" ON ministry_materials;
CREATE POLICY "Admins manage ministry materials" ON ministry_materials
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'editor', 'collaborator')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() AND profiles.role IN ('super_admin', 'admin', 'editor', 'collaborator')
        )
    );

-- 7. Função para atualizar updated_at nos materiais
CREATE OR REPLACE FUNCTION set_updated_at_ministry_materials()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_ministry_materials_updated_at ON ministry_materials;
CREATE TRIGGER update_ministry_materials_updated_at
    BEFORE UPDATE ON ministry_materials
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at_ministry_materials();
