'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setErr('Email atau kata sandi salah.');
    router.replace('/');
  }

  return (
    <div className="login">
      <form className="card" onSubmit={onSubmit}>
        <h2 style={{ marginTop: 0 }}>Presensi Sekolah</h2>
        <p className="muted">Masuk sebagai admin atau guru.</p>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label>Kata sandi</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        {err && <p className="err">{err}</p>}
        <button disabled={loading} style={{ width: '100%' }}>{loading ? 'Memproses…' : 'Masuk'}</button>
      </form>
    </div>
  );
}
