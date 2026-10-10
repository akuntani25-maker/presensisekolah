-- Migrasi: jam masuk & jam terlambat per kelas
-- Jalankan di Supabase: SQL Editor -> New query -> Run. Aman dijalankan berulang.

alter table public.classes
  add column if not exists start_time time,
  add column if not exists late_after time;

comment on column public.classes.start_time is 'Jam mulai pelajaran (opsional, informasi)';
comment on column public.classes.late_after is 'Batas jam dianggap terlambat untuk kelas ini. Jika kosong, pakai settings.late_after sebagai cadangan.';

-- Contoh pengisian: kelas pagi 07:15, kelas siang 13:15
-- update public.classes set start_time = '07:00', late_after = '07:15' where name like '%Pagi%';
-- update public.classes set start_time = '13:00', late_after = '13:15' where name like '%Siang%';
