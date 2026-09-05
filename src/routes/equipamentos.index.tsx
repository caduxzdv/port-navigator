import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FuelBar, Panel, StatusPill } from "@/components/bits";
import { EquipmentIcon } from "@/components/EquipmentIcon";
import {
  equipmentTypes,
  sectorById,
  sectors,
  statusLabel,
  type EquipmentStatus,
} from "@/lib/port-data";
import { useSim } from "@/lib/simulation";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/equipamentos/")({
  head: () => ({
    meta: [
      { title: "Equipamentos — InovaLog" },
      {
        name: "description",
        content:
          "Lista de caminhões, guindastes, empilhadeiras e demais equipamentos do porto com filtros por tipo, status, setor e combustível.",
      },
      { property: "og:title", content: "Equipamentos — InovaLog" },
      {
        property: "og:description",
        content: "Frota portuária com status, localização e combustível.",
      },
    ],
  }),
  component: EquipmentList,
});

const statusFilters: (EquipmentStatus | "todos")[] = [
  "todos",
  "livre",
  "em-uso",
  "manutencao",
];

function EquipmentList() {
  const { equipment } = useSim();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<EquipmentStatus | "todos">("todos");
  const [type, setType] = useState("todos");
  const [sector, setSector] = useState("todos");
  const [lowFuel, setLowFuel] = useState(false);

  const list = equipment.filter(
    (e) =>
      (status === "todos" || e.status === status) &&
      (type === "todos" || e.type === type) &&
      (sector === "todos" || e.sectorId === sector) &&
      (!lowFuel || e.fuel < 40) &&
      (e.name.toLowerCase().includes(q.toLowerCase()) ||
        e.type.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <AppShell title="Equipamentos">
      <Panel className="mb-4">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/40 px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar equipamento"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((f) => (
              <button
                key={f}
                onClick={() => setStatus(f)}
                className={cn(
                  "rounded-full border border-border px-3 py-1.5 text-xs",
                  status === f
                    ? "bg-primary font-semibold text-primary-foreground"
                    : "bg-secondary/40 text-muted-foreground",
                )}
              >
                {f === "todos" ? "Todos" : statusLabel[f]}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm"
            >
              <option value="todos">Todos os tipos</option>
              {equipmentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm"
            >
              <option value="todos">Todos os setores</option>
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setLowFuel((v) => !v)}
              className={cn(
                "rounded-xl border border-border px-3 py-2.5 text-sm",
                lowFuel
                  ? "bg-busy font-semibold text-primary-foreground"
                  : "bg-secondary/40 text-muted-foreground",
              )}
            >
              Combustível abaixo de 40%
            </button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-2 lg:grid-cols-2">
        {list.map((e) => (
          <Link
            key={e.id}
            to="/equipamentos/$id"
            params={{ id: e.id }}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-card px-3 py-3 transition-colors hover:bg-accent"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/60">
              <EquipmentIcon type={e.type} className="h-5 w-5 text-muted-foreground" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{e.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {sectorById.get(e.sectorId)?.name}
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StatusPill status={e.status} />
              <FuelBar value={e.fuel} />
            </span>
          </Link>
        ))}
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum equipamento encontrado.</p>
        )}
      </div>
    </AppShell>
  );
}
