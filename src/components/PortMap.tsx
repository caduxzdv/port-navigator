import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, Crosshair } from "lucide-react";
import {
  MAP_H,
  MAP_W,
  edges,
  nodeById,
  sectors,
  type Equipment,
  type EquipmentStatus,
  type SectorKind,
} from "@/lib/port-data";
import { EquipmentIcon } from "@/components/EquipmentIcon";
import { useSim } from "@/lib/simulation";
import { cn } from "@/lib/utils";

const statusColor: Record<EquipmentStatus, string> = {
  livre: "var(--free)",
  "em-uso": "var(--busy)",
  manutencao: "var(--danger)",
};

const sectorFill: Record<SectorKind, string> = {
  cais: "oklch(0.26 0.045 245)",
  patio: "oklch(0.235 0.02 95)",
  armazem: "oklch(0.235 0.012 250)",
  descarga: "oklch(0.245 0.03 70)",
  conteineres: "oklch(0.24 0.035 160)",
  oficina: "oklch(0.25 0.05 25)",
  portaria: "oklch(0.24 0.02 300)",
};

interface Props {
  className?: string;
  routePoints?: { x: number; y: number }[];
  routeBlocked?: boolean;
  highlightEquipmentId?: string;
  statusFilter?: EquipmentStatus | "todos";
  showControls?: boolean;
  /** desenha também todas as rotas em andamento, em tom discreto */
  showActiveRoutes?: boolean;
  onSelectEquipment?: (e: Equipment) => void;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function PortMap({
  className,
  routePoints,
  routeBlocked,
  highlightEquipmentId,
  statusFilter = "todos",
  showControls = true,
  showActiveRoutes = false,
  onSelectEquipment,
}: Props) {
  const { equipment, blockages, activeRoutes } = useSim();
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    const v = viewRef.current;
    const next = clamp(v.z * factor, 0.6, 4);
    const k = next / v.z;
    setView({ z: next, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const rect = el.getBoundingClientRect();
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-dy * 0.0015));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const zoomButton = (factor: number) => {
    const el = containerRef.current;
    if (!el) return;
    zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor);
  };

  const visible = equipment.filter(
    (e) => statusFilter === "todos" || e.status === statusFilter,
  );

  const blockedSegments = blockages.map((b) => ({
    ...b,
    a: nodeById.get(b.a)!,
    b2: nodeById.get(b.b)!,
  }));

