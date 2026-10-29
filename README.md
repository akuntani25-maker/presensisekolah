# Presensi Sekolah (Scan Wajah + Kartu QR)

Next.js 15 · Supabase (database + login) · Vercel (hosting) · face-api.js (pengenalan wajah di browser)

## Cara kerja
- **Kiosk** (`/kiosk`): satu tablet/laptop di gerbang atau kelas. Kamera mengenali wajah siswa; kalau gagal, siswa menunjukkan **kartu QR** ke kamera yang sama.
- **Admin** mendaftarkan siswa, mengambil 5 sampel wajah lewat kamera, dan mencetak kartu QR.
- **Guru/Admin** melihat dashboard, input izin/sakit, rekap, dan ekspor Excel/PDF.
- Pencocokan wajah terjadi **di browser kiosk**. Foto tidak disimpan; yang tersimpan hanya vektor angka (128 nilai) per sampel.

## 1. Siapkan Supabase
1. Buat project di https://supabase.com.
2. SQL Editor → tempel isi `supabase/schema.sql` → Run.
   Jika Anda sudah pernah menjalankan skema sebelumnya, jalankan migrasi berurutan:
   - `supabase/migration-01-class-times.sql` — jam masuk & batas terlambat per kelas
   - `supabase/migration-02-snapshots-holidays.sql` — foto bukti presensi, hari libur, Storage bucket
3. **Authentication → Sign In / Providers → Email**: matikan **Allow new users to sign up** (penting! Setiap akun yang terdaftar bisa membaca data siswa).
4. **Authentication → Users → Add user**: buat akun admin dan akun guru (centang auto-confirm).
5. Jadikan akun pertama admin (SQL Editor):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'EMAIL_ADMIN');
   ```
6. Ubah nama sekolah / jam batas terlambat:
   ```sql
   update public.settings set school_name = 'SMPN 1 Contoh', late_after = '07:15', timezone = 'Asia/Makassar';
   ```
7. Ambil dari **Project Settings → API**: URL, `anon` key, dan `service_role` key.

## 2. Jalankan lokal
```bash
cp .env.example .env.local   # isi nilai dari Supabase
npm install                  # otomatis menyalin model wajah ke public/models
npm run dev
```
Kamera di browser hanya jalan di `https://` atau `localhost`.

## 3. Deploy ke Vercel
1. Push folder ini ke GitHub, lalu **Import Project** di Vercel.
2. Isi Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (rahasia, hanya server)
   - `RESEND_API_KEY` dan `RESEND_FROM` (opsional, untuk email ke wali)
3. Deploy. Model wajah disalin saat `npm install` (postinstall), jadi tidak perlu langkah tambahan.

## Alur penggunaan
1. Admin: **Kelas** → tambah kelas, isi **jam masuk** dan **batas terlambat** per kelas.
   Contoh untuk sesi pagi vs siang:
   - *X IPA 1 Pagi* → jam masuk 07:00, batas terlambat 07:15
   - *X IPA 1 Siang* → jam masuk 13:00, batas terlambat 13:15
   Kelas yang jamnya dikosongkan akan ikut pengaturan global (`settings.late_after`).
2. **Data Siswa** → tambah siswa (isi no. HP/email wali).
3. Klik **Wajah** pada siswa, minta siswa menghadap kamera, tekan *Ambil sampel wajah*.
4. **Cetak kartu QR** dan bagikan ke siswa sebagai cadangan.
5. Login di tablet kiosk, buka `/kiosk`, tekan F11 / mode layar penuh.
   Kiosk otomatis memakai batas terlambat sesuai kelas siswa yang sedang scan.
6. Akhir jam presensi: Dashboard → *Tandai belum presensi sebagai alpha*.

## Mode gelap
Tombol bulan/matahari di topbar untuk beralih antara mode terang dan gelap.
Pilihan tersimpan di browser masing-masing pengguna; kalau belum pernah dipilih, aplikasi mengikuti preferensi sistem.

## Soal fingerprint
Browser tidak bisa membaca mesin fingerprint sekolah. Untuk web, pengganti yang realistis adalah **kartu QR** (sudah ada). Jika kelak ingin fingerprint, perlu mesin yang punya API/webhook (mis. ZKTeco/Solution) lalu datanya disinkronkan ke tabel `attendance`.

## Catatan keamanan & privasi (penting)
- Data wajah siswa adalah **data biometrik anak**. Minta persetujuan tertulis orang tua dan tentukan kebijakan penyimpanan/penghapusan (tombol *Hapus wajah* tersedia).
- Pengenalan wajah di browser **belum anti-spoofing**: foto/layar HP bisa mengelabuinya. Tempatkan kiosk di dekat guru/satpam, atau tambahkan deteksi kedipan (liveness) jika risikonya tinggi.
- Akurasi menurun pada cahaya buruk. Atur `MATCH_THRESHOLD` di `app/(app)/kiosk/page.tsx` (default 0.5; lebih kecil = lebih ketat).
- Kolom `face_descriptors` terbaca oleh semua akun staf (guru juga) karena kiosk membutuhkannya. Pakai akun khusus untuk kiosk dan jangan bagikan kata sandi staf.
- `SUPABASE_SERVICE_ROLE_KEY` jangan pernah diberi awalan `NEXT_PUBLIC_`.
- Notifikasi WhatsApp memakai tautan `wa.me` (dibuka manual oleh guru). Pengiriman otomatis butuh WhatsApp Business API berbayar.
