import type { ReactNode } from "react";
import { statusLabel, type EquipmentStatus } from "@/lib/port-data";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/20", className)}
    >
      {(title || action) && (
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <h2 className="truncate text-sm font-semibold text-muted-foreground uppercase">
            {title}
          </h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatusPill({ status }: { status: EquipmentStatus }) {
  const map: Record<EquipmentStatus, string> = {
    livre: "text-free",
    "em-uso": "text-busy",
    manutencao: "text-danger",
  };
  const dot: Record<EquipmentStatus, string> = {
    livre: "bg-free",
    "em-uso": "bg-busy",
    manutencao: "bg-danger",
  };
  return (
    <span className={cn("flex items-center gap-1.5 text-xs font-medium", map[status])}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dot[status])} />
      {statusLabel[status]}
    </span>
  );
}

export function FuelBar({ value }: { value: number }) {
  const color = value < 25 ? "bg-danger" : value < 60 ? "bg-busy" : "bg-free";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{value}%</span>
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "free" | "busy" | "danger";
}) {
  const tones = {
    default: "text-foreground",
    free: "text-free",
    busy: "text-busy",
    danger: "text-danger",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", tones[tone])}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
