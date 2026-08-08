import Link from "next/link";
import { LogOut } from "lucide-react";

import { requireAdmin } from "@/lib/auth/admin";
import { SidebarNav } from "@/components/admin/sidebar";
import { MobileSidebar } from "@/components/admin/mobile-sidebar";
import { signOut } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { admin } = await requireAdmin();
  const isFullAdmin = admin.role !== "barber";

  return (
    <div className="min-h-screen bg-ink text-foreground">
      <div className="mx-auto flex max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border p-5 lg:flex">
          <Link href="/admin" className="mb-8 block">
            <p className="font-display text-lg text-warm-white">
              Yusuf <span className="text-gold">Demir</span>
            </p>
            <p className="label-caps text-[0.58rem] text-ash">{isFullAdmin ? "Admin Panel" : "Berber Paneli"}</p>
          </Link>
          <div className="flex-1 overflow-y-auto">
            <SidebarNav isFullAdmin={isFullAdmin} />
          </div>
          <div className="border-t border-border pt-4">
            <p className="truncate text-xs text-ash">{admin.full_name}</p>
            <form action={signOut}>
              <button type="submit" className="mt-2 flex items-center gap-2 text-xs text-ash transition-colors hover:text-danger">
                <LogOut className="size-3.5" /> Çıkış Yap
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-ink/95 px-5 py-4 backdrop-blur lg:hidden">
            <p className="font-display text-lg text-warm-white">
              Yusuf <span className="text-gold">Demir</span>
            </p>
            <MobileSidebar isFullAdmin={isFullAdmin} />
          </header>
          <main className="p-5 lg:p-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
