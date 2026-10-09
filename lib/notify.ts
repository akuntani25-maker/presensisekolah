import { supabase } from '@/lib/supabase';

/** Memanggil API notifikasi (email ke wali jika dikonfigurasi). Gagal tidak mengganggu presensi. */
export async function notifyParent(payload: { student_id: string; status: string; time?: string; note?: string }) {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return (await res.json()) as { emailed: boolean; wa_url?: string; message?: string };
  } catch {
    return null;
  }
}
