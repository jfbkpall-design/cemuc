-- SCRIPT DE ADIÇÃO DE CONTEÚDO DINÂMICO (MINISTÉRIOS E PROJETOS) - CORRIGIDO
-- Execute este script no SQL Editor do seu painel do Supabase.

-- 1. Tabela de Ministérios (ministries)
CREATE TABLE IF NOT EXISTS ministries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT UNIQUE NOT NULL,
    "group" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'HeartHandshake',
    image TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Projetos (projects)
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT UNIQUE NOT NULL,
    "desc" TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'Activity',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar RLS nas Tabelas
ALTER TABLE ministries ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas RLS para Ministérios
DROP POLICY IF EXISTS "Public Read Ministries" ON ministries;
CREATE POLICY "Public Read Ministries" ON ministries
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage ministries" ON ministries;
CREATE POLICY "Admins manage ministries" ON ministries
    FOR ALL USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 5. Criar Políticas RLS para Projetos
DROP POLICY IF EXISTS "Public Read Projects" ON projects;
CREATE POLICY "Public Read Projects" ON projects
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage projects" ON projects;
CREATE POLICY "Admins manage projects" ON projects
    FOR ALL USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 6. Inserção de Dados Iniciais de Ministérios (Seed)
INSERT INTO ministries (title, "group", "desc", icon, image)
VALUES
  (
    'Amor',
    'Cuidado',
    'Acolhimento, presença e cuidado prático com pessoas e famílias que chegam à CEMUC.',
    'HeartHandshake',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUBRBYnMoMfe__C70waNNGGse31ueTq9mrVc-GH00awN_z0VpOxgKJAsh-T9zHa55p3Oy-b1R1pf4tbLMTfa8gPvGMFWMBK4VioW0tzVYxoqDbfyS_K01mlY_yb2l3VW1qXoVJ8BxS9DoURYlVvbBdAd1XzCQfWhudXpX18ChxqKD4POuQUQRGAOLOfUDH35csHUkeAoU-zYcUNYZKHQFwuxaV7UJgWbZAG-GE0=w1280'
  ),
  (
    'Ação Social',
    'Serviço',
    'Doações, bazares solidários e apoio à comunidade de Magalhães Bastos em momentos de necessidade.',
    'HeartHandshake',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUDnb6ZX7UAyacpWNQHuMSYa1bT-RVsDJSAuD7DpevPoRUcZKO9nyc6RIPVg8S8WUlQFpBMOkrzemx_6asQmg1L7BAaQNpFBzbBWokltN6FvIesKE2kWf7zBHxuaJNHqcRa42U-hp4XA5k7inZaNKQUUAwNu5RsqcfAbfOA0hmQ6Gw-PyUbf2LS_pa8=w1280'
  ),
  (
    'Adolescentes',
    'Formação',
    'Encontros e Escola Bíblica Dominical para adolescentes crescerem em fé, amizade e identidade cristã.',
    'Users',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUBMlyG1Zt6YqWd_-S3QP60ZjPMBdttQFpevDQkvceDz0k6t14BZRS1wb-f9r6gXu64junrT6gtuvtW0Z_Fr90GI7avPcVrwWYNg7VHyq76V49eKa_MJ131nj2WHFEkXn9MHOpOMZVfzzyyrBpo9fnUtu31AqXEH6m5lXrvlqOpuC6tk_03xvRDD=w1280'
  ),
  (
    'Discipulado',
    'Formação',
    'Acompanhamento de novos convertidos, batismo nas águas e fundamentos da caminhada com Jesus.',
    'BookOpen',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUD1JQF7YNfzE0pkJkngSa5z_3Qw3VvnMZccwbJPmVk8i7bSxBe3oTVbIL5RxhgAehXQInf4zfll1QAtLz119a6pjL9k9Ha6hSMdV6snMIlJlCnAeT2pQYBwyCQRXqX6calxELMlqexNQz_VMI_BTue4K6sO7kiVWVnOcp0mALjO6T_Qz5TgDzq_N1o=w1280'
  ),
  (
    'Educação Religiosa',
    'Ensino',
    'Escola Bíblica, estudos teológicos e Clube do Livro para crescimento espiritual contínuo.',
    'BookOpen',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUAY51WPe36LkU0boHFO9UUg-mGVqNuUGEF-KFBc0-O5BOb4iQ2IOidG4mahD_hOqnNRKiiixxQB537_6mG3vWAmpsmHbiWP2cxpaeh7Z9kH8QcUMAIxgftAEkytmsf4EdCD4MjmDmBycMvARIl3TPru3EWsMF96c8jmhHWF790V2iW9ycEKIlHBgtc=w1280'
  ),
  (
    'Família',
    'Cuidado',
    'Encontros para casais, restauração familiar e apoio para lares firmados na Palavra.',
    'Users',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUDkVvLHahrrE-t8gj9LzRzPtHOOjRFx_smEHMPCrhrcaY7mWDmzSGhRxA474V8q1Ggl6-zjpHfIGm0T0W34vyO-e1tIff1GMHWe64Kgef8MZjb6Zfb5PCN5M5N3rIoOHOyMuUk4frT1WQs4hm5wnm_DqwTrjZ2S2fyG7ocwxpEkzjniCadpAqTYpKU=w1280'
  ),
  (
    'Homens',
    'Comunhão',
    'Reuniões masculinas voltadas para discipulado prático, serviço, liderança e comunhão.',
    'Shield',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUDGbBWTYWEmlME9_mAW0zUeGmH6wL_xB8dJGXsDkULAPkUmtIvH00r1GzPbcg81c_89a44dz1ZsFW70sLQz9bpkE8BBZxyG47RdtVXdddWvrr-3k9ar1UHF1MZpTf2XUYLX0ZxfXnApiAmdeuH4N8ziP7u2-8FcuXHmYyn-ZVaSoISlmdxxK4_waBE=w1280'
  ),
  (
    'Infantil',
    'Crianças',
    'EBD Infantil e Culto Infantil aos domingos, com linguagem simples, segura e cheia de alegria.',
    'Users',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUB3Stb6pPp_Iq5VMIJsf-eyJLXpaoSiwBBDzh__EOd-D0wX9WUr2vQ23lxts0J3C5Gi42y509AdmVjAnieJWy9V178fXMuryUEOjWKizVjhm5aMqfvZ8imjSOurEUNdPvsfaTKls1u1wbGt7Xtp0xlURvy0mnbJAEz8D87wuykrX8A4K_q6FbNSrRzLUTtVPrUCW7rfCTqZdma0nMtrU0FclCGgsY2ryc7xFoM=w1280'
  ),
  (
    'Jovens',
    'Comunhão',
    'Espaço para juventude viver fé, amizade, propósito e serviço no Reino de Deus.',
    'Users',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUDzlLNrbHPc-5HNyuncjLF5AFDRwLxMPm5nvUFzTsqMs-lEngD8-KibjAbm1t6k-sWvRFCW9KSHm1aNobn3BC0oSx-2YQrZGp-n_0VlW6kEIJFCW4kBvagKMJnkwMxIsuwTvpyNHxAOOvK3hKkaBPpWfkVp_zEnXBHipNavLHbbFM9KGVj_AO9gnhc=w1280'
  ),
  (
    'Louvor e Adoração',
    'Celebração',
    'Música, vocais e instrumental conduzindo a igreja em adoração durante os cultos.',
    'Music',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUALqHr1Oa-ZTDcCWuvqDp_7DnHp9rYP3z5hieTqJvjTVpZF6UrEU3klosdO5u0HbD4r3iDR5rPNefxp6TKZCcye95Yoktc9QOff2nlo62VHb9rlomtZmH6VArr9VokVjWf-W_FDMWrjJBMP2AOB0qvW95WWHLoHN2fFHNG2ICQcFh3sThISPTEOatFDecujcdrJ6WIk5hL2mYFKVu1NpojEayMnxDApjVzZxD8=w1280'
  ),
  (
    'Mulheres',
    'Comunhão',
    'Chás, conferências e grupos de oração voltados ao crescimento espiritual feminino.',
    'Users',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUCZCLNxXoNDuvIHkm5tF1NO25WrszQ1k8QzEwl9v54CDVHpkvQ7t4_glQ0pGePl8WK-9ikj4wOFB0OX2Rv-iB357zEyeTogxIB54L67yfIwYjiu-Fv-fATi11E6G23YbM6aKhk51dgedzYglrShVuvOqNYFnxWYMGmzuiMiZ91pS_FOfzf58hegbBsqBeA3uil7LAdS6RfcBAiXsgkXaM3Nl0YA1uoo7sHFpMg=w1280'
  ),
  (
    'Moto Clubes',
    'Evangelismo',
    'Brothers of the King e Jesus Core MC: comunhão, estrada e evangelismo com motociclistas.',
    'Shield',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUBxAidc6obv154gX41TWBIQYWWEC7Scg-XIVZkz_G0rNq9RDXjYu_VCkzzQoXODlIKieFEFDqhUvFNVbL6jgrqCdhSH2KxO9SbKjfA2Qr68QYvACYb4VZYocE8Js43aoxPblYOq_D-Et9TjpOZT8tkBcFxthbeDMUi5Tf-VS7Ut5wGqsOi1RbAp_zk=w1280'
  ),
  (
    'Pastoral',
    'Cuidado',
    'Aconselhamento, oração, direção espiritual e suporte às famílias da missão.',
    'HeartHandshake',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUAn0tp79BUU-BXSl3MvYw59vm8MxqeAjnJvYFlQSMHurEx9hc7XJcjkXpe2r7ShKTD6BK8LEho3COGhTMlfuOKrAX1iSKz5yZoBj3Y7XgXsXFMBl1Z296d9VI-A5_TFyK99ejBn2hjWYecin8uKAaCDWk6MBA3LJG58WVE0btMl0DushjJW1JV2=w1280'
  ),
  (
    'Recepção',
    'Serviço',
    'Portaria, boas-vindas e apoio à organização dos cultos e encontros da igreja.',
    'HeartHandshake',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUBBJyV7GnXKmzKAO8PwyKlV1ypi42IJpj81uzAPxV_9yLQsmNi4QTl3o8XUWPk9QmOf4NssHmiiESXUgbHMEk4Q6ZfubqnYFjFQqkbiQQ1DwB8FsRegoLr2yaEJ3dAXv6l6uWMXGTpa2Etf57il07JT8g-dOQigc-ec6wNULIvCepJm05SYxkCxDPA=w1280'
  ),
  (
    'Som e Mídias',
    'Comunicação',
    'Áudio, mídia, mensagens gravadas, transmissões, apoio técnico e comunicação visual.',
    'Music',
    'https://lh3.googleusercontent.com/sitesv/AA5AbUCfbXtM_-IPEqAP4DTKSJC-h5tw3aTLu6Xu25rh2UD0dlcH2Lz2Ug-QOTEwefzuK2rahZs9O9d9odwoX8AG_NziLaBjflRglcuFqzuhGEPLc4_o0R03CzlZcYOAqrYQWiWEJWPpAliNVyNv8zkHbweubZIWKod0UDt5ZkwaPOHgMk79Xka-_NN22ozFLjti59P_q7H5tDDOROR0hczGKoU-AVKZkC1Um7cLlNk=w1280'
  )
