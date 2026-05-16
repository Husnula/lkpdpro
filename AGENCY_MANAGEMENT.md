# Panduan Manajemen Lisensi Agency (Super Admin)

Dokumen ini menjelaskan cara mengelola lisensi pembeli Agency melalui Dashboard Super Admin.

## 1. Peran Pengguna (Roles)

Sistem kini mendukung 4 tingkatan peran:
1.  **Super Admin (`jagofeed@gmail.com`):** Memiliki akses penuh ke "Agency Management" dan bisa mengubah lisensi semua user.
2.  **Admin:** Memiliki akses ke Dashboard Admin standar (verifikasi user baru).
3.  **Agency:** Pembeli lisensi yang bisa memiliki tim sendiri. Mereka memiliki menu "My Team" untuk mengundang user lain.
4.  **User:** Pengguna standar atau anggota tim dari seorang Agency.

---

## 2. Cara Memberikan Lisensi Agency

Sebagai Super Admin, Anda dapat memberikan lisensi kepada pembeli dengan langkah berikut:

1.  Buka aplikasi dan Login dengan email `jagofeed@gmail.com`.
2.  Di sidebar kiri, klik menu **"Agency Management"**.
3.  Cari user (berdasarkan email) yang telah melakukan pembelian.
4.  Klik tombol **"Edit Lisensi"** di kolom paling kanan.
5.  Pilih **Tipe Lisensi**:
    *   **Unlimited (Promo Mei):** User akan mendapatkan role `agency` tanpa batasan jumlah anggota tim (sesuai janji promo 15-17 Mei 2026).
    *   **Capped (Standard):** Anda harus memasukkan **Kuota User**. Misalnya isi `100`, maka Agency tersebut hanya bisa mengundang maksimal 100 orang ke timnya.
6.  Pilih **Tanggal Pembelian** (Opsional, untuk record Anda).
7.  Klik **Simpan**. Sistem secara otomatis akan mengubah role user tersebut menjadi `agency`.

---

## 3. Apa yang Didapat Pembeli Agency?

Setelah Anda memberikan lisensi `agency`, pembeli akan melihat perubahan pada dashboard mereka:

1.  **Menu "My Team":** Muncul di sidebar kiri.
2.  **Fitur Invite:** Di dalam menu "My Team", Agency bisa memasukkan email calon anggotanya.
3.  **Penggunaan Kuota:** Setiap kali Agency menambah anggota tim, `usageCount` mereka akan bertambah. Jika mencapai batas (untuk tipe *Capped*), mereka tidak bisa menambah anggota lagi kecuali Anda menambah kuotanya.
4.  **Akses Tim:** User yang diundang oleh Agency akan langsung berstatus `active` dan bisa menggunakan aplikasi tanpa perlu verifikasi Admin manual lagi (karena sudah "dijamin" oleh Agency-nya).

---

## 4. Keamanan & Pembatasan

*   **Audit Red Team:** Semua perubahan data krusial (role, quota, status) sudah dilindungi di `firestore.rules`. Hanya `super-admin` yang bisa mengubah field-field sensitif ini.
*   **Suspension:** Jika pembeli melanggar aturan, Anda dapat mengubah status mereka menjadi **"Suspended"** di tabel manajemen untuk mencabut akses mereka seketika.
*   **Default Limit:** User gratisan (`user` biasa) tetap dibatasi maksimal **10 proyek** (sesuai logika `isQuotaExceeded` yang baru).

---

Jika ada pertanyaan mengenai teknis integrasi ini, silakan hubungi asisten koding Anda.
