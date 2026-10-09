'use client';
import { useEffect, useMemo, useState } from 'react';
import { Search, ListFilter, FileSpreadsheet, Printer, Rows3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHead } from '@/components/ui';
import { todayStr, fmtDate, fmtTime, STATUS_LABEL } from '@/lib/utils';

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
  const [view, setView] = useState<'rekap' | 'detail'>('rekap');

  useEffect(() => {
    supabase.from('classes').select('*').order('name').then(({ data }) => setClasses(data || []));
  }, []);

  async function load() {
    setLoading(true);
    // Ambil per halaman 1000 baris agar tidak terpotong batas default Supabase
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
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const summary = useMemo(() => {
    const m = new Map<string, any>();
    for (const r of rows) {
      const k = r.student_id;
      if (!m.has(k)) m.set(k, { nama: r.students.full_name, nis: r.students.nis, kelas: r.students.classes?.name || '-', hadir: 0, terlambat: 0, izin: 0, sakit: 0, alpha: 0 });
      m.get(k)[r.status]++;
    }
    return [...m.values()].sort((a, b) => a.kelas.localeCompare(b.kelas) || a.nama.localeCompare(b.nama));
  }, [rows]);

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
          <button className="ghost" onClick={() => setView(view === 'rekap' ? 'detail' : 'rekap')}>{view === 'rekap' ? <Rows3 size={16} /> : <ListFilter size={16} />} {view === 'rekap' ? 'Detail harian' : 'Rekap per siswa'}</button>
          <button className="ghost" onClick={exportXlsx} disabled={!rows.length}><FileSpreadsheet size={16} /> Ekspor Excel</button>
          <button className="ghost" onClick={() => window.print()} disabled={!rows.length}><Printer size={16} /> Cetak / PDF</button>
        </div>
      </div>

      <div className="card table-wrap">
        <div className="card-title">{view === 'rekap' ? 'Rekap per siswa' : 'Detail harian'}</div>
        <div className="card-sub">Periode {fmtDate(from)} – {fmtDate(to)} · {rows.length} catatan</div>
        {view === 'rekap' ? (
          <table>
            <thead><tr><th>NIS</th><th>Nama</th><th>Kelas</th><th>Hadir</th><th>Terlambat</th><th>Izin</th><th>Sakit</th><th>Alpha</th></tr></thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.nis}><td>{s.nis}</td><td style={{ fontWeight: 600 }}>{s.nama}</td><td>{s.kelas}</td><td>{s.hadir}</td><td>{s.terlambat}</td><td>{s.izin}</td><td>{s.sakit}</td><td>{s.alpha}</td></tr>
              ))}
              {!summary.length && <tr><td colSpan={8} className="empty">Tidak ada data pada periode ini.</td></tr>}
            </tbody>
          </table>
        ) : (
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
      </div>
    </>
  );
}
