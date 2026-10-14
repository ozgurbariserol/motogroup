import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Kök: oturum varsa dashboard'a, yoksa girişe yönlendir.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? '/dashboard' : '/login');
}
