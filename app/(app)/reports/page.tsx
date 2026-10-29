'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ListFilter, FileSpreadsheet, Printer, Rows3, History, Image as ImageIcon, X, Camera } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHead, Avatar } from '@/components/ui';
import { todayStr, fmtDate, fmtTime, STATUS_LABEL } from '@/lib/utils';
import { signedSnapshotUrls } from '@/lib/snapshots';

type View = 'rekap' | 'detail' | 'riwayat';

function firstOfMonth() {
  const t = todayStr();
  return t.slice(0, 8) + '01';
}

export default function ReportsPage() {
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayStr());
  const [classId, setClassId] = useState('');
  const [classes, setClasses] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>('rekap');
  const [picked, setPicked] = useState<any | null>(null); // untuk tab Riwayat
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ url: string; sub: string } | null>(null);

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => setClasses(data || []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let all: any[] = [];
    for (let page = 0; page < 50; page++) {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, students!inner(full_name, nis, class_id, classes(name))')
        .gte('date', from)
        .lte('date', to)
        .match(classId ? { 'students.class_id': classId } : {})
        .order('date', { ascending: true })
        .range(page * 1000, page * 1000 + 999);
      if (error) { alert(error.message); break; }
      all = all.concat(data || []);
      if (!data || data.length < 1000) break;
    }
    setRows(all);
    setLoading(false);
  }, [from, to, classId]);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const summary = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of rows) {
      const k = r.student_id;
      if (!m.has(k)) m.set(k, { student_id: k, nama: r.students.full_name, nis: r.students.nis, kelas: r.students.classes?.name || '-', hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0 });
      m.get(k)[r.status]++;
    }
    return [...m.values()].sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama));
  }, [rows]);

  // Riwayat per siswa yang dipilih (dengan thumbnail dari Storage)
  const studentRows = useMemo(
    () => (picked ? rows.filter((r) => r.student_id === picked.student_id).slice().reverse() : []),
    [rows, picked]
  );

  useEffect(() => {
    if (!picked) { setThumbs({}); return; }
    const paths = studentRows.map((r) => r.snapshot_path).filter(Boolean);
    if (!paths.length) { setThumbs({}); return; }
    let active = true;
    signedSnapshotUrls(paths, 3600).then((map) => { if (active) setThumbs(map); });
    return () => { active = false; };
  }, [picked, studentRows]);

  async function exportXlsx() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        summary.map((s) => ({ NIS: s.nis, Nama: s.nama, Kelas: s.kelas, Hadir: s.hadir, Terlambat: s.terlambat, Izin: s.izin, Sakit: s.sakit, Alpha: s.alpha }))
      ),
      'Rekap'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        rows.map((r) => ({
          Tanggal: r.date,
          NIS: r.students.nis,
          Nama: r.students.full_name,
          Kelas: r.students.classes?.name || '-',
          Status: STATUS_LABEL[r.status],
          Jam: fmtTime(r.check_in),
          Cara: r.method,
          Catatan: r.note || '',
        }))
      ),
      'Detail'
    );
    XLSX.writeFile(wb, `presensi_${from}_sd_${to}.xlsx`);
  }

  const nextView: Record<View, View> = { rekap: 'detail', detail: 'riwayat', rekap_: 'rekap' } as any;
  nextView.riwayat = 'rekap';
  const viewLabel: Record<View, string> = { rekap: 'Detail harian', detail: 'Riwayat + foto', riwayat: 'Rekap per siswa' };

  return (
    <>
      <PageHead title="Rekap & Ekspor" sub="Laporan kehadiran per periode dan kelas" />
      <div className="card no-print">
        <div className="row">
          <div><label>Dari</label><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label>Sampai</label><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <label>Kelas</label>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Semua kelas</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="actions">
          <button onClick={load} disabled={loading}><Search size={16} /> {loading ? 'Memuat…' : 'Tampilkan'}</button>
          <button className="ghost" onClick={() => setView(nextView[view])}>
            {view === 'rekap' ? <Rows3 size={16} /> : view === 'detail' ? <History size={16} /> : <ListFilter size={16} />} {viewLabel[view]}
          </button>
          <button className="ghost" onClick={exportXlsx} disabled={!rows.length}><FileSpreadsheet size={16} /> Ekspor Excel</button>
          <button className="ghost" onClick={() => window.print()} disabled={!rows.length}><Printer size={16} /> Cetak / PDF</button>
        </div>
      </div>

      <div className="card table-wrap">
        <div className="card-title">
          {view === 'rekap' && 'Rekap per siswa'}
          {view === 'detail' && 'Detail harian'}
          {view === 'riwayat' && `Riwayat presensi ${picked ? '— ' + picked.nama : ''}`}
        </div>
        <div className="card-sub">Periode {fmtDate(from)} – {fmtDate(to)} · {rows.length} catatan</div>

        {view === 'rekap' && (
          <table>
            <thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Alpha</th><th></th></tr></thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.nis}>
                  <td>{s.nis}</td>
                  <td style={{ fontWeight: 600 }}>{s.nama}</td>
                  <td>{s.kelas}</td>
                  <td>{s.hadir}</td><td>{s.terlambat}</td><td>{s.izin}</td><td>{s.sakit}</td><td>{s.alpha}</td>
                  <td><button className="ghost sm" onClick={() => { setPicked(s); setView('riwayat'); }}><History size={14} /> Riwayat</button></td>
                </tr>
              ))}
              {!summary.length && <tr><td colSpan={9} className="empty">Tidak ada data pada periode ini.</td></tr>}
            </tbody>
          </table>
        )}

        {view === 'detail' && (
          <table>
            <thead><tr><th>Tanggal</th><th>Nama</th><th>Kelas</th><th>Status</th><th>Jam</th><th>Cara</th><th>Catatan</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.date)}</td><td>{r.students.full_name}</td><td>{r.students.classes?.name || '-'}</td>
                  <td><span className={`badge b-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                  <td>{fmtTime(r.check_in)}</td><td>{r.method}</td><td>{r.note || ''}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="empty">Tidak ada data pada periode ini.</td></tr>}
            </tbody>
          </table>
        )}

        {view === 'riwayat' && !picked && (
          <p className="empty">Pilih siswa dari tab <strong>Rekap per siswa</strong> terlebih dulu.</p>
        )}

        {view === 'riwayat' && picked && (
          <>
            <div className="actions no-print" style={{ marginBottom: 12 }}>
              <div className="cell-user"><Avatar name={picked.nama} /><div><div style={{ fontWeight: 600 }}>{picked.nama}</div><div className="muted">NIS {picked.nis} · {picked.kelas}</div></div></div>
              <span style={{ flex: 1 }} />
              <button className="ghost" onClick={() => setView('rekap')}>Kembali ke rekap</button>
            </div>
            <table>
              <thead>
                <tr><th style={{ width: 92 }}>Bukti</th><th>Tanggal</th><th>Jam</th><th>Status</th><th>Cara</th><th>Catatan</th></tr>
              </thead>
              <tbody>
                {studentRows.map((r) => {
                  const url = r.snapshot_path ? thumbs[r.snapshot_path] : null;
                  const sub = `${fmtDate(r.date)} · ${fmtTime(r.check_in)} · ${STATUS_LABEL[r.status]}`;
                  return (
                    <tr key={r.id}>
                      <td>
                        {url ? (
                          <img
                            src={url}
                            alt={`Bukti presensi ${sub}`}
                            onClick={() => setLightbox({ url, sub })}
                            style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, cursor: 'zoom-in', border: '1px solid var(--line)' }}
                          />
                        ) : (
                          <div style={{ width: 72, height: 54, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--tone-muted)', color: 'var(--muted)' }}>
                            <ImageIcon size={18} />
                          </div>
                        )}
                      </td>
                      <td>{fmtDate(r.date)}</td>
                      <td>{fmtTime(r.check_in)}</td>
                      <td><span className={`badge b-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
                      <td>{r.method === 'face' ? <><Camera size={12} /> Wajah</> : r.method === 'qr' ? 'QR' : 'Manual'}</td>
                      <td>{r.note || ''}</td>
                    </tr>
                  );
                })}
                {!studentRows.length && <tr><td colSpan={6} className="empty">Belum ada catatan untuk siswa ini.</td></tr>}
              </tbody>
            </table>
          </>
        )}
      </div>

      {lightbox && (
        <div className="modal-bg" onClick={() => setLightbox(null)}>
          <div className="modal" style={{ maxWidth: 720, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Bukti presensi</h3>
              <button className="icon-btn" onClick={() => setLightbox(null)} aria-label="Tutup"><X size={20} /></button>
            </div>
            <img src={lightbox.url} alt="Bukti presensi" style={{ maxWidth: '100%', borderRadius: 10 }} />
            <p className="muted" style={{ marginTop: 10 }}>{lightbox.sub}</p>
          </div>
        </div>
      )}
    </>
  );
}
