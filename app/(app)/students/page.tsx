'use client';
import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Plus, Search, QrCode, ScanFace, Pencil, Trash2, Printer, ArrowLeft, Power, X, ShieldOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import FaceEnroll from '@/components/FaceEnroll';
import { useProfile } from '@/lib/profile';
import { PageHead, Avatar } from '@/components/ui';

const EMPTY = { id: '', nis: '', full_name: '', class_id: '', parent_name: '', parent_phone: '', parent_email: '' };

export default function StudentsPage() {
  const { profile } = useProfile();
  const isAdmin = profile?.role === 'admin';
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [form, setForm] = useState<any>(null);
  const [enroll, setEnroll] = useState<any>(null);
  const [cards, setCards] = useState<{ s: any; img: string }[] | null>(null);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [s, c] = await Promise.all([
      supabase.from('students').select('*, classes(name)').order('full_name'),
      supabase.from('classes').select('*').order('name'),
    ]);
    setStudents(s.data || []);
    setClasses(c.data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = students.filter(
    (s) =>
      (!classFilter || s.class_id === classFilter) &&
      (!q || s.full_name.toLowerCase().includes(q.toLowerCase()) || s.nis.includes(q))
  );

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const payload: any = {
      nis: form.nis.trim(),
      full_name: form.full_name.trim(),
      class_id: form.class_id || null,
      parent_name: form.parent_name || null,
      parent_phone: form.parent_phone || null,
      parent_email: form.parent_email || null,
    };
    const { error } = form.id
      ? await supabase.from('students').update(payload).eq('id', form.id)
      : await supabase.from('students').insert(payload);
    if (error) return setMsg(error.message.includes('duplicate') ? 'NIS sudah dipakai.' : error.message);
    setForm(null);
    load();
  }

  async function toggleActive(s: any) {
    await supabase.from('students').update({ active: !s.active }).eq('id', s.id);
    load();
  }

  async function remove(s: any) {
    if (!confirm(`Hapus ${s.full_name}? Seluruh riwayat presensinya ikut terhapus.`)) return;
    await supabase.from('students').delete().eq('id', s.id);
    load();
  }

  async function resetFace(s: any) {
    if (!confirm(`Hapus data wajah ${s.full_name}?`)) return;
    await supabase.from('students').update({ face_descriptors: [] }).eq('id', s.id);
    load();
  }

  async function makeCards(list: any[]) {
    const out = [];
    for (const s of list) out.push({ s, img: await QRCode.toDataURL(s.qr_code, { margin: 1, width: 280 }) });
    setCards(out);
  }

  if (cards)
    return (
      <>
        <PageHead title="Kartu QR Siswa" sub={`${cards.length} kartu siap dicetak`}>
          <button onClick={() => window.print()}><Printer size={16} /> Cetak kartu</button>
          <button className="ghost" onClick={() => setCards(null)}><ArrowLeft size={16} /> Kembali</button>
        </PageHead>
        <div className="qr-sheet">
          {cards.map(({ s, img }) => (
            <div className="qr-card" key={s.id}>
              <img src={img} alt={`QR ${s.full_name}`} />
              <div><strong>{s.full_name}</strong></div>
              <div style={{ fontSize: 12 }}>NIS {s.nis} · {s.classes?.name || '-'}</div>
            </div>
          ))}
        </div>
      </>
    );

  const activeCount = filtered.filter((s) => s.active).length;

  return (
    <>
      <PageHead title="Data Siswa" sub={`${students.length} siswa terdaftar`}>
        {isAdmin && <button onClick={() => { setMsg(''); setForm({ ...EMPTY }); }}><Plus size={16} /> Tambah siswa</button>}
        <button className="ghost" onClick={() => makeCards(filtered.filter((s) => s.active))} disabled={!activeCount}><QrCode size={16} /> Cetak kartu QR ({activeCount})</button>
      </PageHead>

      <div className="card">
        <div className="row" style={{ marginBottom: 0 }}>
          <div className="input-icon">
            <Search size={17} />
            <input placeholder="Cari nama atau NIS…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">Semua kelas</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Siswa</th><th>Kelas</th><th>Wali</th><th>Wajah</th><th style={{ textAlign: 'right' }}>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} style={{ opacity: s.active ? 1 : 0.5 }}>
                  <td>
                    <div className="cell-user">
                      <Avatar name={s.full_name} />
                      <div><div style={{ fontWeight: 600 }}>{s.full_name}</div><div className="muted">NIS {s.nis}{!s.active && ' · nonaktif'}</div></div>
                    </div>
                  </td>
                  <td>{s.classes?.name || '-'}</td>
                  <td>{s.parent_name || '-'}<div className="muted">{s.parent_phone}</div></td>
                  <td>{(s.face_descriptors || []).length ? <span className="badge b-hadir">Terdaftar</span> : <span className="badge b-alpha">Belum</span>}</td>
                  <td>
                    <div className="actions" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                      {isAdmin && <button className="ghost icon-only" title="Daftarkan wajah" onClick={() => setEnroll(s)}><ScanFace size={16} /></button>}
                      <button className="ghost icon-only" title="Kartu QR" onClick={() => makeCards([s])}><QrCode size={16} /></button>
                      {isAdmin && <button className="ghost icon-only" title="Ubah" onClick={() => { setMsg(''); setForm({ ...EMPTY, ...s, class_id: s.class_id || '' }); }}><Pencil size={16} /></button>}
                      {isAdmin && (s.face_descriptors || []).length > 0 && <button className="ghost icon-only" title="Hapus data wajah" onClick={() => resetFace(s)}><ShieldOff size={16} /></button>}
                      {isAdmin && <button className="ghost icon-only" title={s.active ? 'Nonaktifkan' : 'Aktifkan'} onClick={() => toggleActive(s)}><Power size={16} /></button>}
                      {isAdmin && <button className="danger icon-only" title="Hapus siswa" onClick={() => remove(s)}><Trash2 size={16} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan={5} className="empty">Belum ada data.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <div className="modal-bg" onClick={() => setForm(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
            <div className="modal-head">
              <h3>{form.id ? 'Ubah siswa' : 'Tambah siswa'}</h3>
              <button type="button" className="icon-btn" onClick={() => setForm(null)} aria-label="Tutup"><X size={20} /></button>
            </div>
            <div className="row">
              <div><label>NIS</label><input required value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} /></div>
              <div><label>Nama lengkap</label><input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            </div>
            <div className="row">
              <div>
                <label>Kelas</label>
                <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
                  <option value="">— pilih —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label>Nama wali</label><input value={form.parent_name || ''} onChange={(e) => setForm({ ...form, parent_name: e.target.value })} /></div>
            </div>
            <div className="row">
              <div><label>No. HP wali (WhatsApp)</label><input value={form.parent_phone || ''} onChange={(e) => setForm({ ...form, parent_phone: e.target.value })} placeholder="08xxxxxxxxxx" /></div>
              <div><label>Email wali</label><input type="email" value={form.parent_email || ''} onChange={(e) => setForm({ ...form, parent_email: e.target.value })} /></div>
            </div>
            {msg && <div className="alert err" style={{ marginBottom: 14 }}>{msg}</div>}
            <div className="actions" style={{ justifyContent: 'flex-end' }}>
              <button type="button" className="ghost" onClick={() => setForm(null)}>Batal</button>
              <button>Simpan</button>
            </div>
          </form>
        </div>
      )}

      {enroll && <FaceEnroll student={enroll} onClose={() => setEnroll(null)} onSaved={load} />}
    </>
  );
}
