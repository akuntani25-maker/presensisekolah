'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
      <h2>Kelas</h2>
      <form className="card actions" onSubmit={add}>
        <input style={{ maxWidth: 260 }} placeholder="Contoh: X IPA 1" value={name} onChange={(e) => setName(e.target.value)} required />
        <button>Tambah kelas</button>
        {msg && <span className="err">{msg}</span>}
      </form>
      <div className="card">
        <table>
          <thead><tr><th>Nama kelas</th><th></th></tr></thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id}><td>{c.name}</td><td style={{ textAlign: 'right' }}><button className="danger" onClick={() => remove(c)}>Hapus</button></td></tr>
            ))}
            {!classes.length && <tr><td colSpan={2} className="muted">Belum ada kelas.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
