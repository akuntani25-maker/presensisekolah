'use client';
import { useEffect, useState } from 'react';
import { Save, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/profile';
import { PageHead } from '@/components/ui';

const TIMEZONES = [
  { tz: 'Asia/Jakarta', label: 'WIB — Asia/Jakarta (Jawa, Sumatera, Kalbar, Kalteng)' },
  { tz: 'Asia/Makassar', label: 'WITA — Asia/Makassar (Bali, NTB, NTT, Sulawesi, Kaltim, Kalsel, Kalut)' },
  { tz: 'Asia/Jayapura', label: 'WIT — Asia/Jayapura (Maluku, Papua)' },
];

export default function SettingsPage() {
  const { profile } = useProfile();
  const [cfg, setCfg] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    supabase.from('settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setCfg(data));
  }, []);

  if (profile?.role !== 'admin')
    return (
      <>
        <PageHead title="Pengaturan" />
        <div className="card"><p>Hanya administrator yang bisa membuka halaman ini.</p></div>
      </>
    );

  if (!cfg) return <p className="muted">Memuat…</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from('settings')
      .update({
        school_name: (cfg.school_name || '').trim() || 'Sekolah Saya',
        timezone: cfg.timezone,
        late_after: cfg.late_after,
      })
      .eq('id', 1);
    setSaving(false);
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: 'Pengaturan tersimpan.' });
  }

  const late = (cfg.late_after || '').slice(0, 5);

  return (
    <>
      <PageHead title="Pengaturan" sub="Nama sekolah, zona waktu, dan batas terlambat global" />
      <form className="card" onSubmit={save}>
        <div className="card-title">Umum</div>
        <div className="card-sub">Berlaku untuk seluruh aplikasi dan kiosk.</div>

        <div className="field">
          <label>Nama sekolah</label>
          <div className="input-icon">
            <Building2 size={17} />
            <input value={cfg.school_name || ''} onChange={(e) => setCfg({ ...cfg, school_name: e.target.value })} placeholder="Contoh: SMPN 1 Mataram" />
          </div>
        </div>

        <div className="row">
          <div>
            <label>Zona waktu</label>
            <select value={cfg.timezone || ''} onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })}>
              {TIMEZONES.map((t) => (
                <option key={t.tz} value={t.tz}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Batas terlambat global</label>
            <input type="time" value={late} onChange={(e) => setCfg({ ...cfg, late_after: e.target.value })} />
          </div>
        </div>
        <p className="muted" style={{ marginTop: -4 }}>
          Batas terlambat global dipakai untuk siswa yang <strong>kelasnya belum</strong> punya batas terlambat sendiri.
          Untuk sekolah dengan sesi pagi &amp; siang, atur batas terlambat per kelas di menu <strong>Kelas</strong>.
        </p>

        <div className="actions" style={{ marginTop: 14 }}>
          <button disabled={saving}><Save size={16} /> {saving ? 'Menyimpan…' : 'Simpan'}</button>
          {msg && <span className={`alert ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
        </div>
      </form>

      <div className="card">
        <div className="card-title">Catatan</div>
        <ul className="muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Perubahan nama sekolah muncul di layar kiosk dan notifikasi ke wali murid.</li>
          <li>Zona waktu dipakai kiosk untuk menentukan tanggal dan jam presensi; sesuaikan dengan lokasi sekolah.</li>
          <li>Password akun diubah dari Supabase (Authentication → Users).</li>
        </ul>
      </div>
    </>
  );
}
