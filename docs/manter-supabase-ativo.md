# Manter o Supabase ativo (anti-hibernação)

Projetos **Supabase free-tier hibernam após ~7 dias sem atividade**. Quando isso
acontece, a primeira requisição precisa "acordar" o banco e pode levar de 5 a 30s —
é a causa mais provável da lentidão intermitente do site ("demora em alguns momentos").

O ideal é manter o projeto acordado com um *ping* periódico. Escolha **uma** das opções abaixo.

## Opção 1 — GitHub Actions (recomendado se o código está no GitHub)

Já existe o workflow [`.github/workflows/keep-supabase-alive.yml`](../.github/workflows/keep-supabase-alive.yml),
que roda o script a cada 3 dias.

1. Suba o projeto para um repositório no GitHub.
2. Em **Settings → Secrets and variables → Actions**, crie dois secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Pronto. Para testar agora, vá em **Actions → Manter Supabase Ativo → Run workflow**.

## Opção 2 — Sem código, via cron-job.org (mais simples)

1. Crie uma conta grátis em https://cron-job.org.
2. Novo cronjob apontando para:
   `https://qqlsgwzmlzvjqmaifedu.supabase.co/rest/v1/system_pages?select=slug&limit=1`
3. Em **Headers**, adicione:
   - `apikey`: a sua chave anon (`VITE_SUPABASE_ANON_KEY`)
   - `Authorization`: `Bearer <sua-chave-anon>`
4. Agende para rodar a cada 2-3 dias.

## Opção 3 — Localmente (Agendador de Tarefas do Windows)

O script lê as credenciais do `.env` automaticamente:

```powershell
node scripts/keep-supabase-alive.mjs
```

Crie uma tarefa no **Agendador de Tarefas** que execute esse comando a cada 3 dias
(o computador precisa estar ligado no horário).

---

> Observação: o app também já trata esse cenário no front-end — as páginas mostram
> conteúdo em cache/padrão imediatamente e as requisições têm timeout de 10s para
> não travar num spinner enquanto o banco acorda.
