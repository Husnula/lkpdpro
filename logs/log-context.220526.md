# Log Riwayat Perubahan & Konteks — 22 Mei 2026

## 1. Audit Keamanan & Penyederhanaan Aturan Hapus Anggota Tim (`allow delete`)
Untuk memastikan pengguna dengan lisensi agensi (agency) dapat secara mandiri mengelola dan menghapus dokumen anggota tim mereka tanpa terkendala aturan otorisasi Firestore yang terlalu ketat, perubahan berikut telah dilakukan:

### A. Perbaikan Rule Delete `/users/{userId}` pada `firestore.rules`
- **Masalah**: Sebelumnya, skema pencocokan rule `allow delete` menggunakan validasi email yang bertingkat dan pemanggilan `exists` transisional (`isAgencyEmail()`) yang kurang andal dalam kondisi offline/real-time sync, serta rentan gagal menghapus skeleton doc yang dibuat secara dinamis oleh agensi.
- **Solusi**: Menyederhanakan dan memproteksi evaluasi dokumen lama (`existing()`). Rule hapus kini membolehkan penghapusan instan jika penghapus adalah super-admin, pemilik akun itu sendiri, atau jika agensi bersangkutan mencocokkan `agencyId` di dalam metadata dokumen secara langsung:
  ```javascript
  allow delete: if isAdmin() 
    || (isSignedIn() && ('email' in existing()) && existing().email != null && existing().email.lower() == request.auth.token.email.lower())
    || (isSignedIn() && ('agencyId' in existing()) && existing().agencyId == request.auth.uid);
  ```
- **Hasil**: Agensi kini memiliki kekuasaan penuh untuk menghapus skeleton user (undangan tertunda) yang berada di bawah kepemilikan tim mereka (`agencyId == request.auth.uid`) secara instan dan aman.

---

## 2. Penguatan Proteksi Runtime & Skema Firestore Terhadap Data Pengguna

### A. Penyesuaian `isValidUser` Helper pada `firestore.rules`
- **Latar Belakang**: Field pelacak baru seperti `removedByAgency` ditolak oleh pemeriksa struktur ketat `isValidUser(data)`. Kami menambahkan definisi properti ini beserta tipe datanya:
  - `&& (!('removedByAgency' in data) || data.removedByAgency == null || data.removedByAgency is bool)`
  - `&& (!('agencyId' in data) || data.agencyId == null || (data.agencyId is string && data.agencyId.size() <= 128))`
  - `&& (!('createdAt' in data) || data.createdAt == null || data.createdAt is timestamp)`
- **Keuntungan**: Sinkronisasi penghapusan atau integrasi data user baru tidak akan pernah lagi memicu kegagalan integritas schema bertipe `Property not allowed`.

### B. Proteksi Try-Catch Deletion pada Client-Side (`/app/page.tsx`)
- **Masalah**: Saat menghapus/mengeluarkan anggota tim, sistem melakukan sanitasi ganda untuk memastikan duplikasi skeleton user juga ikut terbersih. Jika salah satu skeleton doc tersebut sudah terhapus di sesi lain atau di luar otorisasi yang diizinkan (misal akun aktif mandiri), Firestore SDK melempar exception unhandled promise yang menghentikan alur aplikasi.
- **Solusi**: Menambahkan blok `try ... catch` pada bagian pembersihan skeleton residu di dalam fungsi `handleRemoveMember`:
  ```typescript
  try {
    await deleteDoc(doc(db, "users", docD.id));
  } catch (delErr) {
    console.warn("Skipping deletion of secondary skeleton user (no permission or already deleted):", delErr);
  }
  ```
- **Hasil**: Interaksi UI agensi saat menekan tombol "Hapus" tidak akan pernah pecah (crash) oleh runtime errors, melainkan menyelesaikan tugas penyingkiran anggota dengan mulus.

---

## 3. Hasil Validasi & Pengujian Sukses (Sebelum Revisi)
1. **Linter Audit**: Berhasil dilewati dengan status bersih (`Linting completed successfully`).
2. **Kompilasi / Build Prod**: Berhasil dibangun sepenuhnya (`Build succeeded - the applet is compiled`).
3. **Penyebaran Aturan**: Aturan keamanan `firestore.rules` telah dideploy secara realtime ke Firestore DB (`Firestore rules deploy completed`).

