/** Minimal .ics (iCalendar) generator for "Takvime Ekle" — no dependency needed for one VEVENT. */
export function buildIcsDataUrl(params: {
  title: string;
  description: string;
  location: string;
  startAt: Date;
  endAt: Date;
}): string {
  const toIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const escape = (text: string) => text.replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Yusuf Demir Erkek Kuaforu//Randevu//TR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${crypto.randomUUID()}@yusufdemir`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(params.startAt)}`,
    `DTEND:${toIcsDate(params.endAt)}`,
    `SUMMARY:${escape(params.title)}`,
    `DESCRIPTION:${escape(params.description)}`,
    `LOCATION:${escape(params.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const content = lines.join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(content)}`;
}
