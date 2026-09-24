export type EquipmentType =
  | "Caminhão Basculante"
  | "Guindaste"
  | "Empilhadeira"
  | "Pá Carregadeira"
  | "Trator"
  | "Reach Stacker";

export type EquipmentStatus = "livre" | "em-uso" | "manutencao";

export type SectorKind =
  | "cais"
  | "patio"
  | "armazem"
  | "descarga"
  | "conteineres"
  | "oficina"
  | "portaria";

export interface Sector {
  id: string;
  name: string;
  short: string;
  kind: SectorKind;
  x: number;
  y: number;
  w: number;
  h: number;
  node: string;
}

export interface MapNode {
  id: string;
  x: number;
  y: number;
  label?: string;
}

export interface Edge {
  a: string;
  b: string;
}

export interface Blockage {
  id: string;
  a: string;
  b: string;
  reason: string;
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  sectorId: string;
  fuel: number;
  hours: number;
  plate: string;
  capacity: string;
  operator: string;
  nextMaintenance: string;
  x: number;
  y: number;
  /** direção (graus) enquanto se move; undefined quando parado */
  heading?: number | undefined;
}

/** Planta interna fictícia do porto — espaço 1000 x 700 */
export const MAP_W = 1000;
export const MAP_H = 700;

const XS = [120, 380, 640, 900];
const YS = [120, 330, 560];

export const nodes: MapNode[] = [];
for (const x of XS) {
  for (const y of YS) {
    nodes.push({ id: `j-${x}-${y}`, x, y });
  }
}

export const sectors: Sector[] = [
  { id: "cais-norte", name: "Cais Norte", short: "Cais", kind: "cais", x: 60, y: 38, w: 880, h: 58, node: "n-cais-norte" },
  { id: "patio-areia", name: "Pátio de Areia", short: "Areia", kind: "patio", x: 30, y: 160, w: 200, h: 130, node: "n-patio-areia" },
  { id: "patio-brita", name: "Pátio de Brita", short: "Brita", kind: "patio", x: 30, y: 400, w: 200, h: 130, node: "n-patio-brita" },
  { id: "armazem-1", name: "Armazém 1", short: "Arm. 1", kind: "armazem", x: 290, y: 160, w: 180, h: 130, node: "n-armazem-1" },
  { id: "armazem-2", name: "Armazém 2", short: "Arm. 2", kind: "armazem", x: 290, y: 400, w: 180, h: 130, node: "n-armazem-2" },
  { id: "setor-b", name: "Setor B - Área de Descarga", short: "Setor B", kind: "descarga", x: 545, y: 160, w: 210, h: 130, node: "n-setor-b" },
  { id: "terminal-cont", name: "Terminal de Contêineres", short: "Contêineres", kind: "conteineres", x: 545, y: 400, w: 260, h: 130, node: "n-terminal-cont" },
  { id: "oficina", name: "Oficina", short: "Oficina", kind: "oficina", x: 830, y: 160, w: 140, h: 130, node: "n-oficina" },
  { id: "portaria", name: "Portaria e Balança", short: "Portaria", kind: "portaria", x: 790, y: 600, w: 180, h: 80, node: "n-portaria" },
];

for (const s of sectors) {
  nodes.push({
    id: s.node,
    x: s.x + s.w / 2,
    y: s.y + s.h / 2,
    label: s.name,
  });
}

