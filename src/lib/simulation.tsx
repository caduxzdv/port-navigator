import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  initialBlockages,
  initialEquipment,
  initialMaintenance,
  layoutIdle,
  nodeById,
  sectorById,
  sectors,
  type Blockage,
  type Equipment,
  type EquipmentStatus,
  type MaintenanceItem,
  type Sector,
} from "./port-data";
import { findRoute, withStart, type RoutePlan } from "./routing";

export type NotificationKind =
  | "disponibilidade"
  | "bloqueio"
  | "conclusao"
  | "congestionamento"
  | "manutencao"
  | "combustivel";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  detail: string;
  time: string;
  severity: "info" | "warn" | "danger";
  read: boolean;
}

export interface RouteSuggestion {
  equipmentId: string;
  fromSectorId: string;
  toSectorId: string;
  activity: string;
  notes: string;
  plan: RoutePlan;
}

export interface ActiveRoute extends RouteSuggestion {
  id: string;
  progress: number; // 0..1
  durationMs: number;
  /** tráfego de fundo da simulação (não iniciado pelo usuário) */
  background: boolean;
}

interface SimContextValue {
  equipment: Equipment[];
  blockages: Blockage[];
  notifications: AppNotification[];
  maintenance: MaintenanceItem[];
  activeRoutes: ActiveRoute[];
  suggestion: RouteSuggestion | null;
  /** rota iniciada pelo usuário que está sendo acompanhada */
  focusRoute: ActiveRoute | undefined;
  /** última rota do usuário concluída (para a tela de rota) */
  lastCompleted: ActiveRoute | null;
  planRoute: (input: {
    equipmentId?: string;
    type?: string;
    toSectorId: string;
    activity: string;
    notes: string;
  }) => { ok: boolean; message?: string };
  startRoute: () => string | null;
  cancelRoute: (id: string) => void;
  clearSuggestion: () => void;
  dismissCompleted: () => void;
  markAllRead: () => void;
  routeOf: (equipmentId: string) => ActiveRoute | undefined;
}

const SimContext = createContext<SimContextValue | null>(null);

const TICK_MS = 500;
/** 1 minuto de rota ≈ 4 s reais, mínimo de 12 s para dar tempo de acompanhar */
const durationFor = (plan: RoutePlan) => Math.max(12000, plan.minutes * 4000);

const now = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

let seq = 0;
const uid = (p: string) => `${p}-${Date.now()}-${seq++}`;

type Pt = { x: number; y: number };

function pointAt(points: Pt[], t: number): Pt {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0]!;
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i + 1]!.x - points[i]!.x, points[i + 1]!.y - points[i]!.y);
    lens.push(l);
    total += l;
  }
  let target = total * Math.min(1, Math.max(0, t));
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]!) {
      const f = lens[i]! === 0 ? 0 : target / lens[i]!;
      return {
        x: points[i]!.x + (points[i + 1]!.x - points[i]!.x) * f,
        y: points[i]!.y + (points[i + 1]!.y - points[i]!.y) * f,
      };
    }
    target -= lens[i]!;
  }
  return points[points.length - 1]!;
}

