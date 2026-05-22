# Custom Agent Instructions - Remix: LKPD Generator Pro

Dokumen ini berisi aturan main, aransemen proyek, bahasa, dan instruksi khusus yang wajib dipatuhi oleh AI Coding Agent dalam pengembangan lanjutan aplikasi **Remix: LKPD Generator Pro**.

---

## 🇮🇩 Bahasa & Identitas Visual
- **Bahasa UI**: Wajib menggunakan **Bahasa Indonesia** secara profesional, santun, dan intuitif (contoh penggunaan kata: *Berhasil*, *Gagal*, *Undang*, *Tambah Anggota*).
- **Tema Desain**: Antarmuka bersih, bersahabat untuk pendidik, menggunakan warna biru/slate beresolusi tinggi, mendukung mode gelap (`dark mode`)/terang (`light mode`) secara dinamis.

---

## 🔒 Aturan Keamanan & Firestore Security Rules
- **Aturan Evaluasi List/Query**: Jangan pernah menggunakan parameter atau sintaksis `request.query.filters` di dalam `firestore.rules`. Gunakan evaluasi per-dokumen langsung menggunakan `resource.data`:
  ```javascript
  allow list: if isAdmin() 
    || (isSignedIn() && resource.data.agencyId == request.auth.uid)
    || (isSignedIn() && resource.data.email != null 
        && resource.data.email.lower() == request.auth.token.email.lower());
  ```
- **Pembatasan Self-Register**: Pendaftaran langsung telah dimatikan di level database dan klien. Hanya Administrator Utama (`jagofeed@gmail.com`) yang otomatis berstatus `super-admin`. User lain wajib melalui mekanisme Whitelist (Skeleton Docs) yang diinput oleh Admin.
- **Limitasi Query**: Seluruh query data LKPD dibatasi maksimal 50 dokumen (`limit(50)`) untuk performa optimal serta menghindari data leak. Aturan Firestore mewajibkan query mematuhi `request.query.limit <= 50`.

---

## 👥 Manajemen Tingkatan Lisensi & Tim
Ada tiga tingkatan lisensi utama:
1. `unlimited`: Proyek tanpa batas (∞).
2. `capped`: Proyek terbatas sesuai jumlah kuota (`userQuota`) yang diatur oleh Admin.
3. `none`: Tidak memiliki hak membuat proyek.

### Alur Tim Agensi
- Agensi dengan lisensi `capped` atau `unlimited` diizinkan mengundang anggota (`team member`).
- Setiap kali tim baru ditambahkan, `usageCount` agensi ditingkatkan sebanyak `+1` (operasi `increment(1)` dikunci secara aman di level Rules).
- Jika anggota dihapus, skeleton doc-nya dibersihkan sepenuhnya untuk mencegah eksploitasi ganda atau pemulihan sepihak.

---

## 📂 Struktur Penting
- **Halaman Utama**: `/app/page.tsx` (Mengandung visual dashboard, modul `AgencyManager` untuk Super Admin, dan modul `TeamManager` untuk Agensi).
- **Log Sistem**: `/logs/` mengandung riwayat perbaikan kritis harian.
- **Akses Firebase**: `/lib/firebase.ts` (Seluruh inisialisasi client SDK dan penanganan kesalahan).
