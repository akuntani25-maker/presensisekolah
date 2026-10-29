'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ScanFace, FileHeart, FileBarChart, Users, School, LogOut, Menu, ScanLine, Settings, ClipboardCheck, CalendarOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ProfileCtx as Ctx, type Profile } from '@/lib/profile';
import { Avatar, ThemeToggle } from '@/components/ui';

const NAV = [
  { group: 'Utama' },
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kiosk', label: 'Presensi', icon: ScanFace },
  { group: 'Kehadiran' },
  { href: '/attendance', label: 'Presensi Manual', icon: ClipboardCheck },
  { href: '/leaves', label: 'Izin / Sakit', icon: FileHeart },
  { href: '/reports', label: 'Rekap & Ekspor', icon: FileBarChart },
  { group: 'Data Master' },
  { href: '/students', label: 'Data Siswa', icon: Users },
  { href: '/classes', label: 'Kelas', icon: School, admin: true },
  { href: '/holidays', label: 'Hari Libur', icon: CalendarOff, admin: true },
  { group: 'Sistem', admin: true },
  { href: '/settings', label: 'Pengaturan', icon: Settings, admin: true },
] as any[];

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/attendance': 'Presensi Manual',
  '/leaves': 'Izin / Sakit',
  '/reports': 'Rekap & Ekspor',
  '/students': 'Data Siswa',
  '/classes': 'Kelas',
  '/holidays': 'Hari Libur',
  '/settings': 'Pengaturan',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'noprofile'>('loading');
  const [open, setOpen] = useState(false);

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

  useEffect(() => setOpen(false), [path]);

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
          <button onClick={logout}><LogOut size={16} /> Keluar</button>
        </div>
      </div>
    );

  // Kiosk memakai layar penuh tanpa sidebar
  if (path.startsWith('/kiosk')) return <Ctx.Provider value={{ profile }}>{children}</Ctx.Provider>;

  return (
    <Ctx.Provider value={{ profile }}>
      <div className="shell">
        <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />
        <aside className={`sidebar ${open ? 'open' : ''}`}>
          <div className="brand">
            <div className="brand-logo"><ScanLine size={20} /></div>
            Presensi
          </div>
          <nav className="nav">
            {NAV.filter((n) => !n.admin || profile?.role === 'admin').map((n, i) =>
              n.group ? (
                <div key={i} className="nav-group">{n.group}</div>
              ) : (
                <Link key={n.href} href={n.href} className={path === n.href ? 'active' : ''}>
                  <n.icon size={19} />
                  {n.label}
                </Link>
              )
            )}
          </nav>
          <div className="side-foot">
            <button className="ghost" style={{ width: '100%' }} onClick={logout}><LogOut size={16} /> Keluar</button>
          </div>
        </aside>

        <div className="content">
          <header className="topbar no-print">
            <div className="left">
              <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Menu"><Menu size={22} /></button>
              <strong style={{ fontSize: 16 }}>{TITLES[path] || 'Presensi Sekolah'}</strong>
            </div>
            <div className="user-chip">
              <ThemeToggle />
              <div className="who" style={{ textAlign: 'right' }}>
                <div className="name">{profile?.full_name}</div>
                <div className="role">{profile?.role === 'admin' ? 'Administrator' : 'Guru'}</div>
              </div>
              <Avatar name={profile?.full_name} />
            </div>
          </header>
          <main className="main">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
