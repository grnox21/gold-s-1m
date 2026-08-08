// Small helpers that fail loudly (server-side only) instead of quietly
// crashing deep inside a Supabase call when an env var is missing.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Ortam değişkeni eksik: ${name}. .env dosyanızı kontrol edin (bkz. .env.example).`
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  /** Server-only. Never import this file's `serviceRoleKey` from a "use client" module. */
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};
