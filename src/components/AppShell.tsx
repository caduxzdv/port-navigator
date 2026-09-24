import { Link } from "@tanstack/react-router";
import {
  Bell,
  LayoutDashboard,
  Map as MapIcon,
  Menu,
  Navigation,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSim } from "@/lib/simulation";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/mapa", label: "Mapa", icon: MapIcon },
  { to: "/equipamentos", label: "Equipamentos", icon: Truck },
  { to: "/solicitar", label: "Solicitar Rota", icon: Navigation },
] as const;

const mobileItems = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/mapa", label: "Mapa", icon: MapIcon },
  { to: "/equipamentos", label: "Equipamentos", icon: Truck },
  { to: "/mais", label: "Mais", icon: Menu },
] as const;

export function AppShell({
  title,
  children,
  back,
}: {
  title: string;
  children: ReactNode;
  back?: { to: string; label?: string };
}) {
  const { notifications } = useSim();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed top-0 bottom-0 left-0 hidden w-60 flex-col border-r border-border bg-sidebar p-4 lg:flex">
        <Link to="/" className="mb-6 block px-2 py-2">
          <span
            className="text-2xl font-bold tracking-[0.08em]"
            style={{ fontFamily: '"Cinzel", serif' }}
          >
            <span className="text-foreground">INOVA</span>
            <span className="text-primary">LOG</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent data-[status=active]:bg-primary data-[status=active]:font-semibold data-[status=active]:text-primary-foreground"
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto">
          <Link
            to="/mais"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-sidebar-accent"
          >
            <Menu className="h-4 w-4" /> Mais opções
          </Link>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/inovalog-logo.png"
              alt="InovaLog"
              className="h-9 w-auto max-w-[120px] shrink-0 object-contain"
            />
            <div className="min-w-0">
              {back && (
                <Link
                  to={back.to}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ← {back.label ?? "Voltar"}
                </Link>
              )}
              <h1 className="truncate text-lg font-bold sm:text-xl">{title}</h1>
            </div>
          </div>
          <Link
            to="/notificacoes"
            aria-label="Notificações"
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-foreground">
                {unread}
              </span>
            )}
          </Link>
        </header>

        <main className="px-4 pt-4 pb-28 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed right-0 bottom-0 left-0 z-30 grid grid-cols-4 border-t border-border bg-sidebar px-2 py-2 lg:hidden">
        {mobileItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to === "/" }}
            className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] text-muted-foreground data-[status=active]:text-primary"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
