import { useEffect } from "react";

export default function Seo({ title, description, path }: { title: string; description: string; path: string }) {
  useEffect(() => {
    document.title = title;
    const setMeta = (name: string, content: string) => { let el = document.querySelector(`meta[name="${name}"]`); if (!el) { el = document.createElement("meta"); el.setAttribute("name", name); document.head.appendChild(el); } el.setAttribute("content", content); };
    setMeta("description", description);
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null; if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); } link.href = `${window.location.origin}${path}`;
  }, [title, description, path]);
  return null;
}
