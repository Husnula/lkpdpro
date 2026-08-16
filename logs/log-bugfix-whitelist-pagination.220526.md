# Log Pembaruan & Perbaikan Sistem (22 Mei 2026)

Dokumen ini mencatat detail perbaikan bug kritis, pembaruan keamanan, dan penambahan fitur baru pada sistem Manajemen User, Agen, dan Hak Akses.

---

## 🛠️ Detail Perbaikan Bug & Peningkatan Keamanan

### BUG #1 — KRITIS: Self-Registration Whitelist Protection
- **Sebelumnya**: Pendaftaran bersifat terbuka (open-registration). Di level `fetchUserData()`, jika pengguna yang login belum memiliki dokumen Firestore, sistem otomatis membuat dokumen baru dengan status `pending`, membuka peluang pendaftaran tak terbatas.
- **Perbaikan**:
  1. Menghapus seluruh blok auto-create di `fetchUserData()`.
  2. Membatasi self-register eksklusif hanya untuk Administrator Utama (`jagofeed@gmail.com`) sebagai `super-admin` aktif secara sistem saat pertama kali masuk.
  3. Mengarahkan semua user tidak dikenal (tidak ada dokumen profil & tidak ada skeleton doc undangan) ke state `not_invited`.
  4. Menambahkan UI khusus **"Akses Ditolak"** yang elegan dengan opsi keluar (`logout`).
  5. Menambahkan form Whitelist di dalam panel `AgencyManager` (Super Admin) agar Administrator dapat menambahkan email user secara manual ke dalam sistem (skeleton document) lengkap dengan settingan Role, License, dan Kuota.

### BUG #2 — Status Badge di TeamManager
- **Sebelumnya**: Penentuan label status "Active" vs "Invited" menggunakan logika `m.displayName` yang tidak akurat (karena biodata profil user baru bisa saja kosong saat pertama kali aktif).
- **Perbaikan**: Mengganti logika dengan memeriksa kecocokan status dan keberadaan ID autentikasi:
  ```javascript
  const isActiveMember = m.status === 'active' && m.uid != null;
  // Label: isActiveMember ? 'Active' : 'Invited'
  ```

### BUG #3 — Proteksi Hapus Tim & Race Condition Re-Migration
- **Sebelumnya**: Saat menghapus registrasi anggotanya, agensi mengubah status ke `'pending'`, namun tidak menghapus dokumen skeleton duplikat lama. Begitu user bersangkutan login ulang, script auto-migrate secara agresif memulihkan statusnya menjadi `'active'` menggunakan data skeleton lama.
- **Perbaikan**:
  1. Pada fungsi hapus angota (`handleRemoveMember`), jika teridentifikasi sebagai user asli (punya UID), seluruh dokumen skeleton dengan email yang sama akan otomatis dibersihkan sepenuhnya untuk mencegah auto-migrate ganda.
  2. Saat migrasi skeleton dijalankan, status tidak di-hardcode ke `"active"` melainkan menghormati data status bawaan skeleton (`status: skeletonData.status || "active"`).
  3. Menambahkan flag `removedByAgency: true` pada user terdampak sehingga sistem melompati auto-migration berikutnya yang tidak sah.

### BUG #4 — Optimalisasi Firestore Security Rules (`allow list`)
- **Sebelumnya**: Aturan list pada `/users` memeriksa query filters dengan `request.query.filters` yang ternyata **TIDAK VALID** di standard syntax Firestore Rules. Hal ini menyebabkan error `Missing or insufficient permissions` bagi user dengan role agency saat ingin melihat list atau menambahkan anggota ke tim mereka.
- **Perbaikan**: Mengganti evaluasi aturan filter list menggunakan evaluasi dokumen (`resource.data`) yang aman dan didukung penuh oleh mesin Firestore Engine:
  ```javascript
  allow list: if isAdmin() 
    || (isSignedIn() && resource.data.agencyId == request.auth.uid)
    || (isSignedIn() && resource.data.email != null 
        && resource.data.email.lower() == request.auth.token.email.lower());
  ```

### BUG #5 — Sinkronisasi Real-Time Super Admin
- **Sebelumnya**: Halaman `AgencyManager` memanggil `getDocs` satu arah pada saat mounting, sehingga Super Admin harus me-refresh berkali-kali untuk melihat user baru yang terdaftar.
- **Perbaikan**: Mengimplementasikan `onSnapshot` listener untuk memonitor perubahan koleksi `users` secara real-time.

---

## 🔥 FITUR BARU & PENINGKATAN INTERFACES (#6)

### 1. Panel Whitelist Manual (AgencyManager)
Super Admin sekarang memiliki form pop-up modern di panel untuk memasukkan email baru ke sistem whitelist. Opsi konfigurasi saat whitelist meliputi:
- Email Penerima
- Role (User / Agency / Admin)
- Jenis Lisensi (None / Capped / Unlimited)
- Batas Kuota proyek jika memilih lisensi standard (capped)

### 2. Paginasi & Filter Mutakhir
Memasang sistem client-side filtering tingkat lanjut dan antarmuka paginasi yang responsif pada:
- **AgencyManager**: Filter berdasarkan pencarian nama/email, seleksi Role, seleksi Status, seleksi License, lengkap dengan sorting kolom interaktif pada kolom username, role, status, lisensi, dan jam login terakhir.
- **TeamManager**: Filter pencarian nama/email, seleksi status keanggotaan, dengan paginasi 10 baris per halaman.

---

## 🔒 AUDIT KEAMANAN DATABASE (Firestore Rules Securing)

1. **Penghapusan Pola Self-Create**: Meniadakan celah Case 1 pendaftaran bebas. Hanya mengizinkan akun super-admin bawaan (`jagofeed@gmail.com`).
2. **Validasi Email Migrasi Swasta**: Memastikan migrasi skeleton hanya dapat disetujui jika email data tujuan cocok secara presisi dengan email di Firebase Auth token (`incoming().email.lower() == request.auth.token.email.lower()`).
3. **Penyempurnaan Update `usageCount`**: Menghapus kemampuan user memanipulasi usage count-nya secara bebas. Proses increment dibatasi dan dikontrol secara ketat hanya dalam selisih nilai ±1 unit untuk Agensi yang valid.
4. **Validasi Kuota di Aturan Database**: Agensi dilarang membuat user skeleton baru di level Firestore Database jika kuota lisensinya telah habis (`usageCount >= userQuota`), menghentikan manipulasi API client-side.
5. **Batas Ambil Data LKPD**: Menambahkan limitasi performa query LKPD (`request.query.limit <= 50`) guna mencegah serangan kebocoran data terdistribusi (dump data). Di sisi client, Query LKPD juga sudah dikunci dengan `limit(50)`.
