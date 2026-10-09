'use client';
import { useCallback, useEffect, useState } from 'react';
import { Save, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHead, Avatar } from '@/components/ui';
import { notifyParent } from '@/lib/notify';
import { todayStr, fmtDate, STATUS_LABEL } from '@/lib/utils';

export default function LeavesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classId, setClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [status, setStatus] = useState<'izin' | 'sakit'>('sakit');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; wa?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRows = useCallback(async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*, students(full_name, nis, classes(name))')
      .in('status', ['izin', 'sakit'])
      .order('date', { ascending: false })
      .limit(40);
    setRows(data || []);
  }, []);

  useEffect(() => {
    (async () => {
      const [c, s] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('students').select('id, nis, full_name, class_id').eq('active', true).order('full_name'),
      ]);
      setClasses(c.data || []);
      setStudents(s.data || []);
    })();
    loadRows();
  }, [loadRows]);

  const options = students.filter((s) => !classId || s.class_id === classId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!studentId) return setMsg({ ok: false, text: 'Pilih siswa terlebih dahulu.' });
    setSaving(true);
    // Jika sudah ada catatan di tanggal itu (mis. alpha), timpa; jika sudah hadir, tolak
    const { data: existing } = await supabase.from('attendance').select('id, status').eq('student_id', studentId).eq('date', date).maybeSingle();
    if (existing && ['hadir', 'terlambat'].includes(existing.status)) {
      setSaving(false);
      return setMsg({ ok: false, text: 'Siswa ini sudah tercatat hadir pada tanggal tersebut.' });
    }
    const payload = { student_id: studentId, date, status, method: 'manual', note: note || null, check_in: null };
    const { error } = existing
      ? await supabase.from('attendance').update(payload).eq('id', existing.id)
      : await supabase.from('attendance').insert(payload);
    setSaving(false);
    if (error) return setMsg({ ok: false, text: error.message });
    const n = await notifyParent({ student_id: studentId, status, note });
    setMsg({
      ok: true,
      text: n?.emailed ? 'Tersimpan dan email terkirim ke wali.' : 'Tersimpan.',
      wa: n?.wa_url,
    });
    setNote('');
    loadRows();
  }

  async function remove(id: string) {
    if (!confirm('Hapus catatan ini?')) return;
    const { error } = await supabase.from('attendance').delete().eq('id', id);
    if (error) alert('Hanya admin yang boleh menghapus catatan.');
    loadRows();
  }

  return (
    <>
      <PageHead title="Izin / Sakit" sub="Catat siswa yang tidak hadir dengan keterangan" />
      <form className="card" onSubmit={save}>
        <div className="card-title">Input keterangan</div>
        <div className="card-sub">Catatan di tanggal yang sama (mis. alpha) akan diganti.</div>
        <div className="row">
          <div>
            <label>Kelas</label>
            <select value={classId} onChange={(e) => { setClassId(e.target.value); setStudentId(''); }}>
              <option value="">Semua kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label>Siswa</label>
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
              <option value="">— pilih siswa —</option>
              {options.map((s) => <option key={s.id} value={s.id}>{s.full_name} ({s.nis})</option>)}
            </select>
          </div>
        </div>
        <div className="row">
          <div><label>Tanggal</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
          <div>
            <label>Keterangan</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="sakit">Sakit</option>
              <option value="izin">Izin</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label>Catatan (opsional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: demam, ada surat dokter" />
        </div>
        <div className="actions">
          <button disabled={saving}><Save size={16} /> {saving ? 'Menyimpan…' : 'Simpan'}</button>
          {msg && <span className={`alert ${msg.ok ? 'ok' : 'err'}`}>{msg.text}</span>}
          {msg?.wa && <a className="btn ghost" href={msg.wa} target="_blank" rel="noreferrer"><Send size={16} /> Kirim WhatsApp ke wali</a>}
        </div>
      </form>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Riwayat terbaru</div>
        <div className="table-wrap">
        <table>
          <thead><tr><th>Tanggal</th><th>Siswa</th><th>Kelas</th><th>Status</th><th>Catatan</th><th style={{ width: 60 }}></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.date)}</td>
                <td><div className="cell-user"><Avatar name={r.students?.full_name} /><span style={{ fontWeight: 600 }}>{r.students?.full_name}</span></div></td>
                <td>{r.students?.classes?.name || '-'}</td>
                <td><span className={`badge b-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                <td>{r.note || '-'}</td>
                <td><button className="danger icon-only" onClick={() => remove(r.id)} aria-label="Hapus"><Trash2 size={16} /></button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={6} className="empty">Belum ada catatan.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
