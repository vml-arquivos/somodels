import {
  Activity,
  BarChart3,
  Banknote,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Globe,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  PanelLeft,
  ScrollText,
  ShieldCheck,
  Tags,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import type { AdminScope } from "@shared/admin-access";
import {
  adminTabLabels,
  groupAdminNavigation,
  type AdminNavigationBadgeCounts,
  type AdminTabKey,
} from "@shared/admin-navigation";

type AdminSidebarProps = {
  activeTab: AdminTabKey;
  badges?: AdminNavigationBadgeCounts;
  collapsed: boolean;
  drawerOpen: boolean;
  mfaPending: boolean;
  scopes: readonly AdminScope[];
  onCollapsedChange: (collapsed: boolean) => void;
  onDrawerChange: (open: boolean) => void;
};

const icons: Record<AdminTabKey, LucideIcon> = {
  overview: LayoutDashboard,
  advertisers: Users,
  clients: UserRound,
  team: UserCog,
  payments: Banknote,
  analytics: BarChart3,
  seo: Globe,
  profiles: FileText,
  moderation: ShieldCheck,
  reports: ClipboardCheck,
  identity: UserCheck,
  plans: Tags,
  messages: MessageSquare,
  readiness: Activity,
  security: LockKeyhole,
  finance: WalletCards,
  settings: PanelLeft,
  audit: ScrollText,
};

export default function AdminSidebar({
  activeTab,
  badges,
  collapsed,
  drawerOpen,
  mfaPending,
  scopes,
  onCollapsedChange,
  onDrawerChange,
}: AdminSidebarProps) {
  const [isMobile, setIsMobile] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
  );
  const asideRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const groups = groupAdminNavigation(scopes, badges);
  const mobileClosed = isMobile && !drawerOpen;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => setIsMobile(media.matches);
    onChange();
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;
    if (mobileClosed) aside.setAttribute("inert", "");
    else aside.removeAttribute("inert");
  }, [mobileClosed]);

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () =>
      asideRef.current
        ? Array.from(
            asideRef.current.querySelectorAll<HTMLElement>(
              "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
            )
          )
        : [];
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onDrawerChange(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (isMobile) triggerRef.current?.focus();
      else previous?.focus?.();
    };
  }, [drawerOpen, isMobile, onDrawerChange]);

  return (
    <>
      <div className="ad-mobile-bar">
        <button
          ref={triggerRef}
          type="button"
          className="ad-menu-trigger"
          aria-expanded={drawerOpen}
          aria-controls="admin-navigation"
          onClick={() => onDrawerChange(true)}
        >
          <PanelLeft aria-hidden="true" size={18} />
          <span>Menu</span>
        </button>
        <strong>{adminTabLabels[activeTab]}</strong>
      </div>
      {drawerOpen && (
        <button
          type="button"
          className="ad-drawer-scrim"
          aria-label="Fechar menu administrativo"
          onClick={() => onDrawerChange(false)}
        />
      )}
      <aside
        ref={asideRef}
        id="admin-navigation"
        className={`ad-sidebar ${drawerOpen ? "is-open" : ""}`}
        aria-label="Navegação administrativa"
        aria-hidden={mobileClosed ? true : undefined}
        aria-modal={drawerOpen ? true : undefined}
        role={drawerOpen ? "dialog" : undefined}
      >
        <div className="ad-sidebar-header">
          <div className="ad-sidebar-brand">
            <span className="ad-sidebar-mark" aria-hidden="true">
              E
            </span>
            <span className="ad-sidebar-brand-copy">
              <strong>Ero Models</strong>
              <small>Administração</small>
            </span>
          </div>
          <div className="ad-sidebar-actions">
            {drawerOpen && (
              <button
                ref={closeButtonRef}
                type="button"
                className="ad-sidebar-icon-button ad-mobile-close"
                aria-label="Fechar menu administrativo"
                onClick={() => onDrawerChange(false)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            )}
            <button
              type="button"
              className="ad-sidebar-icon-button ad-collapse-control"
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              aria-expanded={!collapsed}
              onClick={() => onCollapsedChange(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight aria-hidden="true" size={18} />
              ) : (
                <ChevronLeft aria-hidden="true" size={18} />
              )}
            </button>
          </div>
        </div>

        {mfaPending && (
          <div className="ad-sidebar-lock" role="status">
            <LockKeyhole aria-hidden="true" size={16} />
            <span>Ative o MFA em Segurança para liberar as demais áreas.</span>
          </div>
        )}

        <nav className="ad-sidebar-nav" aria-label="Seções do painel">
          {groups.map(group => (
            <section className="ad-nav-section" key={group.key}>
              <h2>{group.label}</h2>
              <ul>
                {group.items.map(item => {
                  const Icon = icons[item.key];
                  const locked = mfaPending && item.key !== "security";
                  return (
                    <li key={item.key}>
                      {locked ? (
                        <button
                          type="button"
                          className={`ad-nav-item ${activeTab === item.key ? "is-active" : ""}`}
                          aria-current={
                            activeTab === item.key ? "page" : undefined
                          }
                          aria-label={item.label}
                          disabled
                        >
                          <Icon
                            aria-hidden="true"
                            size={18}
                            strokeWidth={1.8}
                          />
                          <span className="ad-nav-label">{item.label}</span>
                        </button>
                      ) : (
                        <Link
                          href={item.path}
                          className={`ad-nav-item ${activeTab === item.key ? "is-active" : ""}`}
                          aria-current={
                            activeTab === item.key ? "page" : undefined
                          }
                          aria-label={item.label}
                          onClick={() => onDrawerChange(false)}
                        >
                          <Icon
                            aria-hidden="true"
                            size={18}
                            strokeWidth={1.8}
                          />
                          <span className="ad-nav-label">{item.label}</span>
                          {item.badge && item.badge > 0 ? (
                            <span
                              className="ad-nav-badge"
                              aria-label={`${item.badge} pendente(s)`}
                            >
                              {item.badge > 99 ? "99+" : item.badge}
                            </span>
                          ) : null}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </aside>
    </>
  );
}
