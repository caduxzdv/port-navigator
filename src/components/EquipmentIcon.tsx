import { Anchor, Container, Forklift, Ship, Tractor, Truck } from "lucide-react";
import type { EquipmentType } from "@/lib/port-data";

export function EquipmentIcon({
  type,
  className,
}: {
  type: EquipmentType;
  className?: string;
}) {
  switch (type) {
    case "Caminhão Basculante":
      return <Truck className={className} />;
    case "Empilhadeira":
      return <Forklift className={className} />;
    case "Guindaste":
      return <Anchor className={className} />;
    case "Pá Carregadeira":
      return <Tractor className={className} />;
    case "Trator":
      return <Tractor className={className} />;
    case "Reach Stacker":
      return <Container className={className} />;
    default:
      return <Ship className={className} />;
  }
}
