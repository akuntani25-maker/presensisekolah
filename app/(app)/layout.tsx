'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ProfileCtx as Ctx, type Profile } from '@/lib/profile';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/kiosk', label: 'Kiosk Presensi' },
  { href: '/leaves', label: 'Izin / Sakit' },
  { href: '/reports', label: 'Rekap & Ekspor' },
  { href: '/students', label: 'Data Siswa' },
  { href: '/classes', label: 'Kelas', admin: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'noprofile'>('loading');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace('/login');
      const { data: p } = await supabase.from('profiles').select('*').eq('id', data.session.user.id).maybeSingle();
      if (!active) return;
      if (!p) return setState('noprofile');
      setProfile(p as Profile);
      setState('ok');
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.replace('/login');
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (state === 'loading') return <div className="login"><p className="muted">Memuat…</p></div>;
  if (state === 'noprofile')
    return (
      <div className="login">
        <div className="card">
          <p>Akun Anda belum memiliki profil staf. Hubungi admin.</p>
          <button onClick={logout}>Keluar</button>
        </div>
      </div>
    );

  // Kiosk memakai layar penuh tanpa sidebar
  if (path.startsWith('/kiosk')) return <Ctx.Provider value={{ profile }}>{children}</Ctx.Provider>;

  return (
    <Ctx.Provider value={{ profile }}>
      <div className="shell">
        <aside className="side">
          <h1>Presensi Sekolah</h1>
          {NAV.filter((n) => !n.admin || profile?.role === 'admin').map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? 'active' : ''}>
              {n.label}
            </Link>
          ))}
          <div className="spacer" />
          <div className="who">{profile?.full_name} ({profile?.role})</div>
          <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Keluar</a>
        </aside>
        <main className="main">{children}</main>
      </div>
    </Ctx.Provider>
  );
}
