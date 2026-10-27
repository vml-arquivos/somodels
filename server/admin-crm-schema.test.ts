import { readFileSync } from "node:fs";
import path from "node:path";
import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  crmNotes,
  crmProfiles,
  verificationDocuments,
} from "../drizzle/schema";

const root = path.resolve(__dirname, "..");
const sql = readFileSync(path.join(root, "drizzle/0014_admin_crm.sql"), "utf8");

function tableBlock(name: string) {
  const start = sql.indexOf(`CREATE TABLE \`${name}\``);
  expect(start).toBeGreaterThanOrEqual(0);
  return sql.slice(start, sql.indexOf(");", start));
}

describe("migration 0014 (CRM e verificação)", () => {
  for (const table of [crmProfiles, crmNotes, verificationDocuments]) {
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
