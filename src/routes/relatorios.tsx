import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Panel, Stat } from "@/components/bits";
import { productivity } from "@/lib/port-data";
import { useSim } from "@/lib/simulation";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — InovaLog" },
      {
        name: "description",
        content:
          "Horas trabalhadas, atividades realizadas, tempo de espera, consumo de combustível e produtividade por dia.",
      },
      { property: "og:title", content: "Relatórios — InovaLog" },
      {
        property: "og:description",
        content: "Indicadores semanais da operação interna do porto.",
      },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { equipment } = useSim();
  const totalHoras = productivity.reduce((a, d) => a + d.horas, 0);
  const totalAtiv = productivity.reduce((a, d) => a + d.atividades, 0);
  const totalEspera = productivity.reduce((a, d) => a + d.espera, 0);
  const totalComb = productivity.reduce((a, d) => a + d.combustivel, 0);
  const maxHoras = Math.max(...productivity.map((d) => d.horas));
  const emUso = equipment.filter((e) => e.status === "em-uso").length;
  const produtividade = Math.round((emUso / Math.max(1, equipment.length)) * 100);

  return (
    <AppShell title="Relatórios" back={{ to: "/mais", label: "Mais" }}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Horas trabalhadas" value={`${totalHoras} h`} hint="Últimos 6 dias" />
          <Stat label="Atividades" value={totalAtiv} tone="free" />
          <Stat label="Tempo de espera" value={`${totalEspera} h`} tone="busy" />
          <Stat label="Combustível" value={`${totalComb} L`} />
        </div>

        <Panel title="Produtividade por dia">
          <ul className="space-y-3">
            {productivity.map((d) => (
              <li key={d.dia} className="grid grid-cols-[3rem_minmax(0,1fr)_4rem] items-center gap-3">
                <span className="text-xs text-muted-foreground">{d.dia}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(d.horas / maxHoras) * 100}%` }}
                  />
                </div>
                <span className="text-right text-xs">{d.horas} h</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Detalhamento">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Dia</th>
                  <th className="py-2 pr-4">Horas</th>
                  <th className="py-2 pr-4">Atividades</th>
                  <th className="py-2 pr-4">Espera</th>
                  <th className="py-2">Combustível</th>
                </tr>
              </thead>
              <tbody>
                {productivity.map((d) => (
                  <tr key={d.dia} className="border-t border-border">
                    <td className="py-2 pr-4">{d.dia}</td>
                    <td className="py-2 pr-4">{d.horas} h</td>
                    <td className="py-2 pr-4">{d.atividades}</td>
                    <td className="py-2 pr-4 text-busy">{d.espera} h</td>
                    <td className="py-2">{d.combustivel} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Utilização da frota agora">
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-free" style={{ width: `${produtividade}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {emUso} de {equipment.length} equipamentos em operação ({produtividade}%)
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
