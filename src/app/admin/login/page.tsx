import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin Girişi",
};

export default async function AdminLoginPage({
  searchParams,
}: PageProps<"/admin/login">) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "/admin";
  const unauthorized = params.error === "yetkisiz";

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="label-caps text-[0.7rem] text-gold">Yusuf Demir</p>
          <h1 className="mt-2 font-display text-2xl text-warm-white">Admin Girişi</h1>
        </div>
        {unauthorized && (
          <p className="mb-6 rounded-sm border border-danger/30 bg-danger-soft px-4 py-3 text-center text-sm text-warm-white">
            Bu hesabın admin paneline erişim yetkisi yok.
          </p>
        )}
        <LoginForm nextPath={nextPath} />
      </div>
    </div>
  );
}
