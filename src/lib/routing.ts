import { edges, nodeById, type Blockage } from "./port-data";

export interface RoutePlan {
  nodes: string[];
  points: { x: number; y: number }[];
  distance: number;
  minutes: number;
  blocked: boolean;
  blockReason?: string;
}

const dist = (a: string, b: string) => {
  const na = nodeById.get(a)!;
  const nb = nodeById.get(b)!;
  return Math.hypot(na.x - nb.x, na.y - nb.y);
};

const key = (a: string, b: string) => [a, b].sort().join("|");

function buildAdjacency(blockedKeys: Set<string>) {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    if (blockedKeys.has(key(e.a, e.b))) continue;
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a)!.push(e.b);
    adj.get(e.b)!.push(e.a);
  }
  return adj;
}

function dijkstra(from: string, to: string, blockedKeys: Set<string>): string[] | null {
  const adj = buildAdjacency(blockedKeys);
  const d = new Map<string, number>([[from, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();

  while (true) {
    let cur: string | null = null;
    let best = Infinity;
    for (const [n, v] of d) {
      if (!visited.has(n) && v < best) {
        best = v;
        cur = n;
      }
    }
    if (cur === null) return null;
    if (cur === to) break;
    visited.add(cur);
    for (const nb of adj.get(cur) ?? []) {
      if (visited.has(nb)) continue;
      const alt = best + dist(cur, nb);
      if (alt < (d.get(nb) ?? Infinity)) {
        d.set(nb, alt);
        prev.set(nb, cur);
      }
    }
  }

  const path: string[] = [to];
  let c = to;
  while (prev.has(c)) {
    c = prev.get(c)!;
    path.unshift(c);
  }
  return path;
}

/** 1 unidade do mapa ≈ 1,2 metro; velocidade média 12 km/h */
export const UNIT_TO_METERS = 1.2;
const SPEED_M_PER_MIN = (12 * 1000) / 60;

function toPlan(path: string[], blocked: boolean, blockReason?: string): RoutePlan {
  let d = 0;
  for (let i = 0; i < path.length - 1; i++) d += dist(path[i], path[i + 1]);
  const meters = d * UNIT_TO_METERS;
  return {
    nodes: path,
    points: path.map((id) => {
      const n = nodeById.get(id)!;
      return { x: n.x, y: n.y };
    }),
    distance: Math.round(meters),
    minutes: Math.max(1, Math.round(meters / SPEED_M_PER_MIN)),
    blocked,
    blockReason,
  };
}

/**
 * Calcula a melhor rota. Se o caminho ideal cruzar um bloqueio, devolve a rota
 * alternativa marcada com blocked = true e o motivo do bloqueio.
 */
export function findRoute(
  from: string,
  to: string,
  blockages: Blockage[],
): RoutePlan | null {
  if (from === to) return toPlan([from], false);
  const ideal = dijkstra(from, to, new Set());
  const blockedKeys = new Set(blockages.map((b) => key(b.a, b.b)));

  let idealUsesBlockage: Blockage | undefined;
  if (ideal) {
    for (let i = 0; i < ideal.length - 1; i++) {
      const k = key(ideal[i], ideal[i + 1]);
      const hit = blockages.find((b) => key(b.a, b.b) === k);
      if (hit) {
        idealUsesBlockage = hit;
        break;
      }
    }
  }

  const safe = dijkstra(from, to, blockedKeys);
  if (!safe) return ideal ? toPlan(ideal, false) : null;
  return toPlan(safe, Boolean(idealUsesBlockage), idealUsesBlockage?.reason);
}
