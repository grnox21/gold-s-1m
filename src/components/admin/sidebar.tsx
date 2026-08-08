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
  BarChart3,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/giris", label: "Dashboard", icon: LayoutDashboard, exact: true, fullAdminOnly: false },
  { href: "/giris/randevular", label: "Randevular", icon: CalendarRange, fullAdminOnly: false },
  { href: "/giris/takvim", label: "Takvim", icon: CalendarDays, fullAdminOnly: false },
  { href: "/giris/rapor", label: "Berber Raporu", icon: BarChart3, fullAdminOnly: true },
  { href: "/giris/berberler", label: "Berberler", icon: UserCircle, fullAdminOnly: true },
  { href: "/giris/hizmetler", label: "Hizmetler", icon: Scissors, fullAdminOnly: true },
  { href: "/giris/musteriler", label: "Müşteriler", icon: Users, fullAdminOnly: true },
  { href: "/giris/calisma-saatleri", label: "Çalışma Saatleri", icon: Clock, fullAdminOnly: true },
  { href: "/giris/engellenen-saatler", label: "Engellenen Saatler", icon: Ban, fullAdminOnly: true },
  { href: "/giris/whatsapp-ayarlari", label: "WhatsApp Ayarları", icon: MessageCircle, fullAdminOnly: true },
  { href: "/giris/site-ayarlari", label: "Site Ayarları", icon: Settings, fullAdminOnly: true },
];

// A 'barber' login only gets Dashboard/Randevular/Takvim — the rest is
// owner/admin-only, enforced again server-side by requireFullAdmin() on
// each of those pages (this filter is just UX, not the security boundary).
export function SidebarNav({ onNavigate, isFullAdmin = true }: { onNavigate?: () => void; isFullAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isFullAdmin ? NAV : NAV.filter((item) => !item.fullAdminOnly);

  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((item) => {
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
