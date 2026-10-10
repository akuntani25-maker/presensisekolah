'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import jsQR from 'jsqr';
import { ArrowLeft, CheckCircle2, TriangleAlert, XCircle, ScanFace, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { loadFaceApi, startCamera, stopCamera, DETECTOR_OPTS } from '@/lib/face';
import { notifyParent } from '@/lib/notify';
import { todayStr, timeStr } from '@/lib/utils';

type Result = { kind: 'idle' | 'ok' | 'warn' | 'bad'; text: string; sub?: string };
const MATCH_THRESHOLD = 0.5; // makin kecil makin ketat
const STREAK_NEEDED = 2; // wajah harus cocok di 2 bingkai berturut-turut
const COOLDOWN_MS = 6000;

export default function KioskPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const studentsRef = useRef<any[]>([]);
  const classesRef = useRef<Map<string, { late_after: string | null; start_time: string | null }>>(new Map());
  const matcherRef = useRef<any>(null);
  const faceapiRef = useRef<any>(null);
  const settingsRef = useRef<any>({ late_after: '07:15:00', timezone: 'Asia/Makassar', school_name: '' });
  const doneRef = useRef<Set<string>>(new Set());
  const cooldownRef = useRef<Map<string, number>>(new Map());
  const streakRef = useRef<{ id: string; n: number }>({ id: '', n: 0 });
  const busyRef = useRef(false);
  const stopRef = useRef(false);
  const resetTimer = useRef<any>(null);

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const [result, setResult] = useState<Result>({ kind: 'idle', text: 'Hadapkan wajah ke kamera atau tunjukkan kartu QR' });
  const [log, setLog] = useState<{ name: string; time: string; status: string; method: string }[]>([]);
  const [clock, setClock] = useState('');
  const [counts, setCounts] = useState({ present: 0, total: 0 });

  const show = useCallback((r: Result) => {
    setResult(r);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(
      () => setResult({ kind: 'idle', text: 'Hadapkan wajah ke kamera atau tunjukkan kartu QR' }),
      3500
    );
  }, []);

  const record = useCallback(
    async (student: any, method: 'face' | 'qr') => {
      const now = Date.now();
      if ((cooldownRef.current.get(student.id) || 0) > now) return;
      cooldownRef.current.set(student.id, now + COOLDOWN_MS);

      if (doneRef.current.has(student.id)) {
        return show({ kind: 'warn', text: `${student.full_name}`, sub: 'Sudah presensi hari ini' });
      }
      const cfg = settingsRef.current;
      const date = todayStr(new Date(), cfg.timezone);
      const time = timeStr(new Date(), cfg.timezone);
      // Pakai batas terlambat milik kelas siswa; jika kelas tidak punya, pakai global
      const classLate = student.class_id ? classesRef.current.get(student.class_id)?.late_after : null;
      const threshold = classLate || cfg.late_after;
      const status = time > threshold ? 'terlambat' : 'hadir';

      const { error } = await supabase
        .from('attendance')
        .insert({ student_id: student.id, date, check_in: new Date().toISOString(), status, method });

      if (error) {
        if (error.code === '23505') {
          // sudah ada catatan (misal izin/sakit atau presensi dari kiosk lain)
          doneRef.current.add(student.id);
          return show({ kind: 'warn', text: student.full_name, sub: 'Sudah tercatat hari ini' });
        }
        return show({ kind: 'bad', text: 'Gagal menyimpan', sub: error.message });
      }
      doneRef.current.add(student.id);
      setCounts((c) => ({ ...c, present: c.present + 1 }));
      setLog((l) => [{ name: student.full_name, time: time.slice(0, 5), status, method }, ...l].slice(0, 12));
      show({
        kind: status === 'hadir' ? 'ok' : 'warn',
        text: student.full_name,
        sub: status === 'hadir' ? `Presensi berhasil · ${time.slice(0, 5)}` : `Terlambat · ${time.slice(0, 5)}`,
      });
      notifyParent({ student_id: student.id, status, time: time.slice(0, 5) });
    },
    [show]
  );

  // Inisialisasi: data, model, kamera
  useEffect(() => {
    stopRef.current = false;
    (async () => {
      try {
        const faceapi = await loadFaceApi();
        faceapiRef.current = faceapi;

        const [{ data: cfg }, { data: studs }, { data: cls }] = await Promise.all([
          supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
          supabase.from('students').select('id, nis, full_name, qr_code, face_descriptors, class_id').eq('active', true),
          supabase.from('classes').select('id, late_after, start_time'),
        ]);
        if (cfg) settingsRef.current = cfg;
        studentsRef.current = studs || [];
        classesRef.current = new Map((cls || []).map((c: any) => [c.id, { late_after: c.late_after, start_time: c.start_time }]));

        const labeled = (studs || [])
          .filter((s: any) => Array.isArray(s.face_descriptors) && s.face_descriptors.length)
          .map(
            (s: any) =>
              new faceapi.LabeledFaceDescriptors(
                s.id,
                s.face_descriptors.map((d: number[]) => new Float32Array(d))
              )
          );
        matcherRef.current = labeled.length ? new faceapi.FaceMatcher(labeled, MATCH_THRESHOLD) : null;

        const date = todayStr(new Date(), settingsRef.current.timezone);
        const { data: att } = await supabase.from('attendance').select('student_id').eq('date', date);
        doneRef.current = new Set((att || []).map((a: any) => a.student_id));
        setCounts({ present: doneRef.current.size, total: (studs || []).length });

        if (!videoRef.current) return;
        streamRef.current = await startCamera(videoRef.current);
        setPhase('ready');
        loop();
      } catch (e: any) {
        setPhase('error');
        setErrMsg(e?.message || String(e));
      }
    })();

    const t = setInterval(() => setClock(timeStr(new Date(), settingsRef.current.timezone)), 1000);
    return () => {
      stopRef.current = true;
      clearInterval(t);
      clearTimeout(resetTimer.current);
      stopCamera(streamRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loop() {
    if (stopRef.current) return;
    const video = videoRef.current;
    if (video && video.readyState >= 2 && !busyRef.current) {
      busyRef.current = true;
      try {
        // 1) QR dari bingkai yang sama
        const canvas = canvasRef.current!;
        const w = video.videoWidth, h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
          ctx.drawImage(video, 0, 0, w, h);
          const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
          if (code?.data) {
            const s = studentsRef.current.find((x) => x.qr_code === code.data.trim());
            if (s) await record(s, 'qr');
          }
        }

        // 2) Wajah
        const faceapi = faceapiRef.current;
        if (faceapi && matcherRef.current) {
          const det = await faceapi
            .detectSingleFace(video, DETECTOR_OPTS(faceapi))
            .withFaceLandmarks()
            .withFaceDescriptor();
          if (det) {
            const best = matcherRef.current.findBestMatch(det.descriptor);
            if (best.label !== 'unknown') {
              const st = streakRef.current;
              streakRef.current = st.id === best.label ? { id: best.label, n: st.n + 1 } : { id: best.label, n: 1 };
              if (streakRef.current.n >= STREAK_NEEDED) {
                const s = studentsRef.current.find((x) => x.id === best.label);
                if (s) await record(s, 'face');
              }
            } else {
              streakRef.current = { id: '', n: 0 };
            }
          } else {
            streakRef.current = { id: '', n: 0 };
          }
        }
      } catch {
        /* abaikan galat bingkai tunggal */
      } finally {
        busyRef.current = false;
      }
    }
    setTimeout(loop, 350);
  }

  return (
    <div className="kiosk">
      <div>
        <div className="actions" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div className="clock">{clock}</div>
            <div style={{ color: '#9fb2c7' }}>{settingsRef.current.school_name}</div>
          </div>
          <Link href="/" className="btn ghost"><ArrowLeft size={16} /> Keluar kiosk</Link>
        </div>
        <div className="video-box">
          <video ref={videoRef} muted playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        {phase === 'loading' && <p style={{ color: '#9fb2c7' }}>Memuat model wajah & kamera…</p>}
        {phase === 'error' && <p style={{ color: '#ff8a85' }}>Gagal memulai kiosk: {errMsg}</p>}
        {phase === 'ready' && !matcherRef.current && (
          <p style={{ color: '#ffd37a' }}>Belum ada wajah yang didaftarkan. Presensi hanya bisa lewat kartu QR.</p>
        )}
      </div>
      <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
        <div className={`result ${result.kind}`}>
          {result.kind === 'ok' ? <CheckCircle2 size={46} /> : result.kind === 'warn' ? <TriangleAlert size={46} /> : result.kind === 'bad' ? <XCircle size={46} /> : <ScanFace size={46} />}
          <div style={{ fontWeight: 700, fontSize: 26 }}>{result.text}</div>
          {result.sub && <div style={{ marginTop: 6 }}>{result.sub}</div>}
        </div>
        <div className="panel">
          <div style={{ marginBottom: 8, color: '#9fb2c7', display: 'flex', alignItems: 'center', gap: 8 }}><Users size={17} /> Sudah presensi: <strong style={{ color: '#fff' }}>{counts.present}</strong> / {counts.total}</div>
          <ul className="log">
            {log.map((l, i) => (
              <li key={i}>
                <span>{l.name}</span>
                <span style={{ color: '#9fb2c7' }}>{l.time} · {l.status} · {l.method === 'face' ? 'wajah' : 'QR'}</span>
              </li>
            ))}
            {!log.length && <li style={{ color: '#9fb2c7' }}>Belum ada presensi pada sesi ini.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}
