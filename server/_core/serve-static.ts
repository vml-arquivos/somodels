import express, { type Express } from "express";
import fs from "fs";
import path from "path";

function renderIndexHtml(distPath: string, seoHead?: string) {
  const html = fs.readFileSync(path.resolve(distPath, "index.html"), "utf8");
  if (!seoHead) return html;
  if (html.includes("<!-- SEO_HEAD -->")) return html.replace("<!-- SEO_HEAD -->", seoHead);
  return html.replace("</head>", `${seoHead}\n  </head>`);
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, { index: false }));

  app.use("*", (req, res) => {
    const seoHead = typeof res.locals.seoHead === "string" ? res.locals.seoHead : undefined;
    const html = renderIndexHtml(distPath, seoHead);
    res.type("html").send(html);
  });
}
