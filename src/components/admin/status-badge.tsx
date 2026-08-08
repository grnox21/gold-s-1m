import { Badge } from "@/components/ui/badge";
import type { AppointmentStatus } from "@/types/database";

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; variant: "default" | "gold" | "success" | "warning" | "danger" | "info" | "outline" }> = {
  held: { label: "Tutuluyor", variant: "info" },
  pending: { label: "Beklemede", variant: "warning" },
  confirmed: { label: "Onaylandı", variant: "success" },
  completed: { label: "Tamamlandı", variant: "gold" },
  cancelled: { label: "İptal", variant: "outline" },
  no_show: { label: "Gelmedi", variant: "danger" },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
