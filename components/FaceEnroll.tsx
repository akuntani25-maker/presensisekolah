'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadFaceApi, startCamera, stopCamera, DETECTOR_OPTS } from '@/lib/face';

const SAMPLES = 5;

export default function FaceEnroll({ student, onClose, onSaved }: { student: any; onClose: () => void; onSaved: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState('Memuat model wajah…');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadFaceApi();
        if (cancelled || !videoRef.current) return;
        streamRef.current = await startCamera(videoRef.current);
        setReady(true);
        setStatus('Kamera siap. Minta siswa menghadap kamera, lalu tekan “Ambil sampel wajah”.');
      } catch (e: any) {
        setErr('Tidak bisa mengakses kamera/model: ' + (e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
      stopCamera(streamRef.current);
    };
  }, []);

  async function capture() {
    setErr('');
    setBusy(true);
    try {
      const faceapi = await loadFaceApi();
      const descriptors: number[][] = [];
      let tries = 0;
      while (descriptors.length < SAMPLES && tries < 40) {
        tries++;
        setStatus(`Mengambil sampel ${descriptors.length + 1} dari ${SAMPLES}… (ubah sedikit sudut kepala)`);
        const det = await faceapi
          .detectSingleFace(videoRef.current, DETECTOR_OPTS(faceapi))
          .withFaceLandmarks()
          .withFaceDescriptor();
        if (det) {
          descriptors.push(Array.from(det.descriptor as Float32Array).map((n) => Math.round(n * 1e5) / 1e5));
          await new Promise((r) => setTimeout(r, 600));
        } else {
          await new Promise((r) => setTimeout(r, 250));
        }
      }
      if (descriptors.length < SAMPLES) {
        setErr('Wajah kurang terdeteksi. Pastikan pencahayaan cukup dan hanya satu wajah di kamera.');
        setStatus('Coba lagi.');
        return;
      }
      const { error } = await supabase.from('students').update({ face_descriptors: descriptors }).eq('id', student.id);
      if (error) throw error;
      setStatus('Wajah berhasil didaftarkan.');
      onSaved();
      setTimeout(onClose, 700);
    } catch (e: any) {
      setErr('Gagal menyimpan: ' + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Daftarkan wajah: {student.full_name}</h3>
        <div className="video-box"><video ref={videoRef} muted playsInline /></div>
        <p className="muted">{status}</p>
        {err && <p className="err">{err}</p>}
        <div className="actions">
          <button onClick={capture} disabled={!ready || busy}>{busy ? 'Memproses…' : 'Ambil sampel wajah'}</button>
          <button className="ghost" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
