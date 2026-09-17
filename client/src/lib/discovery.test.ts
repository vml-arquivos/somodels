import { describe, expect, it } from "vitest";
import {
  buildDiscoverySearch,
  cityPath,
  parseDiscoverySearch,
} from "./discovery";

describe("discovery URL state", () => {
  it("starts with empty filters on an empty query", () => {
    expect(parseDiscoverySearch("")).toEqual({ search: "", city: "", category: "", page: 0 });
  });

  it("parses shareable filters", () => {
    expect(parseDiscoverySearch("?q=editorial&city=Bras%C3%ADlia&category=Modelo&page=3")).toEqual({
      search: "editorial",
      city: "Brasília",
      category: "Modelo",
      page: 2,
    });
  });

  it("trims text filters", () => {
    expect(parseDiscoverySearch("?q=%20teste%20&city=%20Recife%20")).toMatchObject({
      search: "teste",
      city: "Recife",
    });
  });

  it("caps oversized text filters", () => {
    const parsed = parseDiscoverySearch(`?q=${"a".repeat(200)}&category=${"b".repeat(100)}`);
    expect(parsed.search).toHaveLength(120);
    expect(parsed.category).toHaveLength(60);
  });

  it("normalizes invalid pages to the first page", () => {
    expect(parseDiscoverySearch("?page=-2").page).toBe(0);
    expect(parseDiscoverySearch("?page=abc").page).toBe(0);
  });

  it("caps page offsets to the API enumeration ceiling", () => {
    expect(parseDiscoverySearch("?page=999999").page).toBe(833);
  });

  it("uses the route city instead of a query city", () => {
    expect(parseDiscoverySearch("?city=Recife", "Brasília").city).toBe("Brasília");
  });

  it("omits empty filters when building a URL", () => {
    expect(buildDiscoverySearch({ search: "", city: "", category: "", page: 0 })).toBe("");
  });

  it("builds a stable page number for sharing", () => {
    expect(buildDiscoverySearch({ search: "ana", city: "", category: "", page: 2 })).toBe("?q=ana&page=3");
  });

  it("keeps the fixed city out of the query string", () => {
    expect(buildDiscoverySearch({ search: "", city: "Brasília", category: "Modelo", page: 0 }, "Brasília")).toBe("?category=Modelo");
  });

  it("encodes city paths safely", () => {
    expect(cityPath("São Paulo")).toBe("/cidade/S%C3%A3o%20Paulo");
  });

  it("trims city paths before encoding", () => {
    expect(cityPath("  Recife  ")).toBe("/cidade/Recife");
  });
});
