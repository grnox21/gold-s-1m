/**
 * Standalone exercise of the real availability engine (lib/booking/engine.ts)
 * against a fake Supabase client, no network/DB required. This is the
 * "multiple services", "gap-free consecutive block", "skips an occupied
 * slot", and "suggests real alternatives" behavior from the spec, run
 * against the actual production code rather than a re-implementation.
 *
 * Run: npx tsx scripts/test-booking-engine.ts
 */
import { getAvailableSlots, suggestAlternatives, calculateDuration } from "../src/lib/booking/engine";
import { formatIstanbulTime } from "../src/lib/booking/time";

type Row = Record<string, unknown>;

/** Minimal fake of the subset of the supabase-js query builder engine.ts uses.
 * Filters are accepted (for readability at call sites) but not applied —
 * each test seeds exactly the rows relevant to the barber/date under test. */
function makeFakeSupabase(tables: Record<string, Row[]>) {
  function builder(table: string) {
    const state = { data: tables[table] ?? [] as Row[] };
    const chain: any = {
      select() {
        return chain;
      },
      eq() {
        return chain;
      },
      in() {
        return chain;
      },
      lt() {
        return chain;
      },
      gt() {
        return chain;
      },
      or() {
        return chain;
      },
      maybeSingle() {
        return Promise.resolve({ data: state.data[0] ?? null, error: null });
      },
      then(resolve: (v: { data: Row[]; error: null }) => unknown) {
        return resolve({ data: state.data, error: null });
      },
    };
    return chain;
  }

  return {
    from: (table: string) => builder(table),
    rpc: (fn: string) => {
      if (fn === "expire_stale_holds") return Promise.resolve({ data: null, error: null });
      throw new Error(`rpc ${fn} not mocked`);
    },
  } as any;
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ ${message}`);
  }
}

async function scenario1_singleServiceAllOpen() {
  console.log("\nSenaryo 1: Tek hizmet (30dk), boş bir gün");
  const barberId = "b1";
  const date = "2099-08-17"; // a Monday-equivalent far future date, working day
  const supabase = makeFakeSupabase({
    barbers: [{ id: barberId, is_active: true }],
    working_hours: [{ barber_id: barberId, weekday: 1, is_closed: false, start_time: "09:00", end_time: "20:00" }],
    break_times: [],
    blocked_times: [],
    appointments: [],
  });

  const result = await getAvailableSlots(supabase, { barberId, date, totalDurationMinutes: 30 });
  assert(result.isOpen, "gün açık olarak işaretlendi");
  assert(result.slots.length > 0, "en az bir uygun saat döndü");
  assert(result.slots[0] && formatIstanbulTime(result.slots[0].startAt) === "09:00", "ilk slot 09:00");
}

async function scenario2_multipleServicesConsecutive() {
  console.log("\nSenaryo 2: Çoklu hizmet — 17:00-18:00 tamamen dolu, 60dk istenirse 17:30 ATLANMALI, 18:00 önerilmeli");
  const barberId = "b1";
  const date = "2099-08-17";
  const supabase = makeFakeSupabase({
    barbers: [{ id: barberId, is_active: true }],
    working_hours: [{ barber_id: barberId, weekday: 1, is_closed: false, start_time: "09:00", end_time: "20:00" }],
    break_times: [],
    blocked_times: [],
    appointments: [
      // İki ayrı 30 dakikalık randevu, 17:00-18:00'ı uçtan uca doldurur —
      // bu yüzden 17:30'dan başlayan 60dk'lık bir blok da (17:30-18:30)
      // ikinci randevuyla çakışacağından sunulmamalı.
      {
        barber_id: barberId,
        status: "confirmed",
        start_at: `${date}T17:00:00+03:00`,
        end_at: `${date}T17:30:00+03:00`,
        hold_expires_at: null,
      },
      {
        barber_id: barberId,
        status: "confirmed",
        start_at: `${date}T17:30:00+03:00`,
        end_at: `${date}T18:00:00+03:00`,
        hold_expires_at: null,
      },
    ],
  });

  // Saç Kesimi (30) + Sakal (30) = 60 dakika
  const totalDuration = calculateDuration([{ duration_minutes: 30 }, { duration_minutes: 30 }]);
  assert(totalDuration === 60, "toplam süre 60 dakika olarak hesaplandı");

  const result = await getAvailableSlots(supabase, { barberId, date, totalDurationMinutes: totalDuration });
  const startTimes = result.slots.map((s) => formatIstanbulTime(s.startAt));

  assert(!startTimes.includes("17:30"), "17:30 sunulmadı (60dk'lık blok 18:00'a kadar dolu olurdu)");
  assert(startTimes.includes("18:00"), "18:00 uygun saatler arasında");
  assert(startTimes.includes("18:30"), "18:30 uygun saatler arasında");
}

async function scenario3_breakTimeBlocksBooking() {
  console.log("\nSenaryo 3: Öğle molası (13:00-14:00) sırasında randevu sunulmamalı");
  const barberId = "b1";
  const date = "2099-08-17";
  const supabase = makeFakeSupabase({
    barbers: [{ id: barberId, is_active: true }],
    working_hours: [{ barber_id: barberId, weekday: 1, is_closed: false, start_time: "09:00", end_time: "20:00" }],
    break_times: [{ barber_id: barberId, weekday: 1, start_time: "13:00", end_time: "14:00" }],
    blocked_times: [],
    appointments: [],
  });

  const result = await getAvailableSlots(supabase, { barberId, date, totalDurationMinutes: 30 });
  const startTimes = result.slots.map((s) => formatIstanbulTime(s.startAt));
  assert(!startTimes.includes("13:00"), "13:00 sunulmadı");
  assert(!startTimes.includes("13:30"), "13:30 sunulmadı (30dk blok molayla çakışır)");
  assert(startTimes.includes("14:00"), "mola bitince 14:00 tekrar uygun");
}

async function scenario4_closedDay() {
  console.log("\nSenaryo 4: Kapalı gün (Pazar) — hiç slot dönmemeli");
  const barberId = "b1";
  const date = "2099-08-16"; // Sunday
  const supabase = makeFakeSupabase({
    barbers: [{ id: barberId, is_active: true }],
    working_hours: [{ barber_id: barberId, weekday: 0, is_closed: true, start_time: null, end_time: null }],
    break_times: [],
    blocked_times: [],
    appointments: [],
  });

  const result = await getAvailableSlots(supabase, { barberId, date, totalDurationMinutes: 30 });
  assert(!result.isOpen, "gün kapalı olarak işaretlendi");
  assert(result.closedReason === "weekly_off", "kapanış sebebi weekly_off");
  assert(result.slots.length === 0, "hiç slot dönmedi");
}

async function scenario5_blockedTimeWins() {
  console.log("\nSenaryo 5: Admin tarafından engellenen saat aralığı sunulmamalı");
  const barberId = "b1";
  const date = "2099-08-17";
  const supabase = makeFakeSupabase({
    barbers: [{ id: barberId, is_active: true }],
    working_hours: [{ barber_id: barberId, weekday: 1, is_closed: false, start_time: "09:00", end_time: "20:00" }],
    break_times: [],
    blocked_times: [
      { barber_id: barberId, start_at: `${date}T16:00:00+03:00`, end_at: `${date}T18:00:00+03:00`, reason: "Kişisel" },
    ],
    appointments: [],
  });

  const result = await getAvailableSlots(supabase, { barberId, date, totalDurationMinutes: 30 });
  const startTimes = result.slots.map((s) => formatIstanbulTime(s.startAt));
  assert(!startTimes.includes("16:30"), "engellenen aralıktaki saat sunulmadı");
  assert(startTimes.includes("18:00"), "engelleme bitince tekrar uygun");
}

async function scenario6_suggestAlternatives() {
  console.log("\nSenaryo 6: suggestAlternatives — istenen saatten sonraki uygun saatleri önerir");
  const barberId = "b1";
  const date = "2099-08-17";
  const supabase = makeFakeSupabase({
    barbers: [{ id: barberId, is_active: true }],
    working_hours: [{ barber_id: barberId, weekday: 1, is_closed: false, start_time: "09:00", end_time: "20:00" }],
    break_times: [],
    blocked_times: [],
    appointments: [
      {
        barber_id: barberId,
        status: "confirmed",
        start_at: `${date}T17:00:00+03:00`,
        end_at: `${date}T18:00:00+03:00`,
        hold_expires_at: null,
      },
    ],
  });

  const desired = new Date(`${date}T17:00:00+03:00`);
  const alternatives = await suggestAlternatives(supabase, {
    barberId,
    date,
    totalDurationMinutes: 60,
    after: desired,
    count: 3,
  });

  const times = alternatives.map((s) => formatIstanbulTime(s.startAt));
  assert(times.length === 3, `3 alternatif önerildi (gelen: ${times.join(", ")})`);
  assert(times[0] === "18:00", "ilk alternatif 18:00");
}

async function main() {
  await scenario1_singleServiceAllOpen();
  await scenario2_multipleServicesConsecutive();
  await scenario3_breakTimeBlocksBooking();
  await scenario4_closedDay();
  await scenario5_blockedTimeWins();
  await scenario6_suggestAlternatives();

  console.log(`\n${passed} geçti, ${failed} başarısız.`);
  if (failed > 0) process.exit(1);
}

main();
