# Dokumentasi Fitur Baru: Mode Drilling (Full Soal Latihan)

- **ID Fitur**: FITUR-012/DRILLING-MODE
- **Tanggal Rilis**: 20 Mei 2026
- **Status**: Implemented & Verified

---

## 1. Deskripsi Fungsional
**Mode Drilling** adalah opsi pembelajaran adaptif baru yang memungkinkan guru untuk menghasilkan lembar kerja siswa (LKPD) yang murni dan padat berisi soal-soal latihan tanpa menyertakan bagian rangkuman teori atau materi pelajaran. Fitur ini sangat ideal untuk persiapan ujian sekolah, simulasi berkala, atau sesi pengayaan khusus (intensif).

### Manfaat Penggunaan:
- **Zero Materi/Teori**: Seluruh ruang di halaman materi ditiadakan sehingga seluruh area kerja diisi penuh oleh butir soal.
- **Kepadatan Soal Maksimal**: Meningkatkan efisiensi cetak dengan target 20 s.d. 40 soal pilihan ganda per halaman menggunakan tata letak multi-kolom yang padat.
- **Efisiensi Cetak & Penghematan Kertas**: Mengurangi penggunaan kertas untuk mencetak lembar kerja siswa yang berfokus penuh pada asesmen formatif.

---

## 2. Antarmuka Pengguna (UI Layout)
Integrasi visual baru pada panel **"Kebutuhan Akademik"** di halaman utama:
1. **Toggle Interaktif `⚡ Mode Drilling (Full Soal)`**:
   - Berupa kontrol checkbox adaptif dengan aksen warna oranye.
   - Menyediakan status visual `AKTIF` berlatar oranye terang ketika diaktifkan oleh pengguna.
2. **Kondisi Reaktif**:
   - Apabila **Mode Drilling aktif**, pilihan **"Rasio Materi : Latihan"** secara otomatis disembunyikan dari UI guna memberikan kepastian fungsional bahwa rasio tidak akan lagi digunakan oleh AI.
   - Apabila **Mode Drilling tidak aktif**, kolom rasio materi kembali ditampilkan seperti semula.

---

## 3. Implementasi Struktur System Prompt & Instruksi AI
Implementasi ini membutuhkan instruksi tingkat tinggi yang eksplisit kepada model generatif (Gemini) agar struktur JSON yang dihasilkan mematuhi kaidah materi kosong dan konten padat:

### A. Penambahan Aturan Baru pada `SYSTEM_PROMPT` (BAGIAN 3B)
Kaidah generasi diperketat dengan menyisipkan detail operasional di antara BAGIAN 3 (Aturan Mode Kesulitan) dan BAGIAN 4 (Safe Area & Print Margin):
- **ZERO MATERI**: Larangan keras menyertakan blok rangkuman teori apa pun.
- **KEPADATAN MAKSIMAL**: Menginstruksikan tata letak minimal 2 kolom untuk pilihan ganda.
- **TIPE SOAL PADAT**: Fokus utama pada Pilihan Ganda (PG) dan isian singkat. Untuk tipe HOTS limit maksimal esai adalah 1-2 di akhir bagian.
- **HEADER MINIMAL**: Memakai `HEADER_MINIMAL` yang sangat ringkas tanpa dekorasi berlebihan.
- **PENGELOMPOKAN COMPACT**: Penyekat/divider yang tipis dengan label compact.
- **FIELD JAWABAN COMPACT**: Mengganti kotak jawaban besar menjadi garis titik-titik strip pendek (`________`).
- **ILUSTRASI MINIMAL**: Gambar hanya jika menjadi bagian integral (stimulus).
- **RASIO OVERRIDE**: Mengabaikan parameter rasio bawaan.

### B. Adaptasi Prompt pada Alur Kerja Generator AI
1. **Rencana Alur (Outline Generator - `handleGenerateOutline`)**:
   Mengirimkan instruksi khusus jika `drillingMode` bernilai `true` agar rencana outline yang disusun murni berupa daftar soal / latihan tanpa adanya pemetaan atau alokasi halaman khusus materi teori.
2. **Generasi Halaman Tunggal (`handleGenerateSinglePage`)**:
   - Memasukkan parameter `drilling_mode: true` serta penegasan operasional `BAGIAN 3B` ke dalam prompt halaman.
   - Mengganti deklarasi `optionalInstructions` untuk menginjeksikan instruksi keras mengenai layout 2-kolom dan ketiadaan blok teori ke generator halaman mandiri.

---

## 4. Pelacakan Kode & Validasi Teknis
Perubahan telah disinkronkan dan diuji dengan hasil kompilasi bersih (`build succeeded` & `linting completed successfully`):

- **State Management**: `drillingMode: false` sebagai default value pada state `formData`.
- **Integrasi Firebase**: State `drillingMode` tersimpan secara dinamis di dalam dokumen proyek Firestore di bawah sub-koleksi pengguna masing-masing.
- **Pengaturan API**: Menerapkan mode BYOK (Bring Your Own Key) untuk mengeksekusi panggilan API Gemini secara aman di sisi server.
