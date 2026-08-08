/** Normalizes a Turkish mobile number to E.164 ("+905XXXXXXXXX"). */
export function normalizeTurkishPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+9${digits}`;
  if (digits.length === 10) return `+90${digits}`;
  return `+${digits}`;
}

/** wa.me deep link for the click-to-chat WhatsApp fallback. */
export function waLink(e164Phone: string, message: string): string {
  const digits = e164Phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
