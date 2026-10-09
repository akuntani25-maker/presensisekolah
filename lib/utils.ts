export const TZ = 'Asia/Makassar'; // WITA (Mataram / NTB)

/** Tanggal hari ini (YYYY-MM-DD) pada zona waktu sekolah */
export function todayStr(d: Date = new Date(), tz: string = TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Jam sekarang (HH:MM:SS) pada zona waktu sekolah */
export function timeStr(d: Date = new Date(), tz: string = TZ) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(d);
}

export function fmtTime(iso?: string | null) {
  if (!iso) return '-';
  return timeStr(new Date(iso)).slice(0, 5);
}

export function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/** Normalisasi nomor HP Indonesia ke format 62xxxxxxxx untuk tautan WhatsApp */
export function waNumber(phone?: string | null) {
  if (!phone) return '';
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '62' + p.slice(1);
  return p;
}

export const STATUS_LABEL: Record<string, string> = {
  hadir: 'Hadir',
  terlambat: 'Terlambat',
  izin: 'Izin',
  sakit: 'Sakit',
  alpha: 'Alpha',
};
