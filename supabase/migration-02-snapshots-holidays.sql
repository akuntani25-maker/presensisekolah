-- Migrasi 02: snapshot presensi + hari libur + bucket Storage
-- Jalankan di Supabase: SQL Editor -> New query -> Run. Aman dijalankan berulang.

-- 1. Kolom foto bukti presensi
alter table public.attendance
  add column if not exists snapshot_path text;

-- 2. Tabel hari libur
create table if not exists public.holidays (
  date date primary key,
  name text not null,
  created_at timestamptz default now()
);
alter table public.holidays enable row level security;

-- hapus policy lama (kalau ada) sebelum membuat ulang, agar aman dijalankan berulang
drop policy if exists "holidays staff read"  on public.holidays;
drop policy if exists "holidays admin write" on public.holidays;
create policy "holidays staff read"  on public.holidays for select using (public.is_staff());
create policy "holidays admin write" on public.holidays for all
  using (public.is_admin()) with check (public.is_admin());

-- 3. Seed hari libur nasional fixed-date (admin bebas tambah/edit)
--    Hari libur yang mengikuti kalender bulan/qamariah (Nyepi, Idul Fitri, Idul Adha,
--    Waisak, Isra Mikraj, Maulid, Imlek, Wafat/Kenaikan Isa Almasih) tanggalnya
--    berubah tiap tahun — admin menambahkannya mengikuti SKB 3 Menteri.
insert into public.holidays (date, name) values
  ('2026-01-01', 'Tahun Baru Masehi'),
  ('2026-05-01', 'Hari Buruh Internasional'),
  ('2026-06-01', 'Hari Lahir Pancasila'),
  ('2026-08-17', 'HUT Kemerdekaan RI'),
  ('2026-12-25', 'Hari Raya Natal'),
  ('2027-01-01', 'Tahun Baru Masehi'),
  ('2027-05-01', 'Hari Buruh Internasional'),
  ('2027-06-01', 'Hari Lahir Pancasila'),
  ('2027-08-17', 'HUT Kemerdekaan RI'),
  ('2027-12-25', 'Hari Raya Natal')
on conflict (date) do nothing;

-- 4. Storage bucket untuk foto presensi (privat; diakses lewat signed URL)
insert into storage.buckets (id, name, public)
values ('attendance-snapshots', 'attendance-snapshots', false)
on conflict (id) do nothing;

drop policy if exists "att snap staff read"   on storage.objects;
drop policy if exists "att snap staff upload" on storage.objects;
drop policy if exists "att snap admin delete" on storage.objects;

create policy "att snap staff read" on storage.objects for select
  using (bucket_id = 'attendance-snapshots' and public.is_staff());
create policy "att snap staff upload" on storage.objects for insert
  with check (bucket_id = 'attendance-snapshots' and public.is_staff());
create policy "att snap admin delete" on storage.objects for delete
  using (bucket_id = 'attendance-snapshots' and public.is_admin());
