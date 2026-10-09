'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { todayStr, fmtTime, STATUS_LABEL } from '@/lib/utils';
import { notifyParent } from '@/lib/notify';

export default function Dashboard() {
  const [date] = useState(todayStr());
  const [rows, setRows] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [missing, setMissing] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [att, studs] = await Promise.all([
      supabase.from('attendance').select('*, students(full_name, nis, classes(name))').eq('date', date).order('check_in', { ascending: false }),
      supabase.from('students').select('id, full_name, nis, classes(name)').eq('active', true),
    ]);
    const a = att.data || [];
    const s = studs.data || [];
    setRows(a);
    setTotalStudents(s.length);
    const done = new Set(a.map((x: any) => x.student_id));
    setMissing(s.filter((x: any) => !done.has(x.id)));
  }, [date]);
  useEffect(() => { load(); }, [load]);

  const count = (st: string) => rows.filter((r) => r.status === st).length;

  async function markAlpha() {
    if (!missing.length) return;
    if (!confirm(`Tandai ${missing.length} siswa yang belum presensi sebagai ALPHA hari ini?\nLakukan ini setelah jam presensi berakhir.`)) return;
    setBusy(true);
    setMsg('');
    const { error } = await supabase
      .from('attendance')
      .insert(missing.map((m) => ({ student_id: m.id, date, status: 'alpha', method: 'manual', note: 'Otomatis: tidak ada presensi' })));
    setBusy(false);
    if (error) return setMsg(error.message);
    missing.forEach((m) => notifyParent({ student_id: m.id, status: 'alpha' }));
    setMsg(`${missing.length} siswa ditandai alpha.`);
    load();
  }

  return (
    <>
      <h2>Dashboard — {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</h2>
      <div className="grid cols4" style={{ marginBottom: 18 }}>
        <div className="card stat">{totalStudents}<small>Siswa aktif</small></div>
        <div className="card stat" style={{ color: 'var(--ok)' }}>{count('hadir')}<small>Hadir</small></div>
        <div className="card stat" style={{ color: 'var(--warn)' }}>{count('terlambat')}<small>Terlambat</small></div>
        <div className="card stat" style={{ color: 'var(--primary-dark)' }}>{count('izin') + count('sakit')}<small>Izin / Sakit</small></div>
        <div className="card stat" style={{ color: 'var(--bad)' }}>{count('alpha')}<small>Alpha</small></div>
        <div className="card stat">{missing.length}<small>Belum presensi</small></div>
      </div>

      <div className="card actions">
        <Link href="/kiosk" className="btn">Buka kiosk presensi</Link>
        <button className="ghost" disabled={busy || !missing.length} onClick={markAlpha}>Tandai belum presensi sebagai alpha</button>
        {msg && <span className="muted">{msg}</span>}
      </div>

      <div className="card table-wrap">
        <h3 style={{ marginTop: 0 }}>Catatan hari ini</h3>
        <table>
          <thead><tr><th>Jam</th><th>Nama</th><th>Kelas</th><th>Status</th><th>Cara</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtTime(r.check_in)}</td>
                <td>{r.students?.full_name}</td>
                <td>{r.students?.classes?.name || '-'}</td>
                <td><span className={`badge b-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                <td>{r.method === 'face' ? 'Wajah' : r.method === 'qr' ? 'QR' : 'Manual'}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="muted">Belum ada presensi hari ini.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
