#!/usr/bin/env node
// Teste pós-deploy. Uso: node scripts/smoke-prod.mjs [https://eromodels.com.br]
// Não grava nada, não faz login e usa somente uma credencial fictícia para validar o envelope de erro.
const cliBase = process.argv.slice(2).find(argument => argument !== "--");
const base = (cliBase || "https://eromodels.com.br").replace(/\/$/, "");
const baseUrl = new URL(base);
const host = baseUrl.host.replace(/^(conta|admin)\./, "");
const results = [];

const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(
    `${ok ? "OK   " : "FALHA"} ${name}${detail ? ` — ${detail}` : ""}`
  );
};

const get = async (url, init) => {
  try {
    const res = await fetch(url, { redirect: "manual", ...init });
    return {
      res,
      text: await res.text().catch(() => ""),
    };
  } catch (error) {
    return { res: null, text: "", error: String(error?.message || error) };
  }
};

const json = text => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

for (const h of [host, `conta.${host}`, `admin.${host}`]) {
  const { res, text, error } = await get(`https://${h}/healthz`);
  const body = json(text) || {};
  check(
    `healthz ${h}`,
    res?.status === 200 && body.ok === true && body.database === true,
    error || `status ${res?.status} release ${body.release ?? "?"}`
  );
}

const home = await get(`${base}/`);
check("home responde 200", home.res?.status === 200);

const robots = await get(`${base}/robots.txt`);
check(
  "robots.txt libera a indexação",
  robots.res?.status === 200 && !/^Disallow:\s*\/\s*$/m.test(robots.text)
);

const sitemap = await get(`${base}/sitemap.xml`);
check(
  "sitemap.xml é um índice",
  sitemap.res?.status === 200 && sitemap.text.includes("<sitemapindex")
);

const profiles = await get(`${base}/sitemap-profiles.xml`);
const count = (profiles.text.match(/<loc>/g) || []).length;
check(
  "sitemap de perfis responde",
  profiles.res?.status === 200,
  `${count} anúncio(s)`
);

for (const path of [
  "/termos",
  "/privacidade",
  "/seguranca",
  "/denuncia",
  "/ajuda",
  "/contato",
  "/como-anunciar",
  "/planos",
  "/cadastro",
  "/login",
]) {
  const r = await get(`${base}${path}`);
  check(`página ${path}`, r.res?.status === 200);
}

for (const path of ["/manifest.webmanifest", "/sw.js", "/offline.html"]) {
  const asset = await get(`${base}${path}`);
  check(`PWA ${path}`, asset.res?.status === 200);
}

const conta = await get(`https://conta.${host}/`);
check(
  "conta.* redireciona para /conta",
  [301, 302, 307, 308].includes(conta.res?.status) &&
    String(conta.res?.headers.get("location") || "").includes("/conta")
);
const admin = await get(`https://admin.${host}/`);
check(
  "admin.* redireciona para /admin",
  [301, 302, 307, 308].includes(admin.res?.status) &&
    String(admin.res?.headers.get("location") || "").includes("/admin")
);

for (const path of [
  "/admin",
  "/admin/usuarios",
  "/admin/anuncios",
  "/admin/moderacao",
  "/admin/denuncias",
  "/admin/verificacoes",
  "/admin/mensagens",
  "/admin/planos",
  "/admin/financeiro",
  "/admin/pagina-inicial",
  "/admin/prontidao",
  "/admin/auditoria",
  "/admin/seguranca",
]) {
  const route = await get(`https://admin.${host}${path}`);
  check(`rota admin ${path}`, route.res?.status === 200);
}

const cfg = await get(`${base}/api/trpc/system.config`);
const data = json(cfg.text)?.result?.data?.json ?? {};
check(
  "vitrine aberta (PUBLIC_ACCESS e PUBLIC_LAUNCH)",
  data.publicAccessEnabled === true && data.publicLaunchEnabled === true
);
check(
  "modo de teste desligado",
  data.testMode === false && data.allowFakeData === false
);

const loginBody = JSON.stringify({
  0: {
    json: {
      email: "smoke-invalid@example.invalid",
      password: "InvalidPassword123",
    },
  },
});
const login = await get(
  `${base}/api/trpc/auth.login?batch=1&input=${encodeURIComponent(loginBody)}`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: base,
    },
    body: loginBody,
  }
);
const loginData = json(login.text);
const loginError = Array.isArray(loginData)
  ? loginData[0]?.error
  : loginData?.error;
check(
  "login inválido devolve envelope tRPC",
  login.res?.status >= 200 &&
    login.res?.status < 600 &&
    Boolean(loginError) &&
    !login.text.includes("Unable to transform response from server")
);

const failed = results.filter(result => !result.ok);
console.log(
  `\n${results.length - failed.length}/${results.length} verificações ok`
);
process.exit(failed.length ? 1 : 0);
