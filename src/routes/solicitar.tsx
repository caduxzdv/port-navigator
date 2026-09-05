import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/bits";
import { activities, equipmentTypes, sectors } from "@/lib/port-data";
import { useSim } from "@/lib/simulation";

export const Route = createFileRoute("/solicitar")({
  validateSearch: (search: Record<string, unknown>) => ({
    equipamento: typeof search["equipamento"] === "string" ? search["equipamento"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Solicitar Equipamento — InovaLog" },
      {
        name: "description",
        content:
          "Solicite um equipamento livre, informe destino e atividade e receba automaticamente a melhor rota interna.",
      },
      { property: "og:title", content: "Solicitar Equipamento — InovaLog" },
      {
        property: "og:description",
        content: "Pedido de equipamento com cálculo automático de rota.",
      },
    ],
  }),
  component: SolicitarPage,
});

function SolicitarPage() {
  const { equipamento } = Route.useSearch();
  const { equipment, planRoute } = useSim();
  const navigate = useNavigate();
  const [type, setType] = useState("todos");
  const [equipId, setEquipId] = useState(equipamento ?? "auto");
  const [dest, setDest] = useState(sectors[5]!.id);
  const [activity, setActivity] = useState(activities[0]!);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const options = equipment.filter(
    (e) => e.status === "livre" && (type === "todos" || e.type === type),
  );

  const submit = () => {
    const res = planRoute({
      ...(equipId !== "auto" ? { equipmentId: equipId } : {}),
      ...(type !== "todos" ? { type } : {}),
      toSectorId: dest,
      activity,
      notes,
    });
    if (!res.ok) {
      setError(res.message ?? "Não foi possível atender à solicitação");
      return;
    }
    setError(null);
    navigate({ to: "/rota" });
  };

  return (
    <AppShell title="Solicitar Rota">
      <Panel className="mx-auto max-w-2xl">
        <div className="grid gap-4">
          <Field label="Tipo de equipamento">
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setEquipId("auto");
              }}
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm"
            >
              <option value="todos">Qualquer tipo</option>
              {equipmentTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Equipamento">
            <select
              value={equipId}
              onChange={(e) => setEquipId(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm"
            >
              <option value="auto">Escolher automaticamente o mais próximo</option>
              {options.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.type}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Destino">
            <select
              value={dest}
              onChange={(e) => setDest(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm"
            >
              {sectors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Atividade">
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm"
            >
              {activities.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Observações">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Informações adicionais para o operador"
              className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-sm outline-none"
            />
          </Field>

          {error && (
            <p className="rounded-xl bg-danger/15 px-3 py-2.5 text-sm text-danger">{error}</p>
          )}

          <button
            onClick={submit}
            className="rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground"
          >
            Calcular melhor rota
          </button>
        </div>
      </Panel>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </label>
  );
}
