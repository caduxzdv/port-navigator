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
  sectorById,
  type Blockage,
  type Equipment,
  type EquipmentStatus,
  type MaintenanceItem,
} from "./port-data";
import { findRoute, type RoutePlan } from "./routing";

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
}

interface SimContextValue {
  equipment: Equipment[];
  blockages: Blockage[];
  notifications: AppNotification[];
  maintenance: MaintenanceItem[];
  activeRoutes: ActiveRoute[];
  suggestion: RouteSuggestion | null;
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
  markAllRead: () => void;
  routeOf: (equipmentId: string) => ActiveRoute | undefined;
}

const SimContext = createContext<SimContextValue | null>(null);

const now = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

let seq = 0;
const uid = (p: string) => `${p}-${Date.now()}-${seq++}`;

function pointAt(points: { x: number; y: number }[], t: number) {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0]!;
  const lens: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(
      points[i + 1]!.x - points[i]!.x,
      points[i + 1]!.y - points[i]!.y,
    );
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

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [blockages] = useState<Blockage[]>(initialBlockages);
  const [maintenance] = useState<MaintenanceItem[]>(initialMaintenance);
  const [notifications, setNotifications] =
    useState<AppNotification[]>(initialNotifications);
  const [activeRoutes, setActiveRoutes] = useState<ActiveRoute[]>([]);
  const [suggestion, setSuggestion] = useState<RouteSuggestion | null>(null);
  const routesRef = useRef(activeRoutes);
  routesRef.current = activeRoutes;

  const notify = useCallback((n: Omit<AppNotification, "id" | "time" | "read">) => {
    setNotifications((prev) => [
      { ...n, id: uid("n"), time: now(), read: false },
      ...prev,
    ]);
  }, []);

  // tick da simulação: 1 minuto de rota = 2 segundos reais
  useEffect(() => {
    const t = setInterval(() => {
      const finished: ActiveRoute[] = [];
      setActiveRoutes((prev) => {
        const next: ActiveRoute[] = [];
        for (const r of prev) {
          const step = 1 / Math.max(1, r.plan.minutes * 2);
          const progress = r.progress + step;
          if (progress >= 1) finished.push(r);
          else next.push({ ...r, progress });
        }
        return next;
      });

      setEquipment((prev) =>
        prev.map((e) => {
          const r = routesRef.current.find((x) => x.equipmentId === e.id);
          const done = finished.find((x) => x.equipmentId === e.id);
          if (done) {
            const s = sectorById.get(done.toSectorId)!;
            return {
              ...e,
              status: "livre" as EquipmentStatus,
              sectorId: done.toSectorId,
              operator: "Não alocado",
              fuel: Math.max(5, e.fuel - 4),
              hours: e.hours + 1,
              x: s.x + s.w / 2,
              y: s.y + s.h / 2,
            };
          }
          if (r) {
            const p = pointAt(r.plan.points, r.progress);
            return { ...e, x: p.x, y: p.y };
          }
          return e;
        }),
      );

      for (const f of finished) {
        const eqName =
          initialEquipment.find((e) => e.id === f.equipmentId)?.name ?? "Equipamento";
        notify({
          kind: "conclusao",
          title: eqName,
          detail: `Rota concluída em ${sectorById.get(f.toSectorId)?.name}`,
          severity: "info",
        });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [notify]);

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

      let best: { e: Equipment; plan: RoutePlan } | null = null;
      for (const e of candidates) {
        const fromSector = sectorById.get(e.sectorId)!;
        const plan = findRoute(fromSector.node, destination.node, blockages);
        if (!plan) continue;
        if (!best || plan.distance < best.plan.distance) best = { e, plan };
      }
      if (!best) return { ok: false, message: "Não foi possível calcular a rota" };

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
      return { ok: true };
    },
    [equipment, blockages, notify],
  );

  const startRoute = useCallback(() => {
    if (!suggestion) return null;
    const id = uid("r");
    setActiveRoutes((prev) => [...prev, { ...suggestion, id, progress: 0 }]);
    setEquipment((prev) =>
      prev.map((e) =>
        e.id === suggestion.equipmentId
          ? { ...e, status: "em-uso" as EquipmentStatus, operator: "Operador de plantão" }
          : e,
      ),
    );
    setSuggestion(null);
    return id;
  }, [suggestion]);

  const cancelRoute = useCallback((id: string) => {
    setActiveRoutes((prev) => {
      const r = prev.find((x) => x.id === id);
      if (r) {
        setEquipment((eqs) =>
          eqs.map((e) => {
            if (e.id !== r.equipmentId) return e;
            const s = sectorById.get(r.fromSectorId)!;
            return {
              ...e,
              status: "livre" as EquipmentStatus,
              operator: "Não alocado",
              x: s.x + s.w / 2,
              y: s.y + s.h / 2,
            };
          }),
        );
      }
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const value = useMemo<SimContextValue>(
    () => ({
      equipment,
      blockages,
      notifications,
      maintenance,
      activeRoutes,
      suggestion,
      planRoute,
      startRoute,
      cancelRoute,
      clearSuggestion: () => setSuggestion(null),
      markAllRead: () =>
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true }))),
      routeOf: (equipmentId: string) =>
        activeRoutes.find((r) => r.equipmentId === equipmentId),
    }),
    [
      equipment,
      blockages,
      notifications,
      maintenance,
      activeRoutes,
      suggestion,
      planRoute,
      startRoute,
      cancelRoute,
    ],
  );

  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim precisa estar dentro de SimulationProvider");
  return ctx;
}
