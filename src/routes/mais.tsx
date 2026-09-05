import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Bell, ChevronRight, Route as RouteIcon, Wrench } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/bits";
import { useSim } from "@/lib/simulation";

export const Route = createFileRoute("/mais")({
  head: () => ({
    meta: [
      { title: "Mais — InovaLog" },
      {
        name: "description",
        content:
          "Acesse notificações, relatórios de produtividade, manutenções e solicitação de rota interna.",
      },
      { property: "og:title", content: "Mais — InovaLog" },
      {
        property: "og:description",
        content: "Central de acesso às demais telas da operação do porto.",
      },
    ],
  }),
  component: MaisPage,
});

function MaisPage() {
  const { notifications, maintenance } = useSim();
  const unread = notifications.filter((n) => !n.read).length;
  const pending = maintenance.filter((m) => m.state !== "concluida").length;

  return (
    <AppShell title="Mais">
      <Panel>
        <ul className="divide-y divide-border">
          <li>
            <Link
              to="/notificacoes"
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3"
            >
              <Bell className="h-5 w-5 text-primary" />
              <span className="truncate text-sm">Notificações</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {unread > 0 && <span className="text-danger">{unread}</span>}
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="/relatorios"
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3"
            >
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="truncate text-sm">Relatórios</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
          <li>
            <Link
              to="/manutencoes"
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3"
            >
              <Wrench className="h-5 w-5 text-primary" />
              <span className="truncate text-sm">Manutenções</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {pending > 0 && <span className="text-busy">{pending}</span>}
                <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          </li>
          <li>
            <Link
              to="/solicitar"
              search={{ equipamento: undefined }}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3"
            >
              <RouteIcon className="h-5 w-5 text-primary" />
              <span className="truncate text-sm">Solicitar equipamento</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </li>
        </ul>
      </Panel>
    </AppShell>
  );
}
