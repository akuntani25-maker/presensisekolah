import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Presensi Sekolah',
  description: 'Aplikasi presensi sekolah dengan scan wajah dan kartu QR',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