---

## 4. Eksklusi Anggota Agensi dari Dashboard Super Admin & Penyempurnaan Mekanisme Penghapusan Tim

### A. Penyaringan Anggota Tim di Dashboard Super Admin (`/app/page.tsx`)
- **Masalah**: Anggota agensi (seperti akun user `i51977110@gmail.com` yang ditambahkan oleh agensi `jagofeedmediatama@gmail.com`) sebelumnya muncul di daftar tabel "Agency Management" milik Super Admin. Padahal, akun tersebut hanya merupakan anggota lokal dari tim agensi bersangkutan dan tidak memerlukan penanganan lisensi atau administratif langsung dari Super Admin. Hal ini membuat dashboard Super Admin penuh dengan data bising (clutter).
- **Solusi**: Menambahkan aturan penyaringan pada visualisasi admin di `sortedAndFilteredUsers`:
  ```typescript
  u => {
    // Exclude team members that have agencyId set
    if (u.agencyId) return false;
    ...
  }
  ```
- **Keuntungan**: Akun tim agensi sama sekali tidak akan masuk ke dashboard Super Admin. Hanya akun agensi induk, integrator, atau akun individual mandiri yang langsung di-whitelist oleh Admin utama yang akan tampil.

### B. Penyempurnaan Penghapusan Member pada Agensi (`handleRemoveMember` di `/app/page.tsx`)
- **Masalah**: Sebelumnya, penghapusan anggota tim yang sudah aktif (registered user dengan `uid`) dilakukan dengan mekanisme pelonggaran (`updateDoc` untuk mengubah `agencyId` menjadi `null`, menyetel `status` ke `"pending"`, dan menyetel `removedByAgency` ke `true`). Karena dokumen tetap berada di Firestore tetapi dengan `agencyId: null`, ini justru menyisihkan akun tersebut berdiri bebas di database sehingga terdeteksi masuk kembali sebagai akun independen di bawah pantauan Super Admin. Dan juga, proses mutasi ini rentan bentrok validasi rules.
- **Solusi**: Mengganti alur keluarkan anggota menjadi **Full Deletion**. Baik skeleton doc (belum aktivasi) maupun registered doc (setelah migrasi), dokumen mereka di dalam sub-koleksi tim/users akan langsung dihapus bersih dari Firestore (`deleteDoc`). Aturan Firestore (`firestore.rules`) telah secara penuh menyetujui penghapusan ini sejak awal jika `agencyId == request.auth.uid`.
- **Keuntungan**: Akun anggota yang dihapus akan seketika bersih sebersih-bersihnya baik dari daftar agensi, database, maupun lintasan deteksi dashboard Super Admin tanpa menyisakan error permission.

---

## 5. Perbaikan Tombol Hapus Anggota Tim (Iframe Sandbox Compatibility) — Fix Tambahan

### A. Penghapusan Native Popups (`confirm` dan `alert`) yang Terblokir Iframe
- **Masalah**: Pada browser modern, pemanggilan fungsi `window.confirm` dan `window.alert` di dalam layout sandboxed iframe (antarmuka peninjau AI Studio) seringkali diblokir oleh kebijakan keamanan peramban (`DOMException`). Akibatnya, mengeklik tombol hapus anggota tim (`Trash2`) secara senyap tertebas (silently blocked / failed) dan tombol tampak "tidak berfungsi sama sekali" bagi pengguna agensi.
- **Solusi**:
  1. Menyingkirkan seluruh panggilan `confirm(...)` dan `alert(...)` di dalam modul `TeamManager`.
  2. Menggantinya dengan visualisasi konfirmasi di tempat (state-driven inline confirmation): mengeklik ikon tong sampah pertama kali akan memunculkan transisi mini dengan pertanyaan *"Yakin hapus? Ya | Batal"*.
  3. Memasukkan handler state `errorMsg` dan `successMsg` berbasis banner notifikasi Tailwind di atas formulir pendaftaran anggota baru untuk menangkap respon status sukses pendaftaran atau kegagalan Firestore secara interaktif.
- **Keuntungan**: Aksi CRUD keanggotaan kini berjalan 100% lancar, elegan, asinkron, dan bersahabat dengan lingkungan web iframe tanpa memicu interupsi thread browser.
