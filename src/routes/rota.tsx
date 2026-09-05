import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, MapPin, Navigation, Timer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel, Stat, StatusPill } from "@/components/bits";
import { PortMap } from "@/components/PortMap";
import { sectorById } from "@/lib/port-data";
import { useSim } from "@/lib/simulation";

export const Route = createFileRoute("/rota")({
  head: () => ({
    meta: [
      { title: "Rota Sugerida — InovaLog" },
      {
        name: "description",
        content:
          "Rota interna sugerida e acompanhamento em tempo real do trajeto do equipamento dentro do porto.",
      },
      { property: "og:title", content: "Rota Sugerida — InovaLog" },
      {
        property: "og:description",
        content: "Origem, destino, distância, tempo e progresso da rota interna.",
      },
    ],
  }),
  component: RotaPage,
});

function RotaPage() {
  const { suggestion, activeRoutes, equipment, startRoute, cancelRoute, clearSuggestion } =
    useSim();
  const navigate = useNavigate();
  const active = activeRoutes[0];
  const current = suggestion ?? active ?? null;

  if (!current) {
    return (
      <AppShell title="Rota">
        <Panel>
          <p className="text-sm text-muted-foreground">
            Nenhuma rota calculada.{" "}
            <Link to="/solicitar" search={{ equipamento: undefined }} className="text-primary">
              Solicitar equipamento
            </Link>
          </p>
        </Panel>
      </AppShell>
    );
  }

  const eq = equipment.find((e) => e.id === current.equipmentId);
  const origin = sectorById.get(current.fromSectorId);
  const dest = sectorById.get(current.toSectorId);
  const running = !suggestion && active;
  const progress = active ? Math.round(active.progress * 100) : 0;
  const remainingMin = active
    ? Math.max(1, Math.round(active.plan.minutes * (1 - active.progress)))
    : current.plan.minutes;
  const remainingDist = active
    ? Math.round(active.plan.distance * (1 - active.progress))
    : current.plan.distance;

  return (
    <AppShell title={running ? "Rota em Andamento" : "Rota Sugerida"} back={{ to: "/" }}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel>
          <PortMap
            className="h-[380px] sm:h-[520px]"
            routePoints={current.plan.points}
            routeBlocked={current.plan.blocked}
            {...(eq ? { highlightEquipmentId: eq.id } : {})}
          />
        </Panel>

        <div className="space-y-4">
          {current.plan.blocked && (
            <div className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-danger">CAMINHO BLOQUEADO</p>
                <p className="text-xs text-muted-foreground">
                  {current.plan.blockReason ?? "Trecho interditado"} — rota alternativa
                  calculada automaticamente.
                </p>
              </div>
            </div>
          )}

          <Panel title="Equipamento">
            {eq ? (
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{eq.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{eq.type}</p>
                </div>
                <StatusPill status={eq.status} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Equipamento indisponível</p>
            )}
          </Panel>

          <Panel title="Trajeto">
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">Origem: {origin?.name ?? "—"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Navigation className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Destino: {dest?.name ?? "—"}</span>
              </li>
              <li className="flex items-center gap-2">
                <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">Atividade: {current.activity}</span>
              </li>
            </ul>
            {current.notes && (
              <p className="mt-3 rounded-xl bg-secondary/40 p-3 text-xs text-muted-foreground">
                {current.notes}
              </p>
            )}
          </Panel>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Distância restante" value={`${remainingDist} m`} />
            <Stat label="Tempo restante" value={`${remainingMin} min`} tone="free" />
          </div>

          {running && active ? (
            <Panel title="Progresso">
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-free" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {progress}% concluído · status: em trânsito
              </p>
              <button
                onClick={() => {
                  cancelRoute(active.id);
                  navigate({ to: "/" });
                }}
                className="mt-3 w-full rounded-xl border border-danger/50 py-2.5 text-sm font-semibold text-danger"
              >
                Cancelar rota
              </button>
            </Panel>
          ) : (
            <div className="grid gap-2">
              <button
                onClick={() => {
                  startRoute();
                }}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
              >
                Iniciar rota
              </button>
              <button
                onClick={() => {
                  clearSuggestion();
                  navigate({ to: "/solicitar", search: { equipamento: undefined } });
                }}
                className="w-full rounded-xl border border-border py-2.5 text-sm text-muted-foreground"
              >
                Refazer solicitação
              </button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
