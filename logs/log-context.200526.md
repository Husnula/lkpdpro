# Log Konteks Pembaruan - 20 Mei 2026

## Ringkasan Perubahan Terakhir

### 1. Masalah Decline User pada Akun Super-Admin
- **Masalah**: Ketika super-admin melakukan "Decline" pada pendaftaran user baru dari dashboard admin, data status user tersebut tidak tersimpan dengan benar di Firestore dan user tersebut muncul kembali setelah halaman dimuat ulang.
- **Penyebab**: 
  - Status `'rejected'` belum terdaftar sebagai status yang valid di dalam aturan skema database `firestore.rules`.
  - Aturan Firestore menolak perubahan jika status tidak sesuai dengan array yang diperbolehkan (`'pending'`, `'active'`, `'suspended'`).
- **Solusi**: 
  - Memperbarui `/firestore.rules` untuk secara resmi mengizinkan status `'rejected'` pada validasi tipe pengguna (`data.status in ['pending', 'active', 'suspended', 'rejected']`).
  - Mengoreksi penulisan aturan keamanan agar `Incoming` dokumen yang diperbarui oleh admin divalidasi dengan benar.

### 2. Keterangan "Menunggu..." (Pending/Invited) Tetap Timbul pada Panel Agency
- **Masalah**: Pada panel tim di akun Agency, pengguna yang sudah berhasil diundang dan telah login (seperti `jfmprinting@gmail.com`) masih berstatus `"INVITED"` dengan nama `"Menunggu..."`, meskipun mereka sudah sukses membuat konten.
- **Penyebab**: 
  - Selama proses pembuatan akun pertama kali/login, pencarian dokumen skeleton (dokumen sementara hasil invite yang belum memiliki UID) tidak berhasil menargetkan dokumen yang tepat karena hanya mencari dokumen pertama tanpa mengecualikan UID aktif pengguna.
  - Status migrasi dokumen skeleton tidak diubah menjadi `"active"` secara eksplisit, dan data tampilan name/displayName pengguna serta metadata login terakhir tidak disinkronkan secara berkala saat masuk kembali.
- **Solusi**: 
  - Memperbaiki logika migrasi data pengguna di `/app/page.tsx` pada fase inisialisasi sesi (`useEffect`). Kueri migrasi kini mencari dokumen temporer (skeleton) yang memiliki email yang sama namun ID dokumennya berbeda dari `user.uid` saat ini.
  - Setelah dokumen temporer itu ditemukan, dokumen tersebut akan dimigrasikan dengan mengatur `status: "active"`, menyelaraskan `displayName`, `photoURL`, serta menambahkan `lastLogin` dengan tanda waktu server (`serverTimestamp()`).
  - Menitipkan fungsi auto-sync untuk selalu memperbarui profil nama di DB pengguna apabila ada perbedaan nama di auth Google, sehingga di panel Agency, status instan berubah menjadi aktif dan nama asli pengguna menggantikan teks placeholder `"Menunggu..."`.

### 3. Akses Panel Dashboard /admin Bagi Akun Super-Admin
- **Masalah**: Tombol dashboard admin hanya terbuka atau valid untuk role `"admin"`, sedangkan akun utama `"super-admin"` terhalang verifikasi otorisasi pada rute `/admin`.
- **Solusi**: Memperbarui berkas `/app/admin/page.tsx` agar membolehkan pengguna dengan peran `"super-admin"` maupun `"admin"` untuk masuk dan mengelola data pengguna dengan hak akses penuh.

### 4. Implementasi Mode Drilling (Full Soal Latihan)
- **Konteks**: Menambahkan opsi guna memungkinkannya guru menghasilkan halaman lembar kerja yang murni padat berisi soal latihan (drilling) tanpa menyertakan blok ringkasan materi/teori.
- **Solusi**:
  - **Default Form State**: Menambahkan field `drillingMode: false` ke dalam objek `defaultFormData` di `/app/page.tsx` sehingga ter-save dengan aman ke dalam Firestore project data.
  - **UI / Setup Card**: Menambahkan toggle oranye bertuliskan `⚡ Mode Drilling (Full Soal)` pada blok *"Kebutuhan Akademik"*. Saat aktif, field *"Rasio Materi : Latihan"* disembunyikan dan toggle berubah warna dengan status AKTIF.
  - **SYSTEM_PROMPT**: Menyisipkan sub-bagian `BAGIAN 3B — MODE DRILLING` di dalam teks prompt utama sebagai panduan tegas untuk AI (zero materi teori, kepadatan maksimum soal per halaman, layout compact multi-kolom, override rasio).
  - **Outline & Page Generation API Routes**:
    - Pada `handleGenerateOutline`, template prompt diadaptasi agar tidak mengalokasikan blok pelajaran teori jika drillingMode aktif.
    - Pada `handleGenerateSinglePage`, instruksi keras ditransmisikan kepada model agar hanya memproduksi kumpulan soal padat (target layout multi-kolom).

## File Terkait Utama
- `/app/page.tsx`: Penambahan field `drillingMode` pada state, kontrol reaktif UI card "Kebutuhan Akademik", penyisipan instruksi sub-prompts, serta penyesuaian request prompt di generator outline dan single page.
- `/firestore.rules`: Penambahan opsi `'rejected'` pada filter keamanan penulisan/pembaruan status user.
- `/app/admin/page.tsx`: Penyelarasan hak akses super-admin dan admin untuk halaman panel kontrol web.

---
*Log ini dibuat untuk menjaga sinkronisasi konteks antara Agent dan User secara berkelanjutan.*
