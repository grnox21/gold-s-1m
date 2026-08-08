import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

/**
 * Refreshes the Supabase Auth session on every request (required by
 * @supabase/ssr — an unrefreshed cookie leads to random logouts) and blocks
 * unauthenticated access to /giris/* before any admin page even renders.
 * The actual "is this user an admin" check (admin_users lookup) happens
 * again per-request in app/giris/layout.tsx — this proxy only proves
 * "there is a valid Supabase session", which is cheap and fast.
 *
 * Named `proxy` (not `middleware`) per the Next.js 16 convention — same
 * mechanism, new file/function name.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute =
    request.nextUrl.pathname.startsWith("/giris") &&
    request.nextUrl.pathname !== "/giris/login";

  if (isAdminRoute && !user) {
    const loginUrl = new URL("/giris/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/giris/:path*"],
};
