import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Fuel,
  TrafficCone,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/bits";
import { useSim, type NotificationKind } from "@/lib/simulation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notificacoes")({
  head: () => ({
    meta: [
      { title: "Notificações — InovaLog" },
      {
        name: "description",
        content:
          "Alertas de disponibilidade, bloqueios, conclusão de rota, congestionamento, manutenção e combustível baixo.",
      },
      { property: "og:title", content: "Notificações — InovaLog" },
      {
        property: "og:description",
        content: "Todos os alertas da operação interna do porto em um só lugar.",
      },
    ],
  }),
  component: NotificacoesPage,
});

const icons: Record<NotificationKind, typeof BellRing> = {
  disponibilidade: BellRing,
  bloqueio: AlertTriangle,
  conclusao: CheckCircle2,
  congestionamento: TrafficCone,
  manutencao: Wrench,
  combustivel: Fuel,
};

export default function _unused() {
  return null;
}

function NotificacoesPage() {
  const { notifications, markAllRead } = useSim();

  return (
    <AppShell title="Notificações" back={{ to: "/" }}>
      <Panel
        title={`${notifications.filter((n) => !n.read).length} não lidas`}
        action={
          <button onClick={markAllRead} className="text-xs text-primary">
            Marcar todas como lidas
          </button>
        }
      >
        <ul className="space-y-2">
          {notifications.map((n) => {
            const Icon = icons[n.kind];
            const tone =
              n.severity === "danger"
                ? "text-danger"
                : n.severity === "warn"
                  ? "text-busy"
                  : "text-free";
            return (
              <li
                key={n.id}
                className={cn(
                  "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border border-border p-3",
                  n.read ? "bg-transparent" : "bg-secondary/40",
                )}
              >
                <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", tone)} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.detail}</p>
                </div>
                <span className="text-xs text-muted-foreground">{n.time}</span>
              </li>
            );
          })}
        </ul>
      </Panel>
    </AppShell>
  );
}
