-- Jalankan di Supabase: SQL Editor -> New query -> Run

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'guru' check (role in ('admin','guru')),
  created_at timestamptz default now()
);

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  full_name text not null,
  class_id uuid references public.classes(id) on delete set null,
  parent_name text,
  parent_phone text,
  parent_email text,
  qr_code uuid not null default gen_random_uuid() unique,
  face_descriptors jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  check_in timestamptz,
  status text not null check (status in ('hadir','terlambat','izin','sakit','alpha')),
  method text not null default 'manual' check (method in ('face','qr','manual')),
  note text,
  created_at timestamptz default now(),
  unique (student_id, date)
);

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  school_name text not null default 'Sekolah Saya',
  late_after time not null default '07:15',
  timezone text not null default 'Asia/Makassar'
);
insert into public.settings (id) values (1) on conflict do nothing;

-- Profil otomatis saat user baru dibuat (role default: guru)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles   enable row level security;
alter table public.classes    enable row level security;
alter table public.students   enable row level security;
alter table public.attendance enable row level security;
alter table public.settings   enable row level security;

create policy "profiles read self or admin" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "profiles admin write" on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

create policy "classes staff read" on public.classes for select using (public.is_staff());
create policy "classes admin write" on public.classes for all
  using (public.is_admin()) with check (public.is_admin());

create policy "students staff read" on public.students for select using (public.is_staff());
create policy "students admin write" on public.students for all
  using (public.is_admin()) with check (public.is_admin());

create policy "attendance staff read" on public.attendance for select using (public.is_staff());
create policy "attendance staff write" on public.attendance for insert with check (public.is_staff());
create policy "attendance staff update" on public.attendance for update
  using (public.is_staff()) with check (public.is_staff());
create policy "attendance admin delete" on public.attendance for delete using (public.is_admin());

create policy "settings staff read" on public.settings for select using (public.is_staff());
create policy "settings admin write" on public.settings for update
  using (public.is_admin()) with check (public.is_admin());

-- Setelah mendaftar akun pertama, jadikan admin:
-- update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'EMAIL_ANDA');
