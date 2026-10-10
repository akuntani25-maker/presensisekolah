'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Clock, Info } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHead } from '@/components/ui';

type ClassRow = { id: string; name: string; start_time: string | null; late_after: string | null };
const EMPTY: Partial<ClassRow> = { id: '', name: '', start_time: '', late_after: '' };

function fmtTime(t: string | null) {
  if (!t) return '-';
  return t.slice(0, 5);
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [form, setForm] = useState<Partial<ClassRow> | null>(null);
  const [msg, setMsg] = useState('');
  const [globalLate, setGlobalLate] = useState<string>('');

  const load = useCallback(async () => {
    const [c, s] = await Promise.all([
      supabase.from('classes').select('id, name, start_time, late_after').order('name'),
      supabase.from('settings').select('late_after').eq('id', 1).maybeSingle(),
    ]);
    setClasses((c.data as ClassRow[]) || []);
    setGlobalLate((s.data as any)?.late_after?.slice(0, 5) || '');
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!form) return;
    const payload = {
      name: (form.name || '').trim(),
      start_time: form.start_time ? form.start_time : null,
      late_after: form.late_after ? form.late_after : null,
    };
    const { error } = form.id
      ? await supabase.from('classes').update(payload).eq('id', form.id)
      : await supabase.from('classes').insert(payload);
    if (error) return setMsg(error.message.includes('duplicate') ? 'Nama kelas sudah ada.' : error.message);
    setForm(null);
    load();
  }

  async function remove(c: ClassRow) {
    if (!confirm(`Hapus kelas ${c.name}? Siswa di kelas ini menjadi tanpa kelas.`)) return;
    await supabase.from('classes').delete().eq('id', c.id);
    load();
  }

  return (
    <>
      <PageHead title="Kelas" sub="Kelola kelas beserta jam masuk dan batas terlambatnya">
        <button onClick={() => { setMsg(''); setForm({ ...EMPTY }); }}><Plus size={16} /> Tambah kelas</button>
      </PageHead>

      <div className="card" style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div className="stat-icon tone-primary" style={{ width: 40, height: 40, borderRadius: 10 }}><Info size={18} /></div>
        <div>
          <div style={{ fontWeight: 600 }}>Cara kerja jam per kelas</div>
          <div className="muted">
            Setiap kelas dapat memiliki <strong>jam masuk</strong> dan <strong>batas terlambat</strong> sendiri — berguna untuk sekolah dengan sesi pagi dan siang.
            Kelas yang jamnya dikosongkan akan memakai pengaturan global
            {globalLate ? <> (saat ini <strong>{globalLate}</strong>)</> : null}.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Daftar kelas ({classes.length})</div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama kelas</th>
                <th>Jam masuk</th>
                <th>Batas terlambat</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{fmtTime(c.start_time)}</td>
                  <td>
                    {c.late_after ? (
                      <span className="badge b-terlambat"><Clock size={12} /> {fmtTime(c.late_after)}</span>
                    ) : (
                      <span className="muted">Pakai global {globalLate && `(${globalLate})`}</span>
                    )}
                  </td>
                  <td>
                    <div className="actions" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      <button className="ghost icon-only" title="Ubah" onClick={() => { setMsg(''); setForm({ ...c, start_time: c.start_time?.slice(0, 5) || '', late_after: c.late_after?.slice(0, 5) || '' }); }}><Pencil size={16} /></button>
                      <button className="danger icon-only" title="Hapus" onClick={() => remove(c)}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!classes.length && <tr><td colSpan={4} className="empty">Belum ada kelas.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div className="modal-bg" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="modal-head">
              <h3>{form.id ? 'Ubah kelas' : 'Tambah kelas'}</h3>
              <button type="button" className="icon-btn" onClick={() => setForm(null)} aria-label="Tutup"><X size={20} /></button>
            </div>
            <div className="field">
              <label>Nama kelas</label>
              <input required placeholder="Contoh: X IPA 1 Pagi" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="row">
              <div>
                <label>Jam masuk (opsional)</label>
                <input type="time" value={form.start_time || ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <label>Batas terlambat (opsional)</label>
                <input type="time" value={form.late_after || ''} onChange={(e) => setForm({ ...form, late_after: e.target.value })} />
              </div>
            </div>
            <p className="muted" style={{ marginTop: -4 }}>
              Setelah jam ini, presensi akan ditandai <strong>terlambat</strong>. Kosongkan untuk memakai pengaturan global{globalLate ? ` (${globalLate})` : ''}.
            </p>
            {msg && <div className="alert err" style={{ marginBottom: 14, marginTop: 10 }}>{msg}</div>}
            <div className="actions" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
              <button type="button" className="ghost" onClick={() => setForm(null)}>Batal</button>
              <button>Simpan</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
