# Publicação de teste na Vercel

## Estado da adaptação

O build foi executado em ambiente isolado com as dependências do lockfile. O preset `vercel` gerou Build Output API v3, função SSR e assets. O script integrado ao build importou a função final e confirmou HTML e HTTP 200 em `/`, `/busca-preco`, `/inventario` e `/pdv`, além de HTTP 404 em uma rota inexistente.

Isso não equivale a uma publicação real validada. Ainda faltam um deployment Preview na Vercel, execução no Node.js 22 da plataforma, hidratação no navegador e testes da comunicação com Supabase. O ambiente local de verificação executou Node.js 24.18.0; o artefato foi configurado explicitamente para `nodejs22.x` e o projeto exige Node.js 22.

## Configuração compatível com as versões atuais

- Vite: 8.1.5.
- TanStack Start: 1.168.60.
- Nitro: 3.0.260603-beta.
- Preset: `vercel`, não `vercel-static`, `cloudflare-module` ou `vercel-edge`.
- Runtime de produção: Node.js 22.
- Entrada do adaptador: `web`, exportando `fetch(Request, context)` no runtime Node.js. Não é uma migração para Edge.

O wrapper `@lovable.dev/vite-tanstack-config` 2.25.3 continua sendo usado no desenvolvimento. No build, os plugins nativos são usados uma única vez, pois o wrapper pode sobrescrever o destino com Cloudflare dentro de um sandbox. Foram preservados `src/server.ts`, `src/start.ts`, os middlewares de erro e CSRF, a árvore de rotas e os componentes.

A primeira verificação tentou a entrada `node` do Nitro e encontrou `Cannot redefine property: remoteAddress` em requisições com conexão reutilizada. A entrada Fetch nativa evita esse adaptador e passou na segunda verificação.

## Configurações no painel da Vercel

| Campo | Configuração |
| --- | --- |
| Framework Preset | Other; `framework: null` no `vercel.json` |
| Root Directory | Pasta do repositório que contém `package.json` e `vite.config.ts`; não o caminho absoluto do Windows |
| Node.js Version | 22.x |
| Build Command | `npm run build` |
| Install Command | `pnpm install --frozen-lockfile` |
| Output Directory | Sem override; Nitro fornece `.vercel/output` automaticamente pela Build Output API |
| Ambiente inicial | Preview, sem promover para Production |

Os comandos acima são valores dos campos de configuração do painel, não etapas manuais de terminal. A instalação usa `pnpm-lock.yaml`, que já existe no projeto, para evitar resolver outras versões a partir do `bun.lock`. Nenhuma dependência foi atualizada.

Não selecionar o preset Vite estático, não publicar apenas `dist` ou `.output/public`, não adicionar rewrite para `index.html` e não configurar o diretório `static` como saída do site inteiro. Isso descartaria a função SSR.

A saída esperada contém:

- `.vercel/output/config.json`: rotas e Build Output API v3.
- `.vercel/output/functions/__server.func/.vc-config.json`: runtime, handler e streaming.
- `.vercel/output/functions/__server.func/index.mjs`: servidor SSR.
- `.vercel/output/static`: JavaScript, CSS e arquivos públicos.

Arquivos antigos em `.output` ou `.wrangler` não são a saída desta publicação e não precisam ser enviados. `.vercel` e arquivos de ambiente continuam ignorados pelo Git. O build de verificação usa um snapshot isolado e não substitui automaticamente os artefatos antigos da pasta de trabalho.

## Variáveis de ambiente — somente nomes

### Aplicação publicada na Vercel

Não há variáveis de aplicação obrigatórias no código atual. Os módulos `src/lib/catalog-store.ts` e `src/lib/pos-store.ts` já contêm a URL pública e a chave publicável do Supabase. Esta adaptação não alterou essa integração nem introduziu novas variáveis.