  const ghostRoutes = showActiveRoutes ? activeRoutes : [];
  const dest = routePoints?.[routePoints.length - 1];

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative touch-none overflow-hidden rounded-2xl border border-border bg-panel select-none",
        className,
      )}
      onPointerDown={(e) => {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        drag.current = { x: e.clientX, y: e.clientY, ox: view.x, oy: view.y };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const dx = e.clientX - d.x;
        const dy = e.clientY - d.y;
        setView((v) => ({ ...v, x: d.ox + dx, y: d.oy + dy }));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerLeave={() => (drag.current = null)}
    >
      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <pattern id="water" width="26" height="26" patternUnits="userSpaceOnUse">
            <rect width="26" height="26" fill="oklch(0.24 0.05 245)" />
            <path
              d="M0 13 q6.5 -5 13 0 t13 0"
              stroke="oklch(0.32 0.07 245)"
              fill="none"
              strokeWidth="1.4"
            />
          </pattern>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M40 0 H0 V40"
              fill="none"
              stroke="oklch(0.18 0.006 260)"
              strokeWidth="1"
            />
          </pattern>
          <filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g
          transform={`translate(${view.x} ${view.y}) scale(${view.z})`}
          style={{ transition: drag.current ? "none" : "transform 120ms ease-out" }}
        >
          <rect width={MAP_W} height={MAP_H} fill="var(--panel)" />
          <rect width={MAP_W} height={MAP_H} fill="url(#grid)" />
          <rect width={MAP_W} height="26" fill="url(#water)" />
          <rect y={MAP_H - 30} width={MAP_W} height="30" fill="url(#water)" />

          {/* vias internas */}
          {edges.map((e, i) => {
            const a = nodeById.get(e.a)!;
            const b = nodeById.get(e.b)!;
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="oklch(0.28 0.008 260)"
                strokeWidth="18"
                strokeLinecap="round"
              />
            );
          })}
          {edges.map((e, i) => {
            const a = nodeById.get(e.a)!;
            const b = nodeById.get(e.b)!;
            return (
              <line
                key={`d${i}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="oklch(0.45 0.01 260)"
                strokeWidth="1.6"
                strokeDasharray="10 14"
              />
            );
          })}

          {/* setores */}
          {sectors.map((s) => (
            <g key={s.id}>
              <rect
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                rx="16"
                fill={sectorFill[s.kind]}
                stroke="oklch(0.42 0.02 250)"
                strokeWidth="1.5"
              />
              <rect
                x={s.x}
                y={s.y}
                width={s.w}
                height="26"
                rx="13"
                fill="oklch(0.18 0.01 250)"
                opacity="0.75"
              />
              <text
                x={s.x + 12}
                y={s.y + 18}
                fill="oklch(0.86 0.02 250)"
                fontSize="13"
                fontWeight="700"
                letterSpacing="0.4"
              >
                {s.name.toUpperCase()}
              </text>
            </g>
          ))}

          {/* rotas em andamento (fundo) */}
          {ghostRoutes.map((r) => (
            <polyline
              key={r.id}
              points={r.plan.points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke="var(--free)"
              strokeOpacity="0.28"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="14 12"
            />
          ))}

          {/* bloqueios */}
          {blockedSegments.map((b) => (
            <g key={b.id}>
              <line
                x1={b.a.x}
                y1={b.a.y}
                x2={b.b2.x}
                y2={b.b2.y}
                stroke="var(--danger)"
                strokeWidth="10"
                strokeDasharray="14 10"
                opacity="0.9"
              />
              <g transform={`translate(${(b.a.x + b.b2.x) / 2} ${(b.a.y + b.b2.y) / 2})`}>
                <rect
                  x="-46"
                  y="-13"
                  width="92"
                  height="26"
                  rx="13"
                  fill="var(--danger)"
                />
                <text
                  textAnchor="middle"
                  y="5"
                  fontSize="12"
                  fontWeight="800"
                  fill="oklch(0.16 0.006 260)"
                >
                  BLOQUEADO
                </text>
              </g>
            </g>
          ))}

          {/* rota em destaque */}
          {routePoints && routePoints.length > 1 && (
            <g filter="url(#routeGlow)">
              <polyline
                points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={routeBlocked ? "var(--busy)" : "var(--free)"}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="20 14"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="34"
                  to="0"
                  dur="0.9s"
                  repeatCount="indefinite"
                />
              </polyline>
            </g>
          )}
          {routePoints && routePoints.length > 1 && dest && (
            <>
              <circle cx={routePoints[0]!.x} cy={routePoints[0]!.y} r="9" fill="var(--free)" />
              <g transform={`translate(${dest.x} ${dest.y})`}>
                <path
                  d="M0 6 C -12 -8 -11 -22 0 -22 C 11 -22 12 -8 0 6 Z"
                  fill="var(--gold)"
                />
                <circle cy="-14" r="4.5" fill="oklch(0.16 0.006 260)" />
              </g>
            </>
          )}

          {/* equipamentos */}
          {visible.map((e) => {
            const active = e.id === highlightEquipmentId;
            const color = statusColor[e.status];
            return (
              <g
                key={e.id}
                transform={`translate(${e.x} ${e.y})`}
                onClick={() => onSelectEquipment?.(e)}
                className={onSelectEquipment ? "cursor-pointer" : undefined}
              >
                {active && (
                  <circle r="26" fill="none" stroke={color} strokeWidth="2">
                    <animate
                      attributeName="r"
                      values="20;32;20"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <rect
                  x="-18"
                  y="-18"
                  width="36"
                  height="36"
                  rx="11"
                  fill="oklch(0.17 0.006 260)"
                  stroke={color}
                  strokeWidth="2.5"
                />
                <g transform="translate(-10 -10)" color={color}>
                  <EquipmentIcon type={e.type} className="h-5 w-5" />
                </g>
                {e.heading !== undefined && (
                  <circle cx="14" cy="-14" r="4" fill="var(--free)">
                    <animate
                      attributeName="opacity"
                      values="1;0.2;1"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <g transform="translate(0 32)">
                  <rect
                    x={-(e.name.length * 3.4 + 8)}
                    y="-11"
                    width={e.name.length * 6.8 + 16}
                    height="18"
                    rx="9"
                    fill="oklch(0.14 0.006 260)"
                    opacity="0.85"
                  />
                  <text
                    textAnchor="middle"
                    y="2"
                    fontSize="11"
                    fontWeight="600"
                    fill="oklch(0.88 0.01 250)"
                  >
                    {e.name}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>

      {showControls && (
        <div className="absolute right-3 bottom-3 flex flex-col gap-2">
          <button
            aria-label="Aproximar"
            onClick={() => zoomButton(1.3)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card/90 text-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            aria-label="Afastar"
            onClick={() => zoomButton(1 / 1.3)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card/90 text-foreground"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            aria-label="Centralizar"
            onClick={() => setView({ z: 1, x: 0, y: 0 })}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card/90 text-foreground"
          >
            <Crosshair className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-xl bg-card/85 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-free" /> Disponível
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-busy" /> Em uso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-danger" /> Manutenção
        </span>
      </div>
    </div>
  );
}
