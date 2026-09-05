import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { FuelBar, Panel, StatusPill } from "@/components/bits";
import { EquipmentIcon } from "@/components/EquipmentIcon";
import { PortMap } from "@/components/PortMap";
import { sectorById } from "@/lib/port-data";
import { useSim } from "@/lib/simulation";

export const Route = createFileRoute("/equipamentos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do Equipamento — InovaLog" },
      {
        name: "description",
        content:
          "Dados completos do equipamento: tipo, placa, capacidade, combustível, horímetro, operador e manutenção.",
      },
      { property: "og:title", content: "Detalhes do Equipamento — InovaLog" },
      {
        property: "og:description",
        content: "Ficha técnica e solicitação do equipamento portuário.",
      },
    ],
  }),
  component: EquipmentDetail,
});

function EquipmentDetail() {
  const { id } = Route.useParams();
  const { equipment, routeOf } = useSim();
  const navigate = useNavigate();
  const e = equipment.find((x) => x.id === id);

  if (!e) {
    return (
      <AppShell title="Equipamento não encontrado" back={{ to: "/equipamentos" }}>
        <p className="text-sm text-muted-foreground">
          Este equipamento não existe.{" "}
          <Link to="/equipamentos" className="text-primary">
            Voltar à lista
          </Link>
        </p>
      </AppShell>
    );
  }

  const active = routeOf(e.id);
  const sector = sectorById.get(e.sectorId);

  const info: [string, string][] = [
    ["Tipo", e.type],
    ["Placa", e.plate],
    ["Capacidade", e.capacity],
    ["Localização", sector?.name ?? "—"],
    ["Operador", e.operator],
    ["Horímetro", `${e.hours} h`],
    ["Próxima manutenção", e.nextMaintenance],
  ];

  return (
    <AppShell title="Detalhes do Equipamento" back={{ to: "/equipamentos", label: "Equipamentos" }}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
            <span className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-secondary/50">
              <EquipmentIcon type={e.type} className="h-10 w-10 text-muted-foreground" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-bold">{e.name}</p>
              <div className="mt-1">
                <StatusPill status={e.status} />
              </div>
              <div className="mt-2">
                <FuelBar value={e.fuel} />
              </div>
            </div>
          </div>

          <dl className="mt-4 divide-y divide-border rounded-2xl bg-secondary/30">
            {info.map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-3 py-2.5 text-sm"
              >
                <dt className="truncate text-muted-foreground">{k}</dt>
                <dd className="truncate font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Link
              to="/mapa"
              className="rounded-xl border border-border bg-secondary/40 py-2.5 text-center text-sm font-semibold"
            >
              Ver no mapa
            </Link>
            <button
              disabled={e.status !== "livre"}
              onClick={() =>
                navigate({ to: "/solicitar", search: { equipamento: e.id } })
              }
              className="rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            >
              {e.status === "livre" ? "Solicitar este equipamento" : "Indisponível"}
            </button>
          </div>
        </Panel>

        <Panel title="Posição atual">
          <PortMap
            className="h-72 sm:h-96"
            highlightEquipmentId={e.id}
            {...(active
              ? { routePoints: active.plan.points, routeBlocked: active.plan.blocked }
              : {})}
          />
          {active && (
            <Link to="/rota" className="mt-3 block text-sm text-primary">
              Acompanhar rota em andamento →
            </Link>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
