import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/bits";
import { PortMap } from "@/components/PortMap";
import { sectorById, statusLabel, type EquipmentStatus } from "@/lib/port-data";
import { useSim } from "@/lib/simulation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa Interno — InovaLog" },
      {
        name: "description",
        content:
          "Planta interna do porto com setores, vias, equipamentos, rotas ativas e bloqueios em tempo real.",
      },
      { property: "og:title", content: "Mapa Interno — InovaLog" },
      {
        property: "og:description",
        content: "Acompanhe equipamentos, rotas e bloqueios dentro do porto.",
      },
    ],
  }),
  component: MapaPage,
});

const filters: (EquipmentStatus | "todos")[] = ["todos", "livre", "em-uso", "manutencao"];

function MapaPage() {
  const { blockages, equipment, focusRoute } = useSim();
  const [filter, setFilter] = useState<EquipmentStatus | "todos">("todos");
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const route = focusRoute;


  return (
    <AppShell title="Mapa Interno">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel>
          <div className="mb-3 flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs",
                  filter === f
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "bg-secondary/40 text-muted-foreground",
                )}
              >
                {f === "todos" ? "Todos" : statusLabel[f]}
              </button>
            ))}
          </div>
          <PortMap
            className="h-[420px] sm:h-[560px]"
            statusFilter={filter}
            showActiveRoutes
            {...(route ? { routePoints: route.plan.points, routeBlocked: route.plan.blocked } : {})}
            {...(selected ? { highlightEquipmentId: selected } : {})}
            onSelectEquipment={(e) => setSelected(e.id)}
          />

          <p className="mt-2 text-xs text-muted-foreground">
            Arraste para mover, use a roda do mouse ou os botões para aproximar. Toque em um
            equipamento para destacá-lo.
          </p>
        </Panel>

        <div className="grid gap-4">
          <Panel title="Bloqueios ativos">
            <ul className="space-y-2">
              {blockages.map((b) => (
                <li key={b.id} className="rounded-xl bg-danger/15 px-3 py-2.5">
                  <p className="text-sm font-semibold text-danger">CAMINHO BLOQUEADO</p>
                  <p className="text-xs text-muted-foreground">{b.reason}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Equipamento selecionado">
            {selected ? (
              (() => {
                const e = equipment.find((x) => x.id === selected)!;
                return (
                  <div className="space-y-2">
                    <p className="text-lg font-bold">{e.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {e.type} · {sectorById.get(e.sectorId)?.name}
                    </p>
                    <button
                      onClick={() => navigate({ to: "/equipamentos/$id", params: { id: e.id } })}
                      className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground"
                    >
                      Ver detalhes
                    </button>
                  </div>
                );
              })()
            ) : (
              <p className="text-sm text-muted-foreground">
                Toque em um marcador no mapa para ver os dados do equipamento.
              </p>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