Não foram encontradas referências de aplicação a `import.meta.env` ou `process.env`. Portanto, neste estado, nenhuma variável de Supabase precisa ser fornecida durante o build do navegador. Se futuramente a configuração pública for extraída para variáveis `VITE_*`, elas precisarão estar definidas no ambiente Preview/Production antes do build e exigirão novo deployment após alterações. Nunca colocar segredos privados em `VITE_*`.

### Funções já existentes no Supabase

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Esses nomes são usados nas Edge Functions existentes. Eles pertencem ao ambiente do Supabase, não ao bundle do navegador nem ao painel da Vercel para este app. Não é necessário copiar a chave privada para a Vercel. As funções não foram modificadas, e não houve alterações em tabelas, funções SQL ou RLS.

### Metadados da plataforma

- `VERCEL_OIDC_TOKEN`: encontrado apenas como nome na configuração local, sem uso no código da aplicação. Não copiar o arquivo local nem cadastrar manualmente esse token como variável pública.

Não é necessário configurar `NITRO_PRESET`, `SERVER_PRESET` ou `LOVABLE_NITRO_PRESET` na Vercel: o destino já está definido no código.

## Rotas e autenticação

A árvore atual contém somente `/`, `/busca-preco`, `/inventario` e `/pdv`. Não foram encontradas rotas `/admin`, `/login`, callbacks de autenticação ou um fluxo Supabase Auth nesta cópia. A adaptação não adiciona nem remove autenticação e não torna essas páginas privadas.

Não considerar o PDV protegido por login apenas porque foi publicado na Vercel. Para o teste, habilitar Deployment Protection no Preview, conforme os recursos disponíveis na conta. Isso protege o acesso à publicação de teste, mas não substitui autorização na API do Supabase.

Se houver fluxos Auth em outra versão do projeto, suas rotas e redirects devem ser revisados nessa versão; não declarar esse fluxo validado por este build.

## Checklist da publicação Preview

1. Criar um deployment Preview de uma branch diferente da branch de produção, ou uma publicação explicitamente direcionada a Preview. Não promover, não alterar o domínio de produção e não substituir uma publicação existente.
2. Conferir nos logs da Vercel o preset `vercel`, o runtime `nodejs22.x` e as quatro mensagens de sucesso do script `verify-vercel`.
3. Abrir cada rota diretamente pela URL e recarregar a página: `/`, `/busca-preco`, `/inventario` e `/pdv`. Confirmar HTTP 200 e conteúdo renderizado antes do JavaScript; uma URL inexistente deve retornar 404.
4. Confirmar que JS, CSS e arquivos públicos não retornam 404, e que não há erros de hidratação, de importação do servidor ou falhas de função nos logs.
5. Verificar o editor, impressão e exportação, além da consulta de produtos, no navegador. Os testes do build não executam efeitos do React nem chamadas de banco iniciadas pelo navegador.
6. Validar a conectividade com o Supabase separadamente. Já havia falhas de rede na integração antes desta adaptação; trocar de hospedagem não garante que o projeto Supabase esteja acessível.
7. Não testar importação que substitui o catálogo, vendas ou fechamento do caixa sem autorização: o Preview continua apontando para o mesmo Supabase e essas ações podem modificar dados reais. Este trabalho não cria banco de teste nem altera RLS.
8. Só promover para Production após a validação completa no Preview.

## Verificação de tipos

A configuração Vite alterada passou na checagem de tipos. A checagem global continua identificando quatro diagnósticos preexistentes em `src/components/offer-sign.tsx`, `src/components/point-of-sale.tsx` (dois) e `src/lib/excel-catalog.ts`. Eles não foram ocultados nem corrigidos nesta adaptação de hospedagem. O build e a verificação do servidor passaram apesar desses diagnósticos, pois Vite não executa a checagem completa de tipos.

## Arquivos alterados nesta adaptação

- `vite.config.ts`
- `package.json`
- `vercel.json` (novo)
- `scripts/verify-vercel.mjs` (novo)
- `docs/vercel-preview.md` (novo)
