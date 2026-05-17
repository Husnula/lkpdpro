# Panduan Penggunaan LKPD Pro (Untuk Pengguna)

Selamat datang di LKPD Pro! Aplikasi ini dirancang untuk memudahkan Anda membuat desain Lembar Kerja Peserta Didik (LKPD) yang menarik menggunakan teknologi AI. Ikuti langkah-langkah di bawah ini untuk memulai.

---

## 1. Cara Masuk ke Aplikasi

1.  **Buka Link:** Klik URL aplikasi yang diberikan oleh Admin/Agency.
2.  **Login Google:** Klik tombol **"Masuk dengan Google"**. Gunakan akun Google aktif Anda.
3.  **Halaman Utama:** Setelah berhasil masuk, Anda akan langsung diarahkan ke Dashboard proyek Anda.

---

## 2. Pengaturan API Key (WAJIB di Awal)

Sebelum bisa membuat konten, Anda harus memasukkan API Key Gemini. API Key ini berfungsi sebagai "bahan bakar" agar AI bisa bekerja.

1.  Klik menu **"API Settings"** di sidebar sebelah kiri.
2.  Anda akan melihat **32 kotak Input** API Key.
3.  **Isi API Key:** Masukkan kunci yang berbeda di setiap kotak (jika Anda memiliki banyak kunci) atau cukup isi beberapa kotak awal. 
    *   *Tips:* Semakin banyak kunci yang aktif, semakin lancar proses pembuatan konten karena sistem akan otomatis berganti kunci jika salah satu mencapai batas penggunaan.
4.  Klik **"Simpan Pengaturan"**. Jika muncul notifikasi "Berhasil", Anda siap lanjut ke tahap berikutnya.

---

## 3. Membuat Proyek Baru

1.  Klik tombol biru **"+ LKPD Baru"** di sidebar kiri.
2.  **Pilih/Buat Folder:** 
    *   Anda bisa memasukkan nama folder baru (misal: "Kelas 4 - Matematika") agar proyek Anda terorganisir.
    *   Sistem akan otomatis menyimpan proyek di dalam folder tersebut.
3.  **Isi Parameter:** 
    *   Masukkan Mata Pelajaran, Judul LKPD, dan Tujuan Pembelajaran.  
    *   Pilih tingkat kelas yang sesuai.
4.  Klik **"Next"** untuk lanjut ke tahap pembuatan outline.

---

## 4. Proses Ekstraksi Konten (Gemini AI)

1.  Di tahap **"Outline"**, AI akan memberikan draf isi LKPD Anda.
2.  Anda bisa membaca kembali atau meminta revisi jika ada yang kurang sesuai.
3.  Jika sudah oke, klik **"Buat Output Final"**. AI akan bekerja menyusun struktur visual dalam format JSON yang siap digunakan.

---

## 5. Menyimpan dan Mengelola Proyek

1.  Gunakan tombol **"Simpan"** di pojok kanan atas untuk mengamankan progres Anda.
2.  Semua proyek Anda akan tersimpan di menu **"Dashboard"**.
3.  Anda dapat melihat grafik kapasitas penyimpanan di dashboard untuk memantau sisa kuota penyimpanan Anda.

---

## 6. Menggunakan Output untuk AI Image Generator

Tujuan akhir dari aplikasi ini adalah menghasilkan instruksi (prompt) visual yang sangat detail.

1.  Buka tab **"Final Output"**.
2.  Di sebelah kiri, pilih halaman yang ingin dibuat gambarnya (misal: "Hal 1").
3.  Klik tombol biru **"Salin JSON"**.
4.  **Buka Generator Gambar AI:**
    *   Buka ChatGPT, Gemini Nano, atau alat generator gambar lainnya.
    *   **Tempel (Paste)** JSON yang sudah disalin tadi ke kolom chat.
    *   Tekan Enter. AI Image Generator akan membaca instruksi tersebut dan menghasilkan desain LKPD yang profesional sesuai prompt dari LKPD Pro.

---

**Butuh Bantuan?**  
Jika muncul pesan "Missing or insufficient permissions", pastikan Anda sudah terverifikasi oleh Admin atau sudah diundang oleh akun Agency resmi.
