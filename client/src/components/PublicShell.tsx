import type { ReactNode } from "react";
import { usePublicLight } from "@/contexts/ThemeContext";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";

/** Moldura única das páginas públicas: tema claro, topo e rodapé iguais em todas. */
export default function PublicShell({
  children,
  narrow = false,
}: {
  children: ReactNode;
  narrow?: boolean;
}) {
  usePublicLight();
  return (
    <div className="studio studio-public ep-page">
      <StudioHeader />
      <main className={`ep-main ep-page-body${narrow ? " is-narrow" : ""}`}>
        <div className="ep-wrap">{children}</div>
      </main>
      <PublicFooter />
    </div>
  );
}

/** Cartão central usado em login, cadastro e troca de senha. */
export function AuthCard({
  eyebrow,
  title,
  intro,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <PublicShell narrow>
      <section className="ep-auth">
        {eyebrow && <p className="ep-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {intro && <p className="ep-auth-intro">{intro}</p>}
        {children}
        {footer && <div className="ep-auth-footer">{footer}</div>}
      </section>
    </PublicShell>
  );
}
