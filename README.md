# Sync ERP — Web (Gerenciamento de Embarque)

Versão web, só de leitura por enquanto, do módulo de Gerenciamento de
Embarque do [Sync ERP](https://github.com/rcarneiiro1-wq/SYNC) (o
sistema desktop). Roda no navegador, hospedada no Vercel, e busca os
dados do **mesmo Supabase** que o desktop usa — não duplica banco
nenhum, é só outra porta de entrada pro mesmo dado.

**Cliente:** MF Máquinas
**Developed by Rafael Carneiro**

## O que essa versão faz

- Mostra os embarques ativos agora: quem está embarcado, em qual obra,
  há quantos dias, previsão de desembarque, e o % de avanço do RDO
  mais recente (mesma lógica e mesmas cores do painel do desktop).
- Protegida por senha simples (pensada pra um teste interno, não pra
  dado super sensível — ver seção "Segurança" abaixo).
- **Só leitura.** Não edita nem cria nada ainda — é o primeiro passo
  pra validar a ideia antes de decidir se vale a pena ir além.

## Como rodar local

1. Instala as dependências:
   ```
   npm install
   ```
2. Copia `.env.local.example` pra `.env.local` e preenche:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`: os
     mesmos valores que estão em `core/supabase_config.py` no projeto
     desktop.
   - `SITE_PASSWORD`: a senha que você quiser pra entrar no site.
3. Roda:
   ```
   npm run dev
   ```
4. Abre `http://localhost:3000`.

## Como publicar no Vercel

1. Sobe esse projeto pra um repositório novo no GitHub (separado do
   Sync ERP desktop — são tecnologias diferentes, misturar só
   complicaria).
2. No [vercel.com](https://vercel.com), cria um **projeto novo**
   apontando pra esse repositório (não precisa reaproveitar o
   `syncteste` antigo).
3. Em **Settings → Environment Variables**, adiciona as 3 variáveis do
   `.env.local.example` (mesmos valores usados local).
4. Deploy. Todo push na branch principal vira um deploy novo
   automaticamente.

## Segurança

A senha de acesso é uma trava simples (compara com `SITE_PASSWORD` e
grava um cookie) — suficiente pra um teste interno, mas **não** é um
sistema de login de verdade (não tem usuário por pessoa, não tem
controle de quem acessou). Se esse projeto crescer e passar a mostrar
dado mais sensível, vale trocar por autenticação de verdade (ex:
Supabase Auth) antes de divulgar mais.

A chave do Supabase usada aqui é a "publishable" (pública) - a mesma
lógica do projeto desktop: ela só permite o que as políticas de
segurança (RLS) do banco liberarem, então não dá acesso de escrita
fora do que já é público hoje.

## Estrutura

```
sync-web/
  src/
    app/
      page.tsx          -> painel de embarques (página principal)
      login/             -> tela de login
        page.tsx
        actions.ts        -> confere a senha, cria o cookie
      actions.ts          -> ação de "Sair"
      layout.tsx           -> layout raiz, metadata
      globals.css           -> cores da marca Sync ERP (Tailwind)
    lib/
      supabase.ts           -> cliente Supabase compartilhado
      auth.ts                -> lógica da senha/cookie de sessão
      embarques.ts            -> busca e monta os dados do painel
    proxy.ts                   -> middleware: exige login em toda página
```

## Próximos passos (ideias, ainda não construído)

- Editar/fechar embarque pela web (hoje só visualiza).
- Autenticação de verdade, por pessoa, se mais gente for usar.
- Expandir pra outros módulos além de Gerenciamento de Embarque.