ON CONFLICT (title) DO NOTHING;

-- 7. Inserção de Dados Iniciais de Projetos (Seed)
INSERT INTO projects (title, "desc", icon)
VALUES
  (
    'Hospital Espiritual',
    'Um espaço de aconselhamento íntimo, direcionamento, cura emocional e oração individual conduzida por pastores.',
    'Activity'
  ),
  (
    'Escola de Restauração Familiar',
    'Cursos focados na reconstrução de lares, casamento blindado, educação cristã de filhos e superação de crises.',
    'Smile'
  ),
  (
    'Óleo Missionário',
    'Campanha de unção nos lares e oração de libertação de enfermidades promovida periodicamente pelas equipes missionárias.',
    'Heart'
  ),
  (
    'Rei dos Reis',
    'Projeto focado no ensino da realeza espiritual em Cristo, edificando a identidade dos novos convertidos.',
    'UserCheck'
  ),
  (
    'Condores MUC F.C.',
    'Nosso projeto esportivo de futebol para promover saúde, integração social e comunhão descontraída aos sábados.',
    'Gift'
  ),
  (
    'Serviços e Negócios',
    'Fomento à rede de empreendedores e profissionais autônomos locais, promovendo indicação de serviços e negócios mútuos.',
    'BookOpen'
  )
ON CONFLICT (title) DO NOTHING;