function headingAt(points: Pt[], t: number): number {
  const a = pointAt(points, t);
  const b = pointAt(points, Math.min(1, t + 0.02));
  if (a.x === b.x && a.y === b.y) return 0;
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/** Plano de rota a partir da posição real do equipamento até o centro do setor destino */
function buildPlan(e: Pick<Equipment, "sectorId" | "x" | "y">, destination: Sector, blockages: Blockage[]) {
  const from = sectorById.get(e.sectorId);
  if (!from) return null;
  const base = findRoute(from.node, destination.node, blockages);
  if (!base) return null;
  return withStart(base, { x: e.x, y: e.y });
}

function makeBackgroundRoute(
  e: Pick<Equipment, "id" | "sectorId" | "x" | "y">,
  toSectorId: string,
  blockages: Blockage[],
  id = uid("bg"),
): ActiveRoute | null {
  const dest = sectorById.get(toSectorId);
  if (!dest) return null;
  const plan = buildPlan(e, dest, blockages);
  if (!plan) return null;
  return {
    id,
    equipmentId: e.id,
    fromSectorId: e.sectorId,
    toSectorId,
    activity: "Operação de rotina",
    notes: "",
    plan,
    progress: 0,
    durationMs: durationFor(plan),
    background: true,
  };
}

const initialNotifications: AppNotification[] = [
  {
    id: "n1",
    kind: "congestionamento",
    title: "Caminhão 03",
    detail: "Área congestionada no cruzamento central",
    time: "08:20",
    severity: "danger",
    read: false,
  },
  {
    id: "n2",
    kind: "manutencao",
    title: "Guindaste 01",
    detail: "Manutenção preventiva pendente",
    time: "08:45",
    severity: "warn",
    read: false,
  },
  {
    id: "n3",
    kind: "combustivel",
    title: "Empilhadeira 02",
    detail: "Combustível baixo (18%)",
    time: "09:10",
    severity: "warn",
    read: false,
  },
  {
    id: "n4",
    kind: "disponibilidade",
    title: "Pá Carregadeira 01",
    detail: "Equipamento disponível no Pátio de Brita",
    time: "09:25",
    severity: "info",
    read: true,
  },
];

/** Tráfego de fundo determinístico (igual no servidor e no cliente) */
function seedRoutes(): ActiveRoute[] {
  const out: ActiveRoute[] = [];
  const seeds: [string, string, string][] = [
    ["cam-01", "terminal-cont", "bg-1"],
    ["cam-03", "portaria", "bg-2"],
  ];
  for (const [eqId, to, id] of seeds) {
    const e = initialEquipment.find((x) => x.id === eqId);
    if (!e) continue;
    const r = makeBackgroundRoute(e, to, initialBlockages, id);
    if (r) out.push(r);
  }
  return out;
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [blockages] = useState<Blockage[]>(initialBlockages);
  const [maintenance] = useState<MaintenanceItem[]>(initialMaintenance);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  const [activeRoutes, setActiveRoutes] = useState<ActiveRoute[]>(seedRoutes);
  const [suggestion, setSuggestion] = useState<RouteSuggestion | null>(null);
  const [focusRouteId, setFocusRouteId] = useState<string | null>(null);
  const [lastCompleted, setLastCompleted] = useState<ActiveRoute | null>(null);

  const routesRef = useRef<ActiveRoute[]>(activeRoutes);
  const blockagesRef = useRef(blockages);
  blockagesRef.current = blockages;

  const commitRoutes = useCallback((next: ActiveRoute[]) => {
    routesRef.current = next;
    setActiveRoutes(next);
  }, []);

  const notify = useCallback((n: Omit<AppNotification, "id" | "time" | "read">) => {
    setNotifications((prev) => [{ ...n, id: uid("n"), time: now(), read: false }, ...prev]);
  }, []);

  // tick da simulação
  useEffect(() => {
    const t = setInterval(() => {
      const prev = routesRef.current;
      if (prev.length === 0) return;

      const next: ActiveRoute[] = [];
      const finished: ActiveRoute[] = [];
      for (const r of prev) {
        const progress = r.progress + TICK_MS / r.durationMs;
        if (progress >= 1) finished.push(r);
        else next.push({ ...r, progress });
      }

      // tráfego de fundo continua para outro setor
      for (const f of finished) {
        if (!f.background) continue;
        const candidates = sectors.filter((s) => s.id !== f.toSectorId && s.kind !== "oficina");
        const dest = candidates[Math.floor(Math.random() * candidates.length)]!;
        const end = f.plan.points[f.plan.points.length - 1] ?? nodeById.get(dest.node)!;
        const r = makeBackgroundRoute(
          { id: f.equipmentId, sectorId: f.toSectorId, x: end.x, y: end.y },
          dest.id,
          blockagesRef.current,
        );
        if (r) next.push(r);
      }

      commitRoutes(next);

      const routeBy = new Map(next.map((r) => [r.equipmentId, r]));
      const doneBy = new Map(finished.filter((f) => !f.background).map((f) => [f.equipmentId, f]));

      setEquipment((eqs) => {
        const moved = eqs.map((e) => {
          const r = routeBy.get(e.id);
          if (r) {
            const p = pointAt(r.plan.points, r.progress);
            return {
              ...e,
              status: "em-uso" as EquipmentStatus,
              sectorId: r.fromSectorId,
              x: p.x,
              y: p.y,
              heading: headingAt(r.plan.points, r.progress),
            };
          }
          const d = doneBy.get(e.id);
          if (d) {
            return {
              ...e,
              status: "livre" as EquipmentStatus,
              sectorId: d.toSectorId,
              operator: "Não alocado",
              fuel: Math.max(5, e.fuel - 4),
              hours: e.hours + 1,
              heading: undefined,
            };
          }
          return e;
        });
        return finished.length > 0 ? layoutIdle(moved, new Set(routeBy.keys())) : moved;
      });

      for (const f of finished) {
        if (f.background) continue;
        const eqName = initialEquipment.find((e) => e.id === f.equipmentId)?.name ?? "Equipamento";
        const dest = sectorById.get(f.toSectorId)?.name ?? "destino";
        setLastCompleted({ ...f, progress: 1 });
        notify({
          kind: "conclusao",
          title: eqName,
          detail: `Rota concluída em ${dest}`,
          severity: "info",
        });
        notify({
          kind: "disponibilidade",
          title: eqName,
          detail: `Equipamento disponível em ${dest}`,
          severity: "info",
        });
      }
    }, TICK_MS);
    return () => clearInterval(t);
  }, [commitRoutes, notify]);

  const planRoute = useCallback<SimContextValue["planRoute"]>(
    (input) => {
      const destination = sectorById.get(input.toSectorId);
      if (!destination) return { ok: false, message: "Destino inválido" };

      const candidates = equipment.filter(
        (e) =>
          e.status === "livre" &&
          (input.equipmentId ? e.id === input.equipmentId : true) &&
          (input.type ? e.type === input.type : true),
      );
      if (candidates.length === 0)
        return { ok: false, message: "Nenhum equipamento livre para este pedido" };

      const planned = candidates
        .map((e) => ({ e, plan: buildPlan(e, destination, blockages) }))
        .filter((c): c is { e: Equipment; plan: RoutePlan } => c.plan !== null);
      if (planned.length === 0)
        return { ok: false, message: "Não foi possível calcular a rota" };

      // prioriza equipamentos que precisam se deslocar; quem já está no setor não gera rota
      const movers = planned.filter((c) => c.e.sectorId !== destination.id);
      if (movers.length === 0) {
        const name = planned[0]!.e.name;
        return {
          ok: false,
          message: `${name} já está em ${destination.name}. Escolha outro destino ou equipamento.`,
        };
      }
      const best = movers.reduce((a, b) => (b.plan.distance < a.plan.distance ? b : a));

      if (best.plan.blocked) {
        notify({
          kind: "bloqueio",
          title: "CAMINHO BLOQUEADO",
          detail: `${best.plan.blockReason}. Rota alternativa calculada para ${destination.name}.`,
          severity: "danger",
        });
      }

      setSuggestion({
        equipmentId: best.e.id,
        fromSectorId: best.e.sectorId,
        toSectorId: input.toSectorId,
        activity: input.activity,
        notes: input.notes,
        plan: best.plan,
      });
      setLastCompleted(null);
      return { ok: true };
    },
    [equipment, blockages, notify],
  );

  const startRoute = useCallback(() => {
    if (!suggestion) return null;
    const id = uid("r");
    const route: ActiveRoute = {
      ...suggestion,
      id,
      progress: 0,
      durationMs: durationFor(suggestion.plan),
      background: false,
    };
    commitRoutes([...routesRef.current, route]);
    setEquipment((prev) =>
      prev.map((e) =>
        e.id === suggestion.equipmentId
          ? {
              ...e,
              status: "em-uso" as EquipmentStatus,
              operator: "Operador de plantão",
              heading: headingAt(suggestion.plan.points, 0),
            }
          : e,
      ),
    );
    setFocusRouteId(id);
    setLastCompleted(null);
    setSuggestion(null);
    return id;
  }, [suggestion, commitRoutes]);

  const cancelRoute = useCallback(
    (id: string) => {
      const r = routesRef.current.find((x) => x.id === id);
      commitRoutes(routesRef.current.filter((x) => x.id !== id));
      if (!r) return;
      setEquipment((eqs) => {
        const moving = new Set(routesRef.current.map((x) => x.equipmentId));
        const reset = eqs.map((e) =>
          e.id === r.equipmentId
            ? {
                ...e,
                status: "livre" as EquipmentStatus,
                operator: "Não alocado",
                sectorId: r.fromSectorId,
                heading: undefined,
              }
            : e,
        );
        return layoutIdle(reset, moving);
      });
      setFocusRouteId((f) => (f === id ? null : f));
    },
    [commitRoutes],
  );

  const value = useMemo<SimContextValue>(() => {
    const userRoutes = activeRoutes.filter((r) => !r.background);
    const focusRoute =
      activeRoutes.find((r) => r.id === focusRouteId) ?? userRoutes[userRoutes.length - 1];
    return {
      equipment,
      blockages,
      notifications,
      maintenance,
      activeRoutes,
      suggestion,
      focusRoute,
      lastCompleted,
      planRoute,
      startRoute,
      cancelRoute,
      clearSuggestion: () => setSuggestion(null),
      dismissCompleted: () => setLastCompleted(null),
      markAllRead: () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      routeOf: (equipmentId: string) => activeRoutes.find((r) => r.equipmentId === equipmentId),
    };
  }, [
    equipment,
    blockages,
    notifications,
    maintenance,
    activeRoutes,
    suggestion,
    focusRouteId,
    lastCompleted,
    planRoute,
    startRoute,
    cancelRoute,
  ]);

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim precisa estar dentro de SimulationProvider");
  return ctx;
}
