'use client';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHead } from '@/components/ui';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    setClasses(data || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.from('classes').insert({ name: name.trim() });
    if (error) return setMsg(error.message.includes('duplicate') ? 'Nama kelas sudah ada.' : error.message);
    setName('');
    load();
  }

  async function remove(c: any) {
    if (!confirm(`Hapus kelas ${c.name}? Siswa di kelas ini menjadi tanpa kelas.`)) return;
    await supabase.from('classes').delete().eq('id', c.id);
    load();
  }

  return (
    <>
      <PageHead title="Kelas" sub="Kelola daftar kelas di sekolah" />
      <form className="card" onSubmit={add}>
        <div className="card-title">Tambah kelas</div>
        <div className="card-sub">Contoh: X IPA 1, VII A</div>
        <div className="actions">
          <input style={{ maxWidth: 280 }} placeholder="Nama kelas" value={name} onChange={(e) => setName(e.target.value)} required />
          <button><Plus size={16} /> Tambah</button>
          {msg && <span className="err">{msg}</span>}
        </div>
      </form>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 14 }}>Daftar kelas ({classes.length})</div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nama kelas</th><th style={{ width: 80 }}></th></tr></thead>
            <tbody>
              {classes.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ textAlign: 'right' }}><button className="danger icon-only" onClick={() => remove(c)} aria-label="Hapus"><Trash2 size={16} /></button></td>
                </tr>
              ))}
              {!classes.length && <tr><td colSpan={2} className="empty">Belum ada kelas.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
