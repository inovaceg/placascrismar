import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const output = resolve('.vercel/output');
const config = JSON.parse(await readFile(join(output, 'config.json'), 'utf8'));
assert.equal(config.version, 3, 'A Vercel exige Build Output API v3.');
assert(config.routes.some(route => route.handle === 'filesystem'), 'Falta entrega de assets estáticos.');
assert(config.routes.some(route => route.src === '/(.*)' && route.dest === '/__server'), 'Falta encaminhamento das rotas para SSR.');

const functionDir = join(output, 'functions/__server.func');
const functionConfig = JSON.parse(await readFile(join(functionDir, '.vc-config.json'), 'utf8'));
assert.equal(functionConfig.runtime, 'nodejs22.x', 'O servidor precisa usar Node.js 22, não Workers ou Edge.');
assert.equal(functionConfig.supportsResponseStreaming, true, 'SSR deve preservar streaming.');
const entryPath = join(functionDir, functionConfig.handler);
await access(entryPath);

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

const staticFiles = await filesIn(join(output, 'static'));
assert(staticFiles.some(path => path.endsWith('.js')), 'Bundle JavaScript do navegador não encontrado.');
assert(staticFiles.some(path => path.endsWith('.css')), 'CSS de produção não encontrado.');
assert(!staticFiles.some(path => path.endsWith('.html')), 'Este build deve servir as páginas pelo SSR, não por HTML estático.');
for (const path of await filesIn(output)) {
  assert(!/wrangler\.(json|jsonc|toml)$/.test(path), 'Artefato Cloudflare encontrado na saída Vercel.');
}
for (const path of staticFiles.filter(path => /\.(js|map|json|html)$/.test(path))) {
  const contents = await readFile(path, 'utf8');
  assert(!/sb_secret_|SUPABASE_SERVICE_ROLE_KEY|VERCEL_OIDC_TOKEN|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(contents), `Referência privada encontrada no bundle público: ${path}`);
}

// Exercise Nitro's generated Vercel Fetch entry in Node, not Vite or a SPA fallback.
const { default: handler } = await import(pathToFileURL(entryPath).href);
assert.equal(typeof handler?.fetch, 'function', 'A função Vercel não exportou a entrada Fetch esperada.');
const pending = [];
const context = { waitUntil: promise => pending.push(promise) };
for (const [path, text] of [
  ['/', 'Crismar Placas de Ofertas'],
  ['/busca-preco', 'Busca preço'],
  ['/inventario', 'Inventário de preços'],
  ['/pdv', 'PDV'],
]) {
  const response = await handler.fetch(new Request(`https://vercel-smoke.example${path}?vercel-smoke=1`), context);
  const html = await response.text();
  assert.equal(response.status, 200, `SSR de ${path} retornou ${response.status}.`);
  assert.match(response.headers.get('content-type') ?? '', /text\/html/);
  assert(html.includes(text), `Conteúdo esperado ausente em ${path}.`);
  assert.match(html, /<(main|h1)\b/, `Falta conteúdo renderizado no servidor em ${path}.`);
  console.log(`[verify-vercel] SSR ${path}: HTTP 200 e conteúdo HTML verificados.`);
}
const notFound = await handler.fetch(new Request('https://vercel-smoke.example/__deploy-route-not-found__'), context);
await notFound.text();
assert.equal(notFound.status, 404, 'Rotas inexistentes devem continuar retornando 404.');
await Promise.all(pending);
console.log('[verify-vercel] Build Output API v3, runtime Node.js 22, entrada Fetch, streaming configurado, assets, quatro rotas SSR e 404 verificados.');
console.log('[verify-vercel] Ainda é necessário validar hidratação, Supabase e fluxos do usuário em um deployment Preview real.');
