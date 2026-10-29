'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, X, CalendarOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/lib/profile';
import { PageHead } from '@/components/ui';
import { fmtDate, todayStr } from '@/lib/utils';

export default function HolidaysPage() {
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin';
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<{ date: string; name: string } | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('holidays').select('*').order('date');
    setRows(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!form) return;
    const { error } = await supabase.from('holidays').upsert({ date: form.date, name: form.name.trim() });
    if (error) return setMsg(error.message);
    setForm(null);
    load();
  }
  async function remove(d: string) {
    if (!confirm(`Hapus hari libur ${fmtDate(d)}?`)) return;
    await supabase.from('holidays').delete().eq('date', d);
    load();
  }

  const today = todayStr();
  const upcoming = rows.filter((r) => r.date >= today);
  const past = rows.filter((r) => r.date < today);

  return (
    <>
      <PageHead title="Hari Libur" sub="Pada tanggal yang terdaftar, kiosk tidak melakukan presensi dan rekap melewatinya saat menandai alpha otomatis">
        {isAdmin && <button onClick={() => setForm({ date: today, name: '' })}><Plus size={16} /> Tambah hari libur</button>}
      </PageHead>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Akan datang ({upcoming.length})</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Nama</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {upcoming.map((r) => (
                <tr key={r.date}>
                  <td><span className="badge b-izin"><CalendarOff size={12} /> {fmtDate(r.date)}</span></td>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>{isAdmin && <button className="danger icon-only" onClick={() => remove(r.date)} aria-label="Hapus"><Trash2 size={16} /></button>}</td>
                </tr>
              ))}
              {!upcoming.length && <tr><td colSpan={3} className="empty">Belum ada hari libur mendatang.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Riwayat ({past.length})</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Tanggal</th><th>Nama</th><th style={{ width: 60 }}></th></tr></thead>
            <tbody>
              {past.slice(-30).reverse().map((r) => (
                <tr key={r.date}>
                  <td className="muted">{fmtDate(r.date)}</td>
                  <td>{r.name}</td>
                  <td>{isAdmin && <button className="danger icon-only" onClick={() => remove(r.date)} aria-label="Hapus"><Trash2 size={16} /></button>}</td>
                </tr>
              ))}
              {!past.length && <tr><td colSpan={3} className="empty">Belum ada riwayat.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Catatan</div>
        <p className="muted" style={{ margin: 0 }}>
          Lima hari libur dengan tanggal tetap (Tahun Baru, Hari Buruh, Pancasila, HUT RI, Natal) sudah diisi sejak awal.
          Untuk hari libur yang mengikuti kalender hijriah atau imlek (Idul Fitri, Idul Adha, Nyepi, Waisak, Imlek, Isra Mikraj, Maulid,
          Wafat/Kenaikan Isa Almasih), silakan tambah mengikuti SKB 3 Menteri tahun berjalan.
        </p>
      </div>

      {form && (
        <div className="modal-bg" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="modal-head">
              <h3>Tambah hari libur</h3>
              <button type="button" className="icon-btn" onClick={() => setForm(null)} aria-label="Tutup"><X size={20} /></button>
            </div>
            <div className="row">
              <div><label>Tanggal</label><input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><label>Nama</label><input required placeholder="Contoh: Hari Raya Idul Fitri" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            </div>
            <p className="muted">Jika tanggalnya sudah ada, isinya akan ditimpa.</p>
            {msg && <div className="alert err" style={{ marginBottom: 14 }}>{msg}</div>}
            <div className="actions" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="ghost" onClick={() => setForm(null)}>Batal</button>
              <button>Simpan</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
