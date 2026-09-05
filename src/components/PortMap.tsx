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
} from "@/lib/port-data";
import { useSim } from "@/lib/simulation";
import { cn } from "@/lib/utils";

const statusColor: Record<EquipmentStatus, string> = {
  livre: "var(--free)",
  "em-uso": "var(--busy)",
  manutencao: "var(--danger)",
};

interface Props {
  className?: string;
  routePoints?: { x: number; y: number }[];
  routeBlocked?: boolean;
  highlightEquipmentId?: string;
  statusFilter?: EquipmentStatus | "todos";
  showControls?: boolean;
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
  onSelectEquipment,
}: Props) {
  const { equipment, blockages } = useSim();
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ z: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    const v = viewRef.current;
    const next = clamp(v.z * factor, 0.6, 4);
    const k = next / v.z;
    setView({
      z: next,
      x: px - (px - v.x) * k,
      y: py - (py - v.y) * k,
    });
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
              stroke="oklch(0.3 0.06 245)"
              fill="none"
              strokeWidth="1.4"
            />
          </pattern>
        </defs>
        <g
          transform={`translate(${view.x} ${view.y}) scale(${view.z})`}
          style={{ transition: drag.current ? "none" : "transform 120ms ease-out" }}
        >
          <rect width={MAP_W} height={MAP_H} fill="var(--panel)" />
          <rect width={MAP_W} height="24" fill="url(#water)" />
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
                stroke="oklch(0.3 0.008 260)"
                strokeWidth="16"
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
                stroke="oklch(0.42 0.01 260)"
                strokeWidth="1.5"
                strokeDasharray="10 12"
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
                rx="14"
                fill="oklch(0.23 0.012 250)"
                stroke="oklch(0.36 0.02 250)"
                strokeWidth="1.5"
              />
              <text
                x={s.x + 12}
                y={s.y + 24}
                fill="oklch(0.78 0.02 250)"
                fontSize="15"
                fontWeight="600"
              >
                {s.name}
              </text>
            </g>
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
                strokeWidth="8"
                strokeDasharray="14 10"
                opacity="0.85"
              />
              <circle
                cx={(b.a.x + b.b2.x) / 2}
                cy={(b.a.y + b.b2.y) / 2}
                r="13"
                fill="var(--danger)"
              />
              <text
                x={(b.a.x + b.b2.x) / 2}
                y={(b.a.y + b.b2.y) / 2 + 6}
                textAnchor="middle"
                fontSize="17"
                fontWeight="700"
                fill="oklch(0.16 0.006 260)"
              >
                !
              </text>
            </g>
          ))}

          {/* rota */}
          {routePoints && routePoints.length > 1 && (
            <polyline
              points={routePoints.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={routeBlocked ? "var(--busy)" : "var(--free)"}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="18 12"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="30"
                to="0"
                dur="0.9s"
                repeatCount="indefinite"
              />
            </polyline>
          )}
          {routePoints && routePoints.length > 1 && (
            <>
              <circle
                cx={routePoints[0]!.x}
                cy={routePoints[0]!.y}
                r="10"
                fill="var(--free)"
              />
              <circle
                cx={routePoints[routePoints.length - 1]!.x}
                cy={routePoints[routePoints.length - 1]!.y}
                r="10"
                fill="var(--gold)"
              />
            </>
          )}

          {/* equipamentos */}
          {visible.map((e) => {
            const active = e.id === highlightEquipmentId;
            return (
              <g
                key={e.id}
                transform={`translate(${e.x} ${e.y})`}
                onClick={() => onSelectEquipment?.(e)}
                className={onSelectEquipment ? "cursor-pointer" : undefined}
              >
                {active && (
                  <circle r="26" fill="none" stroke={statusColor[e.status]} strokeWidth="2">
                    <animate
                      attributeName="r"
                      values="20;30;20"
                      dur="1.6s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <rect
                  x="-17"
                  y="-17"
                  width="34"
                  height="34"
                  rx="10"
                  fill="oklch(0.18 0.006 260)"
                  stroke={statusColor[e.status]}
                  strokeWidth="2.5"
                />
                <circle r="6" fill={statusColor[e.status]} />
                <text
                  y="30"
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="oklch(0.85 0.01 250)"
                >
                  {e.name}
                </text>
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
