'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarOff, CheckCheck, Save, UserCheck, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHead } from '@/components/ui';
import { todayStr, fmtDate, STATUS_LABEL } from '@/lib/utils';

type Status = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpha';
const CHOICES: { v: Status | ''; label: string; cls: string }[] = [
  { v: '', label: '—', cls: '' },
  { v: 'hadir', label: 'Hadir', cls: 'b-hadir' },
  { v: 'terlambat', label: 'Terlambat', cls: 'b-terlambat' },
  { v: 'izin', label: 'Izin', cls: 'b-izin' },
  { v: 'sakit', label: 'Sakit', cls: 'b-sakit' },
  { v: 'alpha', label: 'Alpha', cls: 'b-alpha' },
];

export default function AttendancePage() {
  const [date, setDate] = useState(todayStr());
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [picks, setPicks] = useState<Record<string, { status: Status | ''; note: string; id?: string }>>({});
  const [holiday, setHoliday] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Load kelas sekali
  useEffect(() => {
    supabase.from('classes').select('id, name').order('name').then(({ data }) => setClasses(data || []));
  }, []);

  // Load data saat tanggal / kelas berubah
  const load = useCallback(async () => {
    if (!classId) {
      setStudents([]);
      setPicks({});
      return;
    }
    setLoading(true);
    setMsg(null);
    const [h, s, a] = await Promise.all([
      supabase.from('holidays').select('name').eq('date', date).maybeSingle(),
      supabase.from('students').select('id, nis, full_name').eq('class_id', classId).eq('active', true).order('full_name'),
      supabase.from('attendance').select('id, student_id, status, note').eq('date', date),
    ]);
    setHoliday((h.data as any) || null);
    const studs = s.data || [];
    setStudents(studs);
    const map: Record<string, any> = {};
    for (const a1 of a.data || []) map[a1.student_id] = a1;
    const next: typeof picks = {};
    for (const st of studs) {
      const ex = map[st.id];
      next[st.id] = { status: (ex?.status as Status) || '', note: ex?.note || '', id: ex?.id };
    }
    setPicks(next);
    setLoading(false);
  }, [classId, date]);
  useEffect(() => { load(); }, [load]);

  function fillAll(v: Status) {
    const next = { ...picks };
    for (const st of students) next[st.id] = { ...next[st.id], status: v };
    setPicks(next);
  }

  async function save() {
    setMsg(null);
    const inserts: any[] = [];
    const updates: any[] = [];
    const deletes: string[] = [];
    for (const st of students) {
      const p = picks[st.id];
      if (!p) continue;
      if (!p.status && p.id) {
        deletes.push(p.id);
      } else if (p.status && p.id) {
        updates.push({ id: p.id, status: p.status, note: p.note || null, method: 'manual' });
      } else if (p.status) {
        inserts.push({ student_id: st.id, date, status: p.status, note: p.note || null, method: 'manual', check_in: null });
      }
    }
    try {
      if (inserts.length) {
        const { error } = await supabase.from('attendance').insert(inserts);
        if (error) throw error;
      }
      for (const u of updates) {
        const { id, ...rest } = u;
        const { error } = await supabase.from('attendance').update(rest).eq('id', id);
        if (error) throw error;
      }
      if (deletes.length) {
        const { error } = await supabase.from('attendance').delete().in('id', deletes);
        if (error) throw error;
      }
      setMsg({ ok: true, text: `Tersimpan — ${inserts.length} baru, ${updates.length} diperbarui, ${deletes.length} dihapus.` });
      load();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || 'Gagal menyimpan.' });
    }
  }

  const counts = useMemo(() => {
    const c = { hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0, kosong: 0 };
    for (const st of students) {
      const v = picks[st.id]?.status;
      if (!v) c.kosong++;
      else (c as any)[v]++;
    }
    return c;
  }, [picks, students]);

  return (
    <>
      <PageHead title="Presensi Manual" sub="Isi atau koreksi presensi dari jauh — berguna saat ada guru pengganti">
        <button className="ghost" onClick={() => fillAll('hadir')} disabled={!students.length}><CheckCheck size={16} /> Isi semua: Hadir</button>
        <button onClick={save} disabled={!students.length || !!holiday}><Save size={16} /> Simpan</button>
      </PageHead>

      <div className="card">
        <div className="row" style={{ marginBottom: 0 }}>
          <div><label>Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div>
            <label>Kelas</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">— pilih kelas —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {holiday && (
        <div className="card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="stat-icon tone-warning" style={{ width: 44, height: 44, borderRadius: 10 }}><CalendarOff size={22} /></div>
          <div>
            <div style={{ fontWeight: 700 }}>Hari libur — {holiday.name}</div>
            <div className="muted">Presensi tidak bisa disimpan untuk tanggal ini. Hapus hari libur di menu <strong>Hari Libur</strong> jika ingin memaksa.</div>
          </div>
        </div>
      )}

      {!!students.length && !holiday && (
        <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span className="badge b-hadir">Hadir {counts.hadir}</span>
          <span className="badge b-terlambat">Terlambat {counts.terlambat}</span>
          <span className="badge b-izin">Izin {counts.izin}</span>
          <span className="badge b-sakit">Sakit {counts.sakit}</span>
          <span className="badge b-alpha">Alpha {counts.alpha}</span>
          <span className="badge" style={{ background: 'var(--tone-muted)', color: 'var(--muted)' }}><Users size={12} /> Belum diisi {counts.kosong}</span>
          <span style={{ flex: 1 }} />
          {msg && <span className={`alert ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
        </div>
      )}

      {classId && !holiday && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th style={{ width: 44 }}>#</th><th>Siswa</th><th>Status</th><th>Catatan</th></tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const p = picks[s.id] || { status: '', note: '' };
                return (
                  <tr key={s.id}>
                    <td>{i + 1}</td>
                    <td><div style={{ fontWeight: 600 }}>{s.full_name}</div><div className="muted">NIS {s.nis}</div></td>
                    <td style={{ minWidth: 160 }}>
                      <select value={p.status} onChange={(e) => setPicks({ ...picks, [s.id]: { ...p, status: e.target.value as any } })}>
                        {CHOICES.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
                      </select>
                    </td>
                    <td style={{ minWidth: 180 }}>
                      <input value={p.note} onChange={(e) => setPicks({ ...picks, [s.id]: { ...p, note: e.target.value } })} placeholder="Opsional" />
                    </td>
                  </tr>
                );
              })}
              {loading && <tr><td colSpan={4} className="empty">Memuat…</td></tr>}
              {!loading && !students.length && <tr><td colSpan={4} className="empty">Tidak ada siswa aktif di kelas ini.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {!classId && (
        <div className="card">
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="stat-icon tone-primary" style={{ width: 44, height: 44, borderRadius: 10 }}><UserCheck size={22} /></div>
            <div>
              <div style={{ fontWeight: 700 }}>Pilih kelas untuk mulai</div>
              <div className="muted">Status yang Anda ubah akan menimpa catatan presensi hari itu (termasuk hasil scan kiosk).</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
