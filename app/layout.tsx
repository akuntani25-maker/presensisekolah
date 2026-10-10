import '@fontsource-variable/plus-jakarta-sans';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Presensi Sekolah',
  description: 'Aplikasi presensi sekolah dengan scan wajah dan kartu QR',
};

// Diterapkan sebelum React render supaya mode gelap tidak berkedip saat halaman dimuat
const themeInit = `try{var t=localStorage.getItem('theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
