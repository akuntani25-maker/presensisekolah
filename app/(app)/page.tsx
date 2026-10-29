'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, UserCheck, Clock, HeartPulse, UserX, UserMinus, ScanFace, CalendarX2, CalendarOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { todayStr, fmtTime, STATUS_LABEL } from '@/lib/utils';
import { notifyParent } from '@/lib/notify';
import { StatCard, PageHead, Avatar } from '@/components/ui';

export default function Dashboard() {
  const [date] = useState(todayStr());
  const [rows, setRows] = useState<any[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [missing, setMissing] = useState<any[]>([]);
  const [holiday, setHoliday] = useState<{ name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [att, studs, hol] = await Promise.all([
      supabase.from('attendance').select('*, students(full_name, nis, classes(name))').eq('date', date).order('check_in', { ascending: false }),
      supabase.from('students').select('id, full_name, nis, classes(name)').eq('active', true),
      supabase.from('holidays').select('name').eq('date', date).maybeSingle(),
    ]);
    const a = att.data || [];
    const s = studs.data || [];
    setRows(a);
    setTotalStudents(s.length);
    setHoliday((hol.data as any) || null);
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

  const longDate = new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <PageHead title="Dashboard" sub={longDate}>
        <Link href="/kiosk" className="btn"><ScanFace size={17} /> Buka presensi</Link>
      </PageHead>

      {holiday && (
        <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="stat-icon tone-warning" style={{ width: 48, height: 48, borderRadius: 10 }}><CalendarOff size={22} /></div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Hari libur — {holiday.name}</div>
            <div className="muted">Tidak ada presensi hari ini. Kiosk juga menolak scan pada tanggal libur.</div>
          </div>
        </div>
      )}

      <div className="grid cols4" style={{ marginBottom: 22 }}>
        <StatCard icon={Users} label="Siswa aktif" value={totalStudents} tone="primary" />
        <StatCard icon={UserCheck} label="Hadir" value={count('hadir')} tone="success" />
        <StatCard icon={Clock} label="Terlambat" value={count('terlambat')} tone="warning" />
        <StatCard icon={HeartPulse} label="Izin / Sakit" value={count('izin') + count('sakit')} tone="info" />
        <StatCard icon={UserX} label="Alpha" value={count('alpha')} tone="danger" />
        <StatCard icon={UserMinus} label="Belum presensi" value={missing.length} tone="muted" />
      </div>

      <div className="card">
        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="card-title">Penutupan presensi harian</div>
            <div className="muted">Setelah jam presensi berakhir, tandai siswa yang belum presensi sebagai alpha.</div>
          </div>
          <div className="actions">
            {msg && <span className="muted">{msg}</span>}
            <button className="ghost" disabled={busy || !missing.length || !!holiday} onClick={markAlpha}>
              <CalendarX2 size={16} /> Tandai alpha ({missing.length})
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Catatan hari ini</div>
        <div className="card-sub">{rows.length} catatan presensi tercatat</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Siswa</th><th>Kelas</th><th>Jam</th><th>Status</th><th>Cara</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><div className="cell-user"><Avatar name={r.students?.full_name} /><div><div style={{ fontWeight: 600 }}>{r.students?.full_name}</div><div className="muted">NIS {r.students?.nis}</div></div></div></td>
                  <td>{r.students?.classes?.name || '-'}</td>
                  <td>{fmtTime(r.check_in)}</td>
                  <td><span className={`badge b-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td>{r.method === 'face' ? 'Wajah' : r.method === 'qr' ? 'QR' : 'Manual'}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="empty">Belum ada presensi hari ini.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
