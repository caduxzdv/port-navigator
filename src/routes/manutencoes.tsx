import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Wrench } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel, Stat } from "@/components/bits";
import type { MaintenanceItem } from "@/lib/port-data";
import { useSim } from "@/lib/simulation";

export const Route = createFileRoute("/manutencoes")({
  head: () => ({
    meta: [
      { title: "Manutenções — InovaLog" },
      {
        name: "description",
        content:
          "Manutenções necessárias, agendadas e concluídas dos equipamentos do porto, com próximas datas.",
      },
      { property: "og:title", content: "Manutenções — InovaLog" },
      {
        property: "og:description",
        content: "Controle preventivo e corretivo da frota interna.",
      },
    ],
  }),
  component: ManutencoesPage,
});

function ManutencoesPage() {
  const { maintenance, equipment } = useSim();
  const name = (id: string) => equipment.find((e) => e.id === id)?.name ?? id;

  const groups: { key: MaintenanceItem["state"]; label: string; icon: typeof Wrench }[] = [
    { key: "necessaria", label: "Necessárias", icon: Wrench },
    { key: "agendada", label: "Agendadas", icon: CalendarClock },
    { key: "concluida", label: "Concluídas", icon: CheckCircle2 },
  ];

  const count = (s: MaintenanceItem["state"]) =>
    maintenance.filter((m) => m.state === s).length;

  return (
    <AppShell title="Manutenções" back={{ to: "/mais", label: "Mais" }}>
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Necessárias" value={count("necessaria")} tone="danger" />
          <Stat label="Agendadas" value={count("agendada")} tone="busy" />
          <Stat label="Concluídas" value={count("concluida")} tone="free" />
        </div>

        {groups.map((g) => {
          const items = maintenance.filter((m) => m.state === g.key);
          return (
            <Panel key={g.key} title={g.label}>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada por aqui.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((m) => (
                    <li key={m.id}>
                      <Link
                        to="/equipamentos/$id"
                        params={{ id: m.equipmentId }}
                        className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl bg-secondary/40 p-3"
                      >
                        <g.icon
                          className={
                            g.key === "necessaria"
                              ? "h-5 w-5 text-danger"
                              : g.key === "agendada"
                                ? "h-5 w-5 text-busy"
                                : "h-5 w-5 text-free"
                          }
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{name(m.equipmentId)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">{m.date}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          );
        })}
      </div>
    </AppShell>
  );
}
