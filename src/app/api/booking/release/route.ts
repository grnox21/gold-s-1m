import { NextResponse } from "next/server";
import { z } from "zod";

import { createServiceClient } from "@/lib/supabase/service";
import { releaseHold } from "@/lib/booking/engine";

const bodySchema = z.object({ appointmentId: z.uuid() });

/** Called when the customer navigates back from the confirmation step (or
 * abandons the tab, via sendBeacon) so the slot frees up immediately
 * instead of waiting out the full hold TTL. Best-effort: if this never
 * fires, the hold still expires on its own. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createServiceClient();
  await releaseHold(supabase, parsed.data.appointmentId);
  return NextResponse.json({ ok: true });
}
