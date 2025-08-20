import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export type Attendee = {
  id: string;
  full_name: string;
  company?: string | null;
  checked_in_at?: string | null;
  ticket_no?: number | null;
  station?: string | null;
};
