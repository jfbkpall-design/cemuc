-- UPGRADE DO PAINEL ADMINISTRATIVO CEMUC
-- Execute no SQL Editor do Supabase depois do schema inicial.

CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = check_user_id
      AND role IN ('super_admin', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = check_user_id
      AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_page(page_slug_to_check text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.page_permissions
      WHERE user_id = auth.uid()
        AND page_slug = page_slug_to_check
        AND can_edit = true
    );
$$;

CREATE OR REPLACE FUNCTION public.can_publish_page(page_slug_to_check text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.page_permissions
      WHERE user_id = auth.uid()
        AND page_slug = page_slug_to_check
        AND can_publish = true
    );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public Read Pages" ON system_pages;
DROP POLICY IF EXISTS "Admin/Editor Write Pages" ON system_pages;
DROP POLICY IF EXISTS "Editors insert authorized pages" ON system_pages;
DROP POLICY IF EXISTS "Editors update authorized pages" ON system_pages;
DROP POLICY IF EXISTS "Admins delete managed pages" ON system_pages;

CREATE POLICY "Public Read Pages" ON system_pages
  FOR SELECT USING (true);

CREATE POLICY "Editors insert authorized pages" ON system_pages
  FOR INSERT WITH CHECK (public.can_edit_page(slug));

CREATE POLICY "Editors update authorized pages" ON system_pages
  FOR UPDATE USING (public.can_edit_page(slug))
  WITH CHECK (public.can_edit_page(slug));

CREATE POLICY "Admins delete managed pages" ON system_pages
  FOR DELETE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage page permissions" ON page_permissions;
DROP POLICY IF EXISTS "Users view their own page permissions" ON page_permissions;

CREATE POLICY "Admins manage page permissions" ON page_permissions
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users view their own page permissions" ON page_permissions
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Invitees view their pending invitations" ON admin_invitations;
DROP POLICY IF EXISTS "Invitees accept their pending invitations" ON admin_invitations;

CREATE POLICY "Admins manage invitations" ON admin_invitations
  FOR ALL USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Invitees view their pending invitations" ON admin_invitations
  FOR SELECT USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "Invitees accept their pending invitations" ON admin_invitations
  FOR UPDATE USING (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Only super admins read audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Admins read audit logs" ON audit_logs;

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins read audit logs" ON audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

INSERT INTO system_pages (slug, title, content)
VALUES
  ('home', 'Início', '{"headline":"Uma comunidade acolhedora para pessoas imperfeitas.","summary":"Conecte-se com Deus e com pessoas apaixonadas por Jesus Cristo.","status":"published"}'::jsonb),
  ('sobre', 'Sobre Nós', '{"headline":"Quem Somos Nós","summary":"A CEMUC é uma igreja que valoriza acolhimento, ensino bíblico e comunidade.","status":"published"}'::jsonb),
  ('ministerios', 'Ministérios', '{"headline":"Áreas de Atuação","summary":"Descubra onde servir e conectar-se na CEMUC.","status":"published"}'::jsonb),
  ('projetos', 'Projetos', '{"headline":"Nossos Projetos","summary":"Ações de apoio social, cura de famílias, evangelismo e integração comunitária.","status":"published"}'::jsonb),
  ('eventos', 'Eventos', '{"headline":"Agenda & Eventos","summary":"Confira o que está acontecendo na CEMUC.","status":"published"}'::jsonb),
  ('oracao', 'Pedidos de Oração', '{"headline":"Pedidos de Oração","summary":"Compartilhe sua petição ou agradecimento com nossa equipe de intercessão.","status":"published"}'::jsonb),
  ('contato', 'Contato', '{"headline":"Fale Conosco","summary":"Estamos aqui para ouvir, orientar e receber sua visita.","status":"published"}'::jsonb)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    content = system_pages.content || EXCLUDED.content,
    updated_at = timezone('utc'::text, now());

UPDATE profiles
SET role = 'super_admin',
    updated_at = timezone('utc'::text, now())
WHERE lower(email) = lower('joselourdes2005@gmail.com');
