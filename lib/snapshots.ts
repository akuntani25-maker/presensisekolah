import { supabase } from '@/lib/supabase';

export const SNAPSHOT_BUCKET = 'attendance-snapshots';

/** Kompres canvas ke JPEG kecil (~15–40 KB per gambar). */
export function canvasToJpegBlob(src: HTMLCanvasElement | HTMLVideoElement, maxWidth = 480, quality = 0.6): Promise<Blob | null> {
  const srcW = src instanceof HTMLVideoElement ? src.videoWidth : src.width;
  const srcH = src instanceof HTMLVideoElement ? src.videoHeight : src.height;
  if (!srcW || !srcH) return Promise.resolve(null);
  const scale = Math.min(1, maxWidth / srcW);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(src as any, 0, 0, w, h);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

/** Unggah foto bukti presensi. Path: YYYY/MM/<attendance_id>.jpg */
export async function uploadSnapshot(attendanceId: string, blob: Blob, date: string) {
  const [y, m] = date.split('-');
  const path = `${y}/${m}/${attendanceId}.jpg`;
  const { error } = await supabase.storage.from(SNAPSHOT_BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) return null;
  return path;
}

/** Buat signed URL untuk melihat foto; dipakai di halaman riwayat. */
export async function signedSnapshotUrls(paths: string[], expiresInSec = 3600) {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await supabase.storage.from(SNAPSHOT_BUCKET).createSignedUrls(unique, expiresInSec);
  const out: Record<string, string> = {};
  for (const r of data || []) if (r.path && r.signedUrl) out[r.path] = r.signedUrl;
  return out;
}
