'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScanLine, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
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
        <div className="brand">
          <div className="brand-logo"><ScanLine size={20} /></div>
          Presensi Sekolah
        </div>
        <h2 style={{ fontSize: 20 }}>Selamat datang</h2>
        <p className="muted" style={{ margin: '4px 0 22px' }}>Masuk sebagai admin atau guru untuk melanjutkan.</p>
        <div className="field">
          <label>Email</label>
          <div className="input-icon">
            <Mail size={17} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" placeholder="nama@sekolah.sch.id" />
          </div>
        </div>
        <div className="field">
          <label>Kata sandi</label>
          <div className="input-icon">
            <Lock size={17} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
          </div>
        </div>
        {err && <div className="alert err" style={{ marginBottom: 14 }}><AlertCircle size={16} /> {err}</div>}
        <button disabled={loading} style={{ width: '100%', padding: 12 }}>
          <LogIn size={17} /> {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  );
}