export const edges: Edge[] = [];
// vias horizontais
for (const y of YS) {
  for (let i = 0; i < XS.length - 1; i++) {
    edges.push({ a: `j-${XS[i]}-${y}`, b: `j-${XS[i + 1]}-${y}` });
  }
}
// vias verticais
for (const x of XS) {
  for (let i = 0; i < YS.length - 1; i++) {
    edges.push({ a: `j-${x}-${YS[i]}`, b: `j-${x}-${YS[i + 1]}` });
  }
}
// ramais para os setores
const spurs: [string, string][] = [
  ["n-cais-norte", "j-380-120"],
  ["n-cais-norte", "j-640-120"],
  ["n-patio-areia", "j-120-120"],
  ["n-patio-areia", "j-120-330"],
  ["n-patio-brita", "j-120-330"],
  ["n-patio-brita", "j-120-560"],
  ["n-armazem-1", "j-380-120"],
  ["n-armazem-1", "j-380-330"],
  ["n-armazem-2", "j-380-330"],
  ["n-armazem-2", "j-380-560"],
  ["n-setor-b", "j-640-120"],
  ["n-setor-b", "j-640-330"],
  ["n-terminal-cont", "j-640-330"],
  ["n-terminal-cont", "j-640-560"],
  ["n-oficina", "j-900-120"],
  ["n-oficina", "j-900-330"],
  ["n-portaria", "j-900-560"],
];
for (const [a, b] of spurs) edges.push({ a, b });

export const nodeById = new Map(nodes.map((n) => [n.id, n]));
export const sectorById = new Map(sectors.map((s) => [s.id, s]));

export function sectorOfNode(nodeId: string): Sector | undefined {
  return sectors.find((s) => s.node === nodeId);
}

export const initialBlockages: Blockage[] = [
  {
    id: "blk-1",
    a: "j-380-330",
    b: "j-640-330",
    reason: "Área congestionada - descarga em andamento",
  },
  {
    id: "blk-2",
    a: "j-640-560",
    b: "j-900-560",
    reason: "Manutenção de pavimento",
  },
];

function eq(
  id: string,
  name: string,
  type: EquipmentType,
  status: EquipmentStatus,
  sectorId: string,
  fuel: number,
  hours: number,
  plate: string,
  capacity: string,
  operator: string,
  nextMaintenance: string,
): Equipment {
  const s = sectorById.get(sectorId)!;
  return {
    id,
    name,
    type,
    status,
    sectorId,
    fuel,
    hours,
    plate,
    capacity,
    operator,
    nextMaintenance,
    x: s.x + s.w / 2,
    y: s.y + s.h / 2,
  };
}

export const initialEquipment: Equipment[] = [
  eq("cam-01", "Caminhão 01", "Caminhão Basculante", "em-uso", "patio-areia", 100, 92, "ABC-1D21", "18 m³", "Marcos Silva", "22/09/2026"),
  eq("cam-02", "Caminhão 02", "Caminhão Basculante", "livre", "setor-b", 80, 125, "ABC-1D23", "20 m³", "Não alocado", "15/09/2026"),
  eq("cam-03", "Caminhão 03", "Caminhão Basculante", "em-uso", "terminal-cont", 46, 210, "ABC-1D25", "20 m³", "Joana Prado", "30/09/2026"),
  eq("cam-04", "Caminhão 04", "Caminhão Basculante", "livre", "portaria", 92, 64, "ABC-1D27", "16 m³", "Não alocado", "10/10/2026"),
  eq("pa-01", "Pá Carregadeira 01", "Pá Carregadeira", "livre", "patio-brita", 100, 340, "PCL-2201", "3,2 m³", "Não alocado", "28/09/2026"),
  eq("pa-02", "Pá Carregadeira 02", "Pá Carregadeira", "manutencao", "oficina", 30, 512, "PCL-2202", "3,2 m³", "Não alocado", "06/09/2026"),
  eq("gui-01", "Guindaste 01", "Guindaste", "manutencao", "oficina", 12, 780, "GDT-3301", "40 t", "Não alocado", "08/09/2026"),
  eq("gui-02", "Guindaste 02", "Guindaste", "livre", "cais-norte", 74, 640, "GDT-3302", "50 t", "Não alocado", "18/10/2026"),
  eq("emp-01", "Empilhadeira 01", "Empilhadeira", "livre", "armazem-1", 90, 220, "EMP-4401", "2,5 t", "Não alocado", "12/10/2026"),
  eq("emp-02", "Empilhadeira 02", "Empilhadeira", "em-uso", "armazem-2", 18, 305, "EMP-4402", "3 t", "Carla Nunes", "25/09/2026"),
  eq("tra-01", "Trator 01", "Trator", "livre", "patio-brita", 68, 410, "TRA-5501", "—", "Não alocado", "02/11/2026"),
  eq("rs-01", "Reach Stacker 01", "Reach Stacker", "livre", "terminal-cont", 55, 288, "RST-6601", "45 t", "Não alocado", "19/09/2026"),
];

