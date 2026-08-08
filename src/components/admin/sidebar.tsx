"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarRange,
  CalendarDays,
  Users,
  Scissors,
  UserCircle,
  Clock,
  Ban,
  MessageCircle,
  Settings,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/randevular", label: "Randevular", icon: CalendarRange },
  { href: "/admin/takvim", label: "Takvim", icon: CalendarDays },
  { href: "/admin/berberler", label: "Berberler", icon: UserCircle },
  { href: "/admin/hizmetler", label: "Hizmetler", icon: Scissors },
  { href: "/admin/musteriler", label: "Müşteriler", icon: Users },
  { href: "/admin/calisma-saatleri", label: "Çalışma Saatleri", icon: Clock },
  { href: "/admin/engellenen-saatler", label: "Engellenen Saatler", icon: Ban },
  { href: "/admin/whatsapp-ayarlari", label: "WhatsApp Ayarları", icon: MessageCircle },
  { href: "/admin/site-ayarlari", label: "Site Ayarları", icon: Settings },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm transition-colors",
              active ? "bg-gold/10 text-gold-bright" : "text-ash hover:bg-surface-raised hover:text-warm-white"
            )}
          >
            <item.icon className="size-4 shrink-0" strokeWidth={1.5} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
