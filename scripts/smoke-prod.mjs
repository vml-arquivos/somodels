#!/usr/bin/env node
// Teste rápido pós-deploy. Uso: node scripts/smoke-prod.mjs [https://eromodels.com.br]
// Não grava nada: só faz GET nos endereços públicos e confere o essencial.
const base = (process.argv[2] || "https://eromodels.com.br").replace(/\/$/, "");
const host = new URL(base).host.replace(/^(conta|admin)\./, "");
const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "OK   " : "FALHA"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const get = async (url, init) => {
  try {
    const res = await fetch(url, { redirect: "manual", ...init });
    return { res, text: await res.text().catch(() => "") };
  } catch (error) {
    return { res: null, text: "", error: String(error?.message || error) };
  }
};

for (const h of [host, `conta.${host}`, `admin.${host}`]) {
  const { res, text, error } = await get(`https://${h}/healthz`);
  let body = {};
  try { body = JSON.parse(text); } catch {}
  check(`healthz ${h}`, res?.status === 200 && body.ok === true && body.database === true, error || `status ${res?.status} release ${body.release ?? "?"}`);
}

const home = await get(`${base}/`);
check("home responde 200", home.res?.status === 200);

const robots = await get(`${base}/robots.txt`);
check("robots.txt libera a indexação", robots.res?.status === 200 && !/^Disallow:\s*\/\s*$/m.test(robots.text));

const sitemap = await get(`${base}/sitemap.xml`);
check("sitemap.xml é um índice", sitemap.res?.status === 200 && sitemap.text.includes("<sitemapindex"));

const profiles = await get(`${base}/sitemap-profiles.xml`);
const count = (profiles.text.match(/<loc>/g) || []).length;
check("sitemap de perfis responde", profiles.res?.status === 200, `${count} anúncio(s)`);

for (const path of ["/termos", "/privacidade", "/seguranca", "/denuncia", "/ajuda", "/contato", "/como-anunciar", "/planos", "/cadastro", "/login"]) {
  const r = await get(`${base}${path}`);
  check(`página ${path}`, r.res?.status === 200);
}

const conta = await get(`https://conta.${host}/`);
check("conta.* redireciona para /conta", [301, 302, 307, 308].includes(conta.res?.status) && String(conta.res?.headers.get("location") || "").includes("/conta"));
const admin = await get(`https://admin.${host}/`);
check("admin.* redireciona para /admin", [301, 302, 307, 308].includes(admin.res?.status) && String(admin.res?.headers.get("location") || "").includes("/admin"));

const cfg = await get(`${base}/api/trpc/system.config`);
let data = {};
try { data = JSON.parse(cfg.text)?.result?.data?.json ?? {}; } catch {}
check("vitrine aberta (PUBLIC_ACCESS e PUBLIC_LAUNCH)", data.publicAccessEnabled === true && data.publicLaunchEnabled === true);
check("modo de teste desligado", data.testMode === false && data.allowFakeData === false);

const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} verificações ok`);
process.exit(failed.length ? 1 : 0);
