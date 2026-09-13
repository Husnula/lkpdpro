# Log Riwayat Perubahan & Konteks — 13 September 2026

## 1. Latar Belakang & Kronologi Masalah
- **Masalah Akun**: Akun Google utama `jagofeed@gmail.com` mengalami penangguhan (*appeal*) dari Google.
- **Dampak Kritis**: Seluruh layanan GCP/Firebase di bawah akun tersebut dinonaktifkan sementara oleh Google (`CONSUMER_SUSPENDED`, error HTTP 403 `auth/permission-denied`). 
- **Efek pada Aplikasi**: Website `lkpdgeneratorpro.netlify.app` tidak bisa melakukan autentikasi login dengan Google sama sekali, dan konsol Firebase lama tidak dapat diakses.

---

## 2. Tindakan Penyelamatan & Migrasi Backend
Untuk mencegah downtime total dan mengembalikan operasional aplikasi dengan segera, dilakukan inisialisasi dan migrasi ke Project Firebase baru:

### A. Konfigurasi Project Firebase Baru (`lkpdpro`)
- **Owner Akun**: `jagofeedmediatama@gmail.com`
- **Project ID**: `lkpdpro`
- **App ID**: `1:120087127441:web:bf7dc1f788bde32804e630`
- **API Key**: `AIzaSyCbpsk3kAF8a1Xl6-L79UoKXxR6pUhgcxg`
- **Auth Provider**: Google Auth diaktifkan, dengan domain resmi Netlify (`lkpdgeneratorpro.netlify.app`) didaftarkan ke *Authorized Domains*.
- **Database**: Cloud Firestore dibuat dengan database ID default `(default)`.

### B. Pembaruan File Konfigurasi Aplikasi
1. **`firebase-applet-config.json`**:
   - Memperbarui kredensial Firebase project ID, API key, authDomain, storageBucket, dan appId ke project `lkpdpro`.
2. **`lib/firebase.ts`**:
   - Memperbaiki inisialisasi `getFirestore` agar secara dinamis mendukung default database `(default)` maupun custom database ID tanpa error.

---

## 3. Penyesuaian Role Super Admin & Firestore Security Rules
1. **`components/AuthGuard.tsx`**:
   - Mengganti pengecekan hardcoded `jagofeed@gmail.com` menjadi array check yang mencakup:
     - `jagofeedmediatama@gmail.com`
     - `bapakeathfar@gmail.com`
   - Kedua akun otomatis ditetapkan sebagai `super-admin` dengan status `active` saat proses login.

2. **`firestore.rules`**:
   - Memperbarui fungsi keamanan `isAdminEmail()`, `isAdmin()`, dan aturan `allow create`/`update` agar memberikan hak akses penuh pada `jagofeedmediatama@gmail.com` dan `bapakeathfar@gmail.com`.
   - Aturan ini telah dipublikasikan (*Publish*) ke Cloud Firestore console project `lkpdpro`.

3. **`app/page.tsx` (Perbaikan Bug Whitelist / Akses Ditolak)**:
   - **Masalah**: Saat pertama kali login di database baru yang masih kosong, kedua akun ditolak (*not_invited*) karena logika auto-registrasi awal hanya mengizinkan `jagofeed@gmail.com`.
   - **Solusi**: Memperbarui logika `AUTO-BOOTSTRAP` dan *self-register fallback* pada `app/page.tsx` (baris ~1714 dan ~1727) agar menyertakan `jagofeedmediatama@gmail.com` dan `bapakeathfar@gmail.com`.
   - **Hasil**: Kedua akun berhasil auto-registrasi ke koleksi `users` dengan role `super-admin`, status `active`, dan kuota `unlimited` (999.999).

4. **`AGENCY_MANAGEMENT.md`**:
   - Memperbarui dokumentasi operasional dan panduan role super admin dengan email terbaru.

---

## 4. Validasi, Build, & Deployment
- **Local Build**: Berhasil dikompilasi dengan `npm run build` tanpa kendala (*Compiled successfully*).
- **Git & Netlify**: Perubahan di-commit dan di-push ke branch `main` (`Husnula/lkpdpro.git`). Netlify otomatis menyelesaikan deploy.
- **Verifikasi UI**: Pengujian login dengan akun `jagofeedmediatama@gmail.com` dan `bapakeathfar@gmail.com` berhasil 100% dan dashboard **Agency Management** berfungsi normal.

---

## 5. Rencana & Status Pemulihan Data Lama
- **Google Takeout**: Pengguna telah mengajukan permintaan pengunduhan data (*Download your data*) dari akun `jagofeed@gmail.com` dan saat ini sedang menunggu arsip selesai diproses oleh Google.
- **Rencana Tindak Lanjut**:
  1. Jika arsip Google Takeout selesai diunduh dan terdapat data Cloud Firestore (JSON/Datastore), skrip impor akan disiapkan untuk menyalin data user & history LKPD lama ke database baru `lkpdpro`.
  2. Jika banding (*appeal*) akun `jagofeed@gmail.com` disetujui, konfigurasi dapat dengan mudah dikembalikan atau dihubungkan kembali secara permanen, dengan memastikan email cadangan (`jagofeedmediatama@gmail.com` / `bapakeathfar@gmail.com`) ditambahkan sebagai Owner sekunder.
- **Catatan Keamanan (GitGuardian)**:
  - Notifikasi GitGuardian terkait "Generic Encryption Key / API Key" terkonfirmasi aman (*false positive* / expected) karena merupakan public web client API key Firebase yang memang bersifat publik di sisi peramban.