/**
 * Distribui os equipamentos parados dentro de cada setor, lado a lado,
 * para que os marcadores não se sobreponham no mapa. Equipamentos em
 * movimento (ids em `moving`) mantêm a posição atual.
 */
export function layoutIdle(eqs: Equipment[], moving: Set<string>): Equipment[] {
  const groups = new Map<string, Equipment[]>();
  for (const e of eqs) {
    if (moving.has(e.id)) continue;
    if (!groups.has(e.sectorId)) groups.set(e.sectorId, []);
    groups.get(e.sectorId)!.push(e);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [sid, list] of groups) {
    const s = sectorById.get(sid);
    if (!s) continue;
    list.sort((a, b) => a.id.localeCompare(b.id));
    const step = s.w / (list.length + 1);
    const y = s.kind === "cais" ? s.y + s.h * 0.55 : s.y + s.h * 0.64;
    list.forEach((e, i) => pos.set(e.id, { x: Math.round(s.x + step * (i + 1)), y }));
  }
  return eqs.map((e) => {
    const p = pos.get(e.id);
    if (!p || (p.x === e.x && p.y === e.y && e.heading === undefined)) return e;
    return { ...e, x: p.x, y: p.y, heading: undefined };
  });
}

for (const e of layoutIdle(initialEquipment, new Set())) {
  const target = initialEquipment.find((x) => x.id === e.id)!;
  target.x = e.x;
  target.y = e.y;
}

export const equipmentTypes: EquipmentType[] = [
  "Caminhão Basculante",
  "Guindaste",
  "Empilhadeira",
  "Pá Carregadeira",
  "Trator",
  "Reach Stacker",
];

export const statusLabel: Record<EquipmentStatus, string> = {
  livre: "Disponível",
  "em-uso": "Em uso",
  manutencao: "Manutenção",
};

export const activities = [
  "Transporte de carga",
  "Descarga de material",
  "Movimentação de contêiner",
  "Abastecimento de pátio",
  "Apoio operacional",
];

export interface MaintenanceItem {
  id: string;
  equipmentId: string;
  description: string;
  state: "necessaria" | "agendada" | "concluida";
  date: string;
}

export const initialMaintenance: MaintenanceItem[] = [
  { id: "m1", equipmentId: "gui-01", description: "Troca de cabo de aço e revisão hidráulica", state: "necessaria", date: "08/09/2026" },
  { id: "m2", equipmentId: "pa-02", description: "Reparo no sistema de freios", state: "necessaria", date: "06/09/2026" },
  { id: "m3", equipmentId: "cam-02", description: "Revisão preventiva 500h", state: "agendada", date: "15/09/2026" },
  { id: "m4", equipmentId: "rs-01", description: "Troca de óleo e filtros", state: "agendada", date: "19/09/2026" },
  { id: "m5", equipmentId: "emp-02", description: "Troca de bateria", state: "agendada", date: "25/09/2026" },
  { id: "m6", equipmentId: "cam-01", description: "Alinhamento e balanceamento", state: "concluida", date: "28/08/2026" },
  { id: "m7", equipmentId: "gui-02", description: "Inspeção estrutural anual", state: "concluida", date: "20/08/2026" },
];

export const productivity = [
  { dia: "Seg", horas: 48, atividades: 22, espera: 6, combustivel: 310 },
  { dia: "Ter", horas: 54, atividades: 26, espera: 4, combustivel: 350 },
  { dia: "Qua", horas: 41, atividades: 19, espera: 9, combustivel: 268 },
  { dia: "Qui", horas: 59, atividades: 31, espera: 5, combustivel: 390 },
  { dia: "Sex", horas: 62, atividades: 34, espera: 3, combustivel: 405 },
  { dia: "Sáb", horas: 37, atividades: 15, espera: 7, combustivel: 240 },
];
