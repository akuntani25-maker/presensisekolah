import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const LABEL: Record<string, string> = {
  hadir: 'hadir tepat waktu',
  terlambat: 'hadir terlambat',
  izin: 'izin',
  sakit: 'sakit',
  alpha: 'tidak hadir tanpa keterangan (alpha)',
};

function waNumber(phone?: string | null) {
  if (!phone) return '';
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  return p;
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return NextResponse.json({ message: 'Server belum dikonfigurasi' }, { status: 500 });

  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ message: 'Tidak diizinkan' }, { status: 401 });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // Pastikan pemanggil adalah staf sekolah yang sah
  const { data: u, error: uerr } = await admin.auth.getUser(token);
  if (uerr || !u.user) return NextResponse.json({ message: 'Sesi tidak valid' }, { status: 401 });
  const { data: prof } = await admin.from('profiles').select('id').eq('id', u.user.id).maybeSingle();
  if (!prof) return NextResponse.json({ message: 'Bukan staf' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.student_id || !LABEL[body.status]) return NextResponse.json({ message: 'Data tidak valid' }, { status: 400 });

  const [{ data: s }, { data: cfg }] = await Promise.all([
    admin.from('students').select('full_name, parent_name, parent_email, parent_phone, classes(name)').eq('id', body.student_id).maybeSingle(),
    admin.from('settings').select('school_name').eq('id', 1).maybeSingle(),
  ]);
  if (!s) return NextResponse.json({ message: 'Siswa tidak ditemukan' }, { status: 404 });

  const school = cfg?.school_name || 'Sekolah';
  const waktu = body.time ? ` pukul ${body.time}` : '';
  const catatan = body.note ? ` Keterangan: ${body.note}.` : '';
  const text = `Yth. ${s.parent_name || 'Orang tua/wali'}, putra/putri Anda ${s.full_name} hari ini tercatat ${LABEL[body.status]}${waktu}.${catatan} — ${school}`;

  const phone = waNumber(s.parent_phone);
  const wa_url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : undefined;

  let emailed = false;
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && s.parent_email) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Presensi Sekolah <onboarding@resend.dev>',
          to: [s.parent_email],
          subject: `Presensi ${s.full_name}: ${LABEL[body.status]}`,
          text,
        }),
      });
      emailed = r.ok;
    } catch {
      emailed = false;
    }
  }

  return NextResponse.json({ emailed, wa_url, message: text });
}
