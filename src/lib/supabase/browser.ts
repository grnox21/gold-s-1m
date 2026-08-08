"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/** Anon-key client for the browser. Used only by the /giris/login form. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
