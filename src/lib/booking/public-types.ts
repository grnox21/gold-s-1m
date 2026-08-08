/** Trimmed shapes handed to the client booking wizard — deliberately
 * exclude fields the browser doesn't need (e.g. a barber's WhatsApp number
 * is used server-side only, by the notification system). */
export interface PublicBarber {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
  bio: string | null;
  specialty: string | null;
}

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  durationMinutes: number;
}
