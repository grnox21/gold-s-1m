// Small helpers that fail loudly instead of quietly crashing deep inside a
// Supabase call when an env var is missing.
//
// IMPORTANT: each NEXT_PUBLIC_* value is read via a literal
// `process.env.NEXT_PUBLIC_X` member expression, not a computed
// `process.env[name]` lookup. Next.js inlines client-bundle env vars by
// statically matching that literal pattern at build time — a computed
// lookup can't be statically analyzed, so it silently resolves to
// `undefined` in the browser no matter what's set in .env. This bit us
// once already (browser.ts couldn't find NEXT_PUBLIC_SUPABASE_URL); keep
// every getter below as a direct member expression.

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Ortam değişkeni eksik: ${name}. .env dosyanızı kontrol edin (bkz. .env.example).`
    );
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
  /** Server-only. Never import this file's `supabaseServiceRoleKey` from a "use client" module. */
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  },
};

/**
 * True only when every Supabase env var needed by the service client is
 * present. Callers use this to degrade gracefully (render defaults) instead
 * of crashing when Supabase hasn't been connected yet.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
