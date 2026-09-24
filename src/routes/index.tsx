import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  Map as MapIcon,
  Navigation,
  PackageCheck,
  Truck,
  Wrench,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Panel, Stat, StatusPill } from "@/components/bits";
import { PortMap } from "@/components/PortMap";
import { sectorById } from "@/lib/port-data";
import { useSim } from "@/lib/simulation";
import logo from "@/assets/inovalog-logo-dark.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InovaLog — Gestão de Equipamentos e Rotas do Porto" },
      {
        name: "description",
        content:
          "Painel de controle da operação portuária: equipamentos, rotas internas, alertas e manutenções em tempo real.",
      },
      { property: "og:title", content: "InovaLog — Gestão Portuária" },
      {
        property: "og:description",
        content: "Dashboard de equipamentos e rotas internas do porto.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { equipment, notifications, activeRoutes, maintenance } = useSim();
  const total = equipment.length;
  const emUso = equipment.filter((e) => e.status === "em-uso").length;
  const livres = equipment.filter((e) => e.status === "livre").length;
  const manut = equipment.filter((e) => e.status === "manutencao").length;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="grid gap-4">
          <Panel className="bg-gradient-to-br from-card to-secondary/30">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3">
              <img
                src={logo.url}
                alt="InovaLog"
                className="h-14 w-14 shrink-0 rounded-xl object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-lg font-bold">InovaLog</p>
                <p className="truncate text-sm text-muted-foreground">
                  Visão geral da operação
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Equipamentos" value={total} hint="Total" />
              <Stat label="Em uso" value={emUso} hint={pct(emUso)} tone="busy" />
              <Stat label="Disponíveis" value={livres} hint={pct(livres)} tone="free" />
              <Stat label="Manutenção" value={manut} hint={pct(manut)} tone="danger" />
            </div>
          </Panel>

          <div className="grid gap-4 sm:grid-cols-2">
            <Panel title="Atividades de hoje">
              <ul className="space-y-2">
                {[
                  { icon: Truck, label: "Entregas", value: 12 },
                  { icon: Boxes, label: "Cargas", value: 8 },
                  { icon: PackageCheck, label: "Descargas", value: 7 },
                ].map((a) => (
                  <li
                    key={a.label}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <a.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{a.label}</span>
                    </span>
                    <span className="font-semibold">{a.value}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="Alertas"
              action={
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold">
                  {notifications.filter((n) => !n.read).length}
                </span>
              }
            >
              <ul className="space-y-2">
                {notifications.slice(0, 3).map((n) => (
                  <li
                    key={n.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2.5"
                  >
                    <AlertTriangle
                      className={
                        n.severity === "danger"
                          ? "h-4 w-4 shrink-0 text-danger"
                          : n.severity === "warn"
                            ? "h-4 w-4 shrink-0 text-busy"
                            : "h-4 w-4 shrink-0 text-free"
                      }
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{n.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{n.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{n.time}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/notificacoes"
                className="mt-3 flex items-center gap-1 text-xs text-primary"
              >
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </Panel>
          </div>

          <Panel title="Resumo da operação">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Rotas ativas" value={activeRoutes.length} tone="free" />
              <Stat
                label="Manutenções pendentes"
                value={maintenance.filter((m) => m.state !== "concluida").length}
                tone="busy"
              />
              <Stat
                label="Combustível médio"
                value={`${Math.round(equipment.reduce((s, e) => s + e.fuel, 0) / total)}%`}
              />
              <Stat
                label="Horas acumuladas"
                value={equipment.reduce((s, e) => s + e.hours, 0)}
              />
            </div>
          </Panel>
        </div>

        <div className="grid gap-4">
          <Panel
            title="Mapa interno"
            action={
              <Link to="/mapa" className="text-xs text-primary">
                Abrir mapa
              </Link>
            }
          >
            <PortMap className="h-64 sm:h-80" showControls={false} />
          </Panel>

          <Panel title="Equipamentos em rota">
            {activeRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma rota em andamento.{" "}
                <Link to="/solicitar" search={{ equipamento: undefined }} className="text-primary">
                  Solicitar equipamento
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {activeRoutes.map((r) => {
                  const e = equipment.find((x) => x.id === r.equipmentId)!;
                  return (
                    <li key={r.id}>
                      <Link
                        to="/rota"
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{e.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {sectorById.get(r.toSectorId)?.name}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-free">
                          {Math.round(r.progress * 100)}%
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Status dos equipamentos">
            <ul className="space-y-1.5">
              {equipment.slice(0, 5).map((e) => (
                <li
                  key={e.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-secondary/40 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{e.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {sectorById.get(e.sectorId)?.name}
                    </p>
                  </div>
                  <StatusPill status={e.status} />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Acessos rápidos">
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/relatorios"
                className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-3 text-sm"
              >
                <BarChart3 className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Relatórios</span>
              </Link>
              <Link
                to="/manutencoes"
                className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-3 text-sm"
              >
                <Wrench className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Manutenções</span>
              </Link>
              <Link
                to="/notificacoes"
                className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-3 text-sm"
              >
                <Bell className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Notificações</span>
              </Link>
              <Link
                to="/solicitar"
                search={{ equipamento: undefined }}
                className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-3 text-sm"
              >
                <Navigation className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Solicitar rota</span>
              </Link>
              <Link
                to="/equipamentos"
                className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-3 text-sm"
              >
                <Truck className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Equipamentos</span>
              </Link>
              <Link
                to="/mapa"
                className="flex items-center gap-2 rounded-xl bg-secondary/40 px-3 py-3 text-sm"
              >
                <MapIcon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Mapa interno</span>
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
