import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ownerAccounts, ownerMedia, payments } from "../drizzle/schema";

const root = path.resolve(__dirname, "..");
const sql = readFileSync(path.join(root, "drizzle/0013_owner_area.sql"), "utf8");
const journal = JSON.parse(
  readFileSync(path.join(root, "drizzle/meta/_journal.json"), "utf8")
);

function tableBlock(name: string) {
  const start = sql.indexOf(`CREATE TABLE \`${name}\``);
  expect(start).toBeGreaterThanOrEqual(0);
  return sql.slice(start, sql.indexOf(");", start));
}

describe("migration 0013 (área do anunciante)", () => {
  it("está no diário e todos os arquivos do diário existem", () => {
    for (const entry of journal.entries)
      expect(existsSync(path.join(root, "drizzle", `${entry.tag}.sql`))).toBe(true);
    const tags = journal.entries.map((entry: { tag: string }) => entry.tag);
    expect(tags.at(-1)).toBe("0013_owner_area");
    const whens = journal.entries.map((entry: { when: number }) => entry.when);
    expect([...whens].sort((a, b) => a - b)).toEqual(whens);
  });

  for (const table of [ownerAccounts, ownerMedia, payments]) {
    it(`SQL e schema têm as mesmas colunas em ${getTableName(table)}`, () => {
      const block = tableBlock(getTableName(table));
      const sqlColumns = Array.from(block.matchAll(/^\t`(\w+)` /gm)).map(
        match => match[1]
      );
      const schemaColumns = Object.values(getTableColumns(table)).map(
        column => column.name
      );
      expect(sqlColumns.sort()).toEqual(schemaColumns.sort());
    });
  }

  it("só cria tabelas novas (nada destrutivo)", () => {
    expect(sql).not.toMatch(/DROP\s|ALTER TABLE|DELETE\s|TRUNCATE/i);
  });
});
