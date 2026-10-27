import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  adminPathForTab,
  adminTabLabels,
  type AdminTabKey,
} from "@shared/admin-navigation";

type Item = { key: string; group: string; label: string; hint?: string; run: () => void };

export default function CommandPalette({
  tabs,
  onTab,
  onAdvertiser,
  onProfile,
  onClient,
  onClose,
}: {
  tabs: AdminTabKey[];
  onTab: (tab: AdminTabKey) => void;
  onAdvertiser: (userId: number) => void;
  onProfile: (profileId: number) => void;
  onClient: (userId: number) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
  }, []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 200);
    return () => clearTimeout(t);
  }, [text]);

  const found = trpc.panel.search.useQuery(
    { q: debounced },
    { enabled: debounced.length >= 2 }
  );

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    const needle = text.trim().toLowerCase();
    const go = (fn: () => void) => () => {
      fn();
      onClose();
    };
    found.data?.advertisers.forEach(p =>
      out.push({
        key: `a${p.id}`,
        group: "Anunciantes",
        label: p.name || p.email || `#${p.id}`,
        hint: p.email ?? undefined,
        run: go(() => onAdvertiser(p.id)),
      })
    );
    found.data?.listings.forEach(p =>
      out.push({
        key: `l${p.id}`,
        group: "Anúncios",
        label: p.stageName,
        hint: p.city,
        run: go(() => onProfile(p.id)),
      })
    );
    found.data?.clients.forEach(p =>
      out.push({
        key: `c${p.id}`,
        group: "Clientes",
        label: p.name || p.email || `#${p.id}`,
        hint: p.email ?? undefined,
        run: go(() => onClient(p.id)),
      })
    );
    tabs
      .filter(t => !needle || adminTabLabels[t].toLowerCase().includes(needle))
      .slice(0, needle ? 6 : 20)
      .forEach(t =>
        out.push({
          key: `t${t}`,
          group: "Ir para",
          label: adminTabLabels[t],
          hint: adminPathForTab(t),
          run: go(() => onTab(t)),
        })
      );
    return out;
  }, [found.data, tabs, text, onAdvertiser, onProfile, onClient, onTab, onClose]);

  useEffect(() => setActive(0), [items.length, debounced]);

  const groups: string[] = [];
  items.forEach(i => groups.includes(i.group) || groups.push(i.group));

  return (
    <div
      className="adm-cmd-back"
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="adm-cmd" role="dialog" aria-modal="true" aria-label="Busca rápida">
        <input
          ref={input}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Buscar anunciante, anúncio ou ir para uma tela…"
          aria-label="Buscar"
          onKeyDown={e => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive(a => Math.min(items.length - 1, a + 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive(a => Math.max(0, a - 1));
            }
            if (e.key === "Enter") items[active]?.run();
          }}
        />
        <ul>
          {items.length === 0 && (
            <li className="adm-muted" style={{ padding: 16 }}>
              Nada encontrado.
            </li>
          )}
          {groups.map(group => (
            <li key={group}>
              <h4>{group}</h4>
              {items
                .filter(i => i.group === group)
                .map(item => {
                  const index = items.indexOf(item);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      className={index === active ? "is-active" : ""}
                      onMouseEnter={() => setActive(index)}
                      onClick={item.run}
                    >
                      <span>{item.label}</span>
                      {item.hint && <span className="adm-muted">{item.hint}</span>}
                    </button>
                  );
                })}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
