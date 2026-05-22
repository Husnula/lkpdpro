"use client";

// LKPD Generator Pro - Main Page
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import { 
  Check, BookOpen, Settings, FileText, CheckCircle, XCircle, 
  ChevronRight, Copy, Download, RefreshCw, Palette,
  ArrowLeft, Loader2, AlertCircle, Moon, Sun, Send, Code,
  User, BadgeInfo, Plus, HelpCircle, Bell, Menu, Lightbulb,
  Smile, Brain, Zap, ToyBrick, LayoutDashboard, TreePine, Waves,
  FileSymlink, LogOut, ShieldAlert, Trash2, FolderOpen, Save,
  Clock, PlusCircle, Search, Sparkles
} from 'lucide-react';
import { useAuth } from '@/components/AuthGuard';
import Image from 'next/image';
import Link from 'next/link';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { 
  doc, getDoc, setDoc, collection, query, where, getDocs, 
  addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, increment, deleteField, onSnapshot, limit
} from 'firebase/firestore';


import { callGeminiWithFallback } from '@/lib/gemini';

  const SYSTEM_PROMPT = `
Kamu adalah LKPD Generator Pro, spesialis perancang Lembar Kerja Peserta Didik (LKPD) visual untuk Kurikulum Merdeka. Tugasmu adalah merancang layout halaman yang padat, visual, edukatif, dan konsisten secara desain, lalu menerjemahkannya menjadi Prompt JSON Layout per halaman sesuai ukuran dan orientasi kertas yang diminta pengguna.

Jika pengguna menyertakan "KONTEKS PROYEK SEBELUMNYA" (Outline Proyek Sebelumnya), kamu WAJIB memastikan:
1. Tidak ada duplikasi materi yang identik antara proyek lama dan proyek baru ini.
2. Gaya bahasa, maskot (jika ada), dan tingkat kesulitan tetap konsisten.
3. Alur pembelajaran berkesinambungan (melanjutkan sub-topik berikutnya).

Output JSON-mu akan dibaca oleh AI Image Generator / Layout Engine untuk menyusun elemen visual dan teks menjadi sebuah dokumen utuh yang siap cetak.

BAGIAN 1 — STRUKTUR HALAMAN & KONTEN (PENTING)
1. HALAMAN 1: COVER / IDENTITAS LENGKAP
Jika membuat JSON untuk Halaman 1, struktur layout harus selalu diawali dengan area "HEADER_IDENTITAS_LENGKAP" sebelum masuk ke materi/latihan. Elemen yang wajib ada:
- Judul Utama: LKPD [Mata Pelajaran] — [Topik Spesifik]
- Subjudul: [Fase] / [Kelas]
- Branding Sekolah: Nama Sekolah, Nama Guru, Tahun Ajaran.
- Kotak Identitas Siswa: Sediakan field kosong bergaris titik-titik untuk Nama, Kelas, dan Nomor Absen.
- Tujuan Pembelajaran: 2-3 poin tujuan singkat.
- Petunjuk Pengerjaan & Alokasi Waktu: Instruksi dasar untuk siswa.
- Catatan Visual: Berikan elemen dekoratif yang paling mencolok dan maskot karakter utama di halaman ini untuk menarik perhatian siswa.

2. HALAMAN 2 DST: KONTEN LEMBAR SISWA (LATIHAN/MATERI)
Ini adalah halaman kerja murni untuk siswa.
- Header Minimal: Gunakan area "HEADER_MINIMAL" yang berisi Judul Topik singkat murni. DILARANG KERAS memunculkan teks "Halaman [X]" di Header (atas).
- ATURAN NOMOR HALAMAN (ANGAT KRITIKAL): Nomor halaman WAJIB diletakkan di area Footer (bawah) saja. Pastikan HEADER_MINIMAL tidak memiliki elemen nomor halaman.
- Konten: Berisi blok materi singkat (jika ada) dan blok latihan (Exercise).
- Zero-Placeholder: TULIS SOAL SECARA UTUH. Jangan gunakan teks seperti "tulis contoh soal di sini". Jika itu pilihan ganda, tulis opsi A, B, C, D dengan lengkap. Jika esai, tulis skenario pertanyaannya.
- LARANGAN KERAS: DILARANG KERAS menyertakan atau membocorkan kunci jawaban di halaman ini! Jangan memberi instruksi untuk melingkari/mencentang jawaban yang benar di dalam "visual_prompt" atau "elements". Biarkan area jawaban benar-benar kosong untuk diisi siswa.

3. HALAMAN TERAKHIR: PEGANGAN GURU (KUNCI JAWABAN)
Ini adalah halaman rahasia khusus untuk guru.
- Header Peringatan: Beri label "HALAMAN KHUSUS GURU — TIDAK UNTUK SISWA".
- Kunci Jawaban: Tuliskan semua jawaban yang benar untuk setiap soal (Exercise 1, Exercise 2, dst) dari halaman siswa.
- Rubrik Penilaian: Buat tabel atau poin cara menilai (contoh: Jawaban benar = 10 poin, salah = 0).
- Catatan Tindak Lanjut: Berikan saran Remedial (untuk siswa di bawah KKM) dan Pengayaan (untuk siswa yang sudah tuntas).
- Catatan Visual: Gunakan gaya desain yang lebih formal dan bersih (Clean Mono), kurangi elemen dekoratif berlebihan agar hemat tinta saat guru mencetaknya.

BAGIAN 2 — VISUAL STYLE GUIDE & TEMA
Gunakan visual_style_guide secara konsisten di setiap objek JSON berdasarkan parameter gaya yang dipilih:
- PLAYFUL_COLOR (Default SD): art_direction: "kawaii_flat_cartoon", warna-warni cerah, outline tebal, sudut membulat.
- CLEAN_MONO (SMP/SMA/Formal): art_direction: "clean_minimal_flat", monokrom dengan satu aksen warna, tanpa karakter kartun, garis tipis.
- NATURE_GREEN: art_direction: "natural_ilustration_flat", dominan hijau dan kuning bumi, dekorasi flora/fauna.
- OCEAN_BLUE: art_direction: "ocean_adventure_cartoon", dominan biru dan cyan, elemen gelombang laut.

BAGIAN 3 — ATURAN MODE KESULITAN
Mode kesulitan wajib mengubah struktur dan bobot soal, bukan sekadar label:
- REMEDIAL: Soal level C1-C2 (mengingat/memahami). Beri scaffolding/petunjuk visual tambahan. Pilihan ganda maksimal 3 opsi (A, B, C). Kalimat pendek.
- STANDAR: Soal level C1-C4. Pilihan ganda 4 opsi (A, B, C, D). Scaffolding normal.
- HOTS: Soal level C4-C6 (menganalisis/mengevaluasi/mencipta). Wajib ada stimulus (teks bacaan singkat / infografis / tabel). Wajib ada esai penalaran terbuka (open-ended).

BAGIAN 3B — MODE DRILLING (AKTIF JIKA PARAMETER drilling_mode: true)
Jika parameter "drilling_mode" bernilai true, terapkan seluruh aturan berikut:
1. ZERO MATERI: Dilarang keras menyertakan blok materi/teori apapun. Seluruh area konten HANYA berisi soal latihan.
2. KEPADATAN MAKSIMAL: Gunakan layout multi-kolom (minimal 2 kolom untuk PG). Target 20–40 soal per halaman A4 Portrait untuk tipe pilihan ganda.
3. TIPE SOAL PADAT: Prioritaskan pilihan ganda dan isian singkat. Untuk HOTS, maksimal 1–2 uraian singkat di bagian akhir.
4. HEADER MINIMAL: Gunakan HEADER_MINIMAL sangat ringkas, hanya judul topik + tipe soal. Tidak ada dekorasi berlebihan.
5. PENGELOMPOKAN SOAL: Kelompokkan berdasarkan tipe menggunakan divider tipis dan label bagian yang compact.
6. FIELD JAWABAN COMPACT: Untuk isian, gunakan garis pendek (________), bukan kotak besar.
7. ILUSTRASI MINIMAL: Gambar hanya jika menjadi bagian integral soal (stimulus). Dilarang ilustrasi dekoratif.
8. RASIO OVERRIDE: Parameter "rasio" diabaikan sepenuhnya saat drilling_mode aktif.

BAGIAN 4 — ATURAN SAFE AREA & PRINT MARGIN (SANGAT PENTING UNTUK CETAK)
Halaman LKPD ini akan dicetak fisik. Pastikan instruksi ini selalu diterapkan pada objek JSON:
1. Safe Margin: Tetapkan padding/margin keliling minimal 20mm (atau 0.75 inch) pada properti "layout_grid" di JSON. Sesuaikan proporsi ini dengan orientasi yang diminta (Portrait/Landscape).
2. Bleed Rule: Semua teks utama, instruksi, kotak soal, teks pilihan ganda, dan area tulis jawaban HARUS berada di dalam garis aman (safe area) agar tidak terpotong saat dicetak, dijilid, atau distaples.
3. Dekorasi Tepi: Hanya background color, pattern latar belakang, atau elemen dekoratif pinggiran (seperti rumput di batas bawah kertas, atau awan di batas atas) yang diizinkan menyentuh dan melewati batas tepi kanvas (full bleed).
4. Injeksi Parameter JSON: Wajib memasukkan parameter pengingat margin berikut di dalam objek "meta":
"print_guidelines": {
  "safe_area_margin": "20mm all sides",
  "content_placement": "Strictly inside safe area. Background can bleed to edges."
}

BAGIAN 5 — KONSISTENSI BRANDING (HEADER & FOOTER)
Agar seluruh dokumen terlihat profesional dan menyatu, kamu WAJIB menggunakan struktur yang identik untuk elemen branding di setiap halaman:
1. FOOTER BRANDING: Gunakan area "FOOTER_BRANDING" di bagian paling bawah setiap halaman.
   - Elemen wajib: Nama Guru, Tahun Ajaran, dan App Branding ("LKPD Generator Pro").
   - Sertakan "page_number" dalam format teks yang konsisten (contoh: "- [Nomor Halaman] -").
   - NOMOR HALAMAN WAJIB DI FOOTER.
2. STYLE CONSISTENCY: Jika halaman sebelumnya menggunakan gaya box kayu untuk footer, maka halaman berikutnya HARUS menggunakan gaya yang sama. Jangan mengubah "visual_prompt" untuk area footer antar halaman kecuali ada perubahan tema materi yang sangat drastis.

BAGIAN 6 — FORMAT OUTPUT JSON YANG DIMINTA
Pastikan output HANYA berisi format objek JSON yang valid.
Tidak boleh ada teks pengantar Markdown tambahan selain blok kode JSON.
Skema utama:
{
  "meta": {
    "page_number": "...",
    "subject": "...",
    "paper_size": "...",
    "orientation": "...",
    "print_guidelines": { ... }
  },
  "layout_structure": [
    // Daftar area seperti header, konten soal, footer
  ]
}
`;

const buildFooterTemplate = (
  pageId: string, 
  namaGuru: string, 
  tahunAjaran: string
) => {
  const hasGuru = namaGuru && namaGuru.trim() !== '';
  const hasTahun = tahunAjaran && tahunAjaran.trim() !== '';
  const hasBranding = hasGuru || hasTahun;

  return {
    area: "FOOTER_BRANDING",
    visual_prompt: "Thin dotted horizontal line separator. Single row below it: left side shows branding info if available, page number centered in bold 9pt, 'LKPD Generator Pro' right-aligned in 8pt sans-serif. No other elements.",
    elements: [
      {
        type: "divider",
        style: "thin_dotted_line"
      },
      {
        type: "layout_row",
        columns: [
          {
            content: hasBranding
              ? [
                  hasGuru ? `Guru: ${namaGuru}` : null,
                  hasTahun ? `TA: ${tahunAjaran}` : null
                ].filter(Boolean).join(" | ")
              : null,
            alignment: "left",
            style: "normal_7pt"
          },
          {
            content: `- ${pageId} -`,
            alignment: "center",
            style: "bold_9pt"
          },
          {
            content: "LKPD Generator Pro",
            alignment: "right",
            style: "normal_8pt"
          }
        ]
      }
    ]
  };
};

const formatGeminiError = (error: any): string => {
  const msg = error?.message?.toLowerCase() || "";
  if (msg.includes("429") || msg.includes("quota") || msg.includes("resource_exhausted")) {
    return "Sistem sedang memproses terlalu banyak permintaan (Kuota habis). Silakan tunggu sekitar 1 menit dan coba lagi.";
  }
  if (msg.includes("500") || msg.includes("503") || msg.includes("overloaded") || msg.includes("api key") || msg.includes("deadline")) {
    return "Terjadi masalah pada server AI atau koneksi. Silakan coba beberapa saat lagi.";
  }
  return "Terjadi kesalahan saat menghubungi server. Silakan coba beberapa saat lagi.";
};

const callGeminiAPI = async (
  userPrompt: string, 
  systemInstruction: string, 
  isJson = false,
  role: string = "user",
  userKeys: string[] = [],
  isAutoinjected: boolean = false
) => {
  // 1. Determine Keys to use
  let keysToTry: string[] = [];
  
  if (isAutoinjected) {
    const adminKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!adminKey) throw new Error("API Key sistem tidak ditemukan. Hubungi developer.");
    keysToTry = [adminKey];
  } else {
    // User Rule: BYOK
    const validUserKeys = userKeys.filter(k => k && k.trim() !== "");
    if (validUserKeys.length === 0) {
      throw new Error("API Key tidak ditemukan. Silakan masukkan API Key di menu 'API Settings'.");
    }
    keysToTry = validUserKeys;
  }

  // 2. Call the failover engine
  try {
    const response = await callGeminiWithFallback(
      userPrompt, 
      keysToTry, 
      systemInstruction, 
      isJson
    );
    
    // We can log the model used for debugging if needed
    console.log(`[Gemini] Success using ${response.modelUsed} (Key Index: ${response.keyUsedIndex})`);
    
    return response.text;
  } catch (error: any) {
    // If it's already a formatted error from callGeminiWithFallback, re-throw
    // otherwise wrap in formatGeminiError
    throw new Error(formatGeminiError(error));
  }
};

const JENJANG_MAP: Record<string, any> = {
  "PAUD/TK": { types: ["Kelompok A (4-5 th)", "Kelompok B (5-6 th)", "Toddler", "Playgroup"] },
  "SD (Kurikulum Merdeka)": {
    fases: {
      "Fase A": ["Kelas 1", "Kelas 2"],
      "Fase B": ["Kelas 3", "Kelas 4"],
      "Fase C": ["Kelas 5", "Kelas 6"]
    }
  },
  "SMP": { fases: { "Fase D": ["Kelas 7", "Kelas 8", "Kelas 9"] } },
  "SMA/SMK": {
    fases: {
      "Fase E": ["Kelas 10"],
      "Fase F": ["Kelas 11", "Kelas 12"]
    }
  },
  "Perguruan Tinggi": { types: ["Tingkat Dasar", "Tingkat Lanjut", "Semester 1-2", "Semester 3-4", "Semester 5-6", "Semester 7-8", "Vokasi"] },
  "Umum / Kursus": { types: ["Pemula", "Menengah", "Mahir", "Karyawan", "Hobi"] }
};

// --- Team Manager Component (For Agencies) ---
function TeamManager({ userProfile }: { userProfile: any }) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter and Pagination states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("agencyId", "==", userProfile.uid));
      const snap = await getDocs(q);
      setMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error("Failed to fetch team members", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.uid) fetchMembers();
  }, [userProfile]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!newEmail.trim()) return;

    // Check quota
    if (userProfile?.licenseStatus === 'capped' && (userProfile?.usageCount || 0) >= (userProfile?.userQuota || 0)) {
      setErrorMsg("Kuota tim Anda sudah penuh. Silakan hubungi Admin untuk meningkatkan kuota.");
      return;
    }

    setIsAdding(true);
    try {
      // Find if user already exists
      const q = query(collection(db, "users"), where("email", "==", newEmail.trim().toLowerCase()), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        if (userDoc.data().agencyId) {
          setErrorMsg("User ini sudah terdaftar di tim lain.");
          return;
        }
        await updateDoc(doc(db, "users", userDoc.id), {
          agencyId: userProfile.uid,
          role: "user",
          status: "active",
          removedByAgency: deleteField() // remove flag if previously removed from agency
        });
      } else {
        // Create skeleton user
        await addDoc(collection(db, "users"), {
          uid: null, // Placeholder for future sync
          email: newEmail.trim().toLowerCase(),
          agencyId: userProfile.uid,
          role: "user",
          status: "active",
          createdAt: serverTimestamp(),
          lastLogin: null, // Placeholder
          licenseStatus: "none",
          userQuota: 0,
          usageCount: 0,
          displayName: "",
          photoURL: ""
        });
      }

      // Update Agency's usage count
      await updateDoc(doc(db, "users", userProfile.uid), {
        usageCount: increment(1)
      });

      setNewEmail("");
      fetchMembers();
      setSuccessMsg("Berhasil menambahkan anggota tim.");
    } catch (err) {
      setErrorMsg("Gagal menambahkan anggota: " + (err as Error).message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const docRef = doc(db, "users", memberId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const userEmail = data.email?.toLowerCase();
        
        // Always delete the document entirely from the users collection
        await deleteDoc(docRef);

        // Delete any secondary skeleton docs with the same email in the collection to prevent races
        if (userEmail) {
          const q = query(collection(db, "users"), where("email", "==", userEmail), where("agencyId", "==", userProfile.uid), limit(5));
          const snap = await getDocs(q);
          for (const docD of snap.docs) {
            if (docD.id !== memberId) {
              try {
                await deleteDoc(doc(db, "users", docD.id));
              } catch (delErr) {
                console.warn("Skipping deletion of secondary user (no permission or already deleted):", delErr);
              }
            }
          }
        }
      }
      await updateDoc(doc(db, "users", userProfile.uid), {
        usageCount: increment(-1)
      });
      fetchMembers();
      setSuccessMsg("Berhasil menghapus anggota dari tim.");
    } catch (e) {
      setErrorMsg("Gagal menghapus: " + (e as Error).message);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Client-side filtering & sorting
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const emailMatch = (m.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      const nameMatch = (m.displayName || "").toLowerCase().includes(searchQuery.toLowerCase());
      const searchMatch = !searchQuery || emailMatch || nameMatch;

      const activeVal = m.status === 'active' && m.uid != null;
      const statusText = activeVal ? "active" : "invited";
      const statusMatch = !filterStatus || statusText === filterStatus;

      return searchMatch && statusMatch;
    });
  }, [members, searchQuery, filterStatus]);

  const totalPages = Math.ceil(filteredMembers.length / PAGE_SIZE) || 1;
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, currentPage]);

  // Adjust page number if filtered members count shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">My Team</h1>
        <p className="text-slate-500">Kelola anggota tim / user Anda ({userProfile?.usageCount || 0} / {userProfile?.licenseStatus === 'unlimited' ? '∞' : (userProfile?.userQuota || 0)} digunakan).</p>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Check className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-sm font-medium">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleAddMember} className="mb-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email Anggota Baru</label>
          <input 
            type="email"
            placeholder="email@contoh.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 ring-blue-500/20 text-sm"
            required
          />
        </div>
        <div className="flex items-end">
          <button 
            type="submit"
            disabled={isAdding}
            className="w-full sm:w-auto bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
          >
            {isAdding ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : "Tambah Anggota"}
          </button>
        </div>
      </form>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari berdasarkan nama / email..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 ring-blue-500/10 placeholder:text-slate-400"
          />
        </div>
        <select 
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-sm outline-none font-medium text-slate-600 dark:text-slate-300"
        >
          <option value="">Semua Status</option>
          <option value="active">Active</option>
          <option value="invited">Invited</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest">
              <tr>
                <th className="px-6 py-4">Nama / Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Terakhir Login</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">Memuat data tim...</td>
                </tr>
              ) : paginatedMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic">Tidak ada anggota yang cocok.</td>
                </tr>
              ) : paginatedMembers.map((m) => {
                const isActiveMember = m.status === 'active' && m.uid != null;
                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-white">{m.displayName || "Menunggu..."}</span>
                        <span className="text-xs text-slate-400">{m.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        isActiveMember ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {isActiveMember ? 'Active' : 'Invited'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-400">
                      {m.lastLogin ? new Date(m.lastLogin.seconds * 1000).toLocaleString('id-ID') : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {confirmDeleteId === m.id ? (
                        <div className="flex items-center justify-end gap-2 animate-in fade-in zoom-in-95 duration-200">
                          <span className="text-[11px] font-bold text-red-500 animate-pulse">Yakin hapus?</span>
                          <button 
                            onClick={() => handleRemoveMember(m.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            Ya
                          </button>
                          <button 
                            onClick={() => setConfirmDeleteId(null)}
                            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmDeleteId(m.id)}
                          className="text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all inline-flex items-center justify-center"
                          title="Hapus dari tim"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {filteredMembers.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/20">
            <span className="text-xs text-slate-500">
              Menampilkan {paginatedMembers.length} dari {filteredMembers.length} anggota
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Sebelumnya
              </button>
              <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Agency Manager Component (Super Admin Only) ---
function AgencyManager({ isDarkMode }: { isDarkMode: boolean }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  // Active Expand state for Whitetlist Form
  const [showWhitelistForm, setShowWhitelistForm] = useState(false);
  const [whitelistEmail, setWhitelistEmail] = useState("");
  const [whitelistRole, setWhitelistRole] = useState("agency");
  const [whitelistLicense, setWhitelistLicense] = useState("capped");
  const [whitelistQuota, setWhitelistQuota] = useState("10");
  const [isAddingWhitelist, setIsAddingWhitelist] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterLicense, setFilterLicense] = useState("");

  // Sort state
  const [sortField, setSortField] = useState("lastLogin");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  // Real-time synchronization
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => {
      console.error("Real-time updates failed for users collection:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateUser = async (userId: string, updates: any) => {
    console.log(`[AgencyManager] Updating user ${userId} with:`, updates);
    if (!userId) {
      alert("Error: User ID tidak ditemukan.");
      return;
    }
    setIsSavingLocal(true);
    try {
      await updateDoc(doc(db, "users", userId), updates);
      console.log(`[AgencyManager] Update successful for ${userId}`);
      setEditingUser(null);
    } catch (e) {
      console.error(`[AgencyManager] Update failed for ${userId}`, e);
      alert("Gagal update user: " + (e as Error).message);
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whitelistEmail.trim()) return;

    setIsAddingWhitelist(true);
    try {
      const q = query(collection(db, "users"), where("email", "==", whitelistEmail.trim().toLowerCase()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        alert("Email ini sudah terdaftar di sistem.");
        return;
      }

      const isCapped = whitelistLicense === 'capped';
      const isUnlimited = whitelistLicense === 'unlimited';

      // Create a skeleton with random ID
      await addDoc(collection(db, "users"), {
        uid: null,
        email: whitelistEmail.trim().toLowerCase(),
        role: whitelistRole,
        status: "active", // Active from start as it's directly whitelist/invited by admin
        licenseStatus: whitelistLicense,
        userQuota: isCapped ? Number(whitelistQuota) : (isUnlimited ? 999999 : 0),
        usageCount: 0,
        purchaseDate: new Date().toISOString().split('T')[0],
        displayName: "",
        photoURL: "",
        createdAt: serverTimestamp(),
        lastLogin: null
      });

      alert("Berhasil melakukan Whitelist email baru ke dalam sistem.");
      setWhitelistEmail("");
      setShowWhitelistForm(false);
    } catch (err) {
      alert("Gagal Whitelist email: " + (err as Error).message);
    } finally {
      setIsAddingWhitelist(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Filter & Sort computation
  const sortedAndFilteredUsers = useMemo(() => {
    // 1. Filter
    const filtered = users.filter(u => {
      // Exclude team members that have agencyId set
      if (u.agencyId) return false;

      const nameMatch = (u.displayName || "").toLowerCase().includes(searchQuery.toLowerCase());
      const emailMatch = (u.email || "").toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSearch = !searchQuery || nameMatch || emailMatch;

      const matchesRole = !filterRole || u.role === filterRole;
      const matchesStatus = !filterStatus || u.status === filterStatus;
      const matchesLicense = !filterLicense || u.licenseStatus === filterLicense;

      return matchesSearch && matchesRole && matchesStatus && matchesLicense;
    });

    // 2. Sort
    return [...filtered].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle Timestamp conversion
      if (valA && typeof valA === "object" && "seconds" in valA) {
        valA = valA.seconds;
      }
      if (valB && typeof valB === "object" && "seconds" in valB) {
        valB = valB.seconds;
      }

      if (valA == null) return sortDirection === "asc" ? -1 : 1;
      if (valB == null) return sortDirection === "asc" ? 1 : -1;

      if (typeof valA === "string") {
        return sortDirection === "asc" 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      return sortDirection === "asc" 
        ? (valA > valB ? 1 : -1) 
        : (valB > valA ? 1 : -1);
    });
  }, [users, searchQuery, filterRole, filterStatus, filterLicense, sortField, sortDirection]);

  // Pagination compilation
  const totalPages = Math.ceil(sortedAndFilteredUsers.length / PAGE_SIZE) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedAndFilteredUsers.slice(start, start + PAGE_SIZE);
  }, [sortedAndFilteredUsers, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const renderSortIndicator = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? " ▲" : " ▼";
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Agency Management</h1>
          <p className="text-slate-500">Kelola lisensi pembeli, berikan akses Agency, dan tambah email ke whitelist.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowWhitelistForm(!showWhitelistForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            {showWhitelistForm ? "Sembunyikan Form Whitelist" : "Whitelist Baru"}
          </button>
        </div>
      </div>

      {/* Whitelist New Email Form */}
      {showWhitelistForm && (
        <form onSubmit={handleAddWhitelist} className="mb-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-blue-100 dark:border-blue-900 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-md font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            Whitelist Email Baru (Manual Skeletons)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Email Whitelist</label>
              <input 
                type="email" 
                placeholder="email@contoh.com"
                value={whitelistEmail}
                onChange={(e) => setWhitelistEmail(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Role</label>
              <select 
                value={whitelistRole}
                onChange={(e) => setWhitelistRole(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm"
              >
                <option value="user">User (Anggota biasa)</option>
                <option value="agency">Agency (Halaman Team Anda)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">License</label>
              <select 
                value={whitelistLicense}
                onChange={(e) => setWhitelistLicense(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm"
              >
                <option value="none">Tanpa Lisensi</option>
                <option value="unlimited">Unlimited (Promo Mei)</option>
                <option value="capped">Capped (Standard)</option>
              </select>
            </div>
            {whitelistLicense === 'capped' ? (
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Kuota Quota</label>
                <input 
                  type="number"
                  placeholder="10"
                  value={whitelistQuota}
                  onChange={(e) => setWhitelistQuota(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2.5 outline-none text-sm"
                />
              </div>
            ) : <div className="hidden md:block"></div>}
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => setShowWhitelistForm(false)}
              className="px-4 py-2.5 text-sm font-semibold border dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit" 
              disabled={isAddingWhitelist}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2"
            >
              {isAddingWhitelist ? "Membuat..." : "Simpan ke Whitelist"}
            </button>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-3xl">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Cari nama / email..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 ring-blue-500/10 placeholder:text-slate-400"
          />
        </div>
        <select 
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
          className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none font-semibold text-slate-600 dark:text-slate-300"
        >
          <option value="">Semua Role</option>
          <option value="user">User</option>
          <option value="agency">Agency</option>
          <option value="admin">Admin</option>
          <option value="super-admin">Super Admin</option>
        </select>
        <select 
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none font-semibold text-slate-600 dark:text-slate-300"
        >
          <option value="">Semua Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        <select 
          value={filterLicense}
          onChange={(e) => { setFilterLicense(e.target.value); setCurrentPage(1); }}
          className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none font-semibold text-slate-600 dark:text-slate-300"
        >
          <option value="">Semua Lisensi</option>
          <option value="none">Tanpa Lisensi</option>
          <option value="capped">Capped</option>
          <option value="unlimited">Unlimited</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-bold tracking-widest cursor-pointer select-none">
              <tr>
                <th className="px-6 py-4" onClick={() => handleSort("displayName")}>User {renderSortIndicator("displayName")}</th>
                <th className="px-6 py-4" onClick={() => handleSort("role")}>Role {renderSortIndicator("role")}</th>
                <th className="px-6 py-4" onClick={() => handleSort("status")}>Status {renderSortIndicator("status")}</th>
                <th className="px-6 py-4" onClick={() => handleSort("licenseStatus")}>License {renderSortIndicator("licenseStatus")}</th>
                <th className="px-6 py-4" onClick={() => handleSort("usageCount")}>Quota {renderSortIndicator("usageCount")}</th>
                <th className="px-6 py-4" onClick={() => handleSort("lastLogin")}>Terakhir Login {renderSortIndicator("lastLogin")}</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">Memuat seluruh data user secara real-time...</td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400 italic">Tidak ada user yang cocok dengan kriteria.</td>
                </tr>
              ) : paginatedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-white">{u.displayName || "Menunggu..."}</span>
                      <span className="text-xs text-slate-400">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.role || "user"}
                      disabled={u.email === 'jagofeed@gmail.com'}
                      onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                      className="bg-transparent font-medium text-blue-600 dark:text-blue-400 outline-none cursor-pointer text-xs"
                    >
                      <option value="user">User</option>
                      <option value="agency">Agency</option>
                      <option value="admin">Admin</option>
                      <option value="super-admin">Super Admin</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={u.status || "pending"}
                      disabled={u.email === 'jagofeed@gmail.com'}
                      onChange={(e) => handleUpdateUser(u.id, { status: e.target.value })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border cursor-pointer ${
                        u.status === 'active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400' : 
                        u.status === 'suspended' ? 'bg-red-50 border-red-100 text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 
                        'bg-amber-50 border-amber-100 text-amber-600 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400'
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                      u.licenseStatus === 'unlimited' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 
                      u.licenseStatus === 'capped' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 
                      'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    }`}>
                      {u.licenseStatus || 'none'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                    {u.usageCount || 0} / {u.licenseStatus === 'unlimited' ? '∞' : (u.userQuota || 0)}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">
                    {u.lastLogin ? new Date(u.lastLogin.seconds * 1000).toLocaleString('id-ID') : "-"}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="text-blue-600 hover:underline font-bold text-xs"
                    >
                      Edit Lisensi
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {sortedAndFilteredUsers.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/10">
            <span className="text-xs text-slate-500">
              Menampilkan {paginatedUsers.length} dari {sortedAndFilteredUsers.length} user
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Sebelumnya
              </button>
              <span className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                Berikutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <h2 className="text-xl font-bold mb-4">Edit Lisensi Agency</h2>
            <p className="text-sm text-slate-500 mb-6 font-medium">User: {editingUser.email}</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tipe Lisensi</label>
                <select 
                  className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-sm"
                  value={editingUser.licenseStatus || "none"}
                  onChange={(e) => setEditingUser({...editingUser, licenseStatus: e.target.value})}
                >
                  <option value="none">Tanpa Lisensi</option>
                  <option value="unlimited">Unlimited (Promo Mei)</option>
                  <option value="capped">Capped (Standard)</option>
                </select>
              </div>

              {editingUser.licenseStatus === 'capped' && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Kuota User/Proyek</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-sm"
                    value={editingUser.userQuota || 100}
                    onChange={(e) => setEditingUser({...editingUser, userQuota: parseInt(e.target.value)})}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tgl Pembelian</label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-2 text-sm"
                  value={editingUser.purchaseDate ? editingUser.purchaseDate.split('T')[0] : ""}
                  onChange={(e) => setEditingUser({...editingUser, purchaseDate: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setEditingUser(null)}
                disabled={isSavingLocal}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold transition-all disabled:opacity-50 text-sm"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  const licStatus = editingUser.licenseStatus || 'none';
                  handleUpdateUser(editingUser.id, {
                    licenseStatus: licStatus,
                    userQuota: Number(editingUser.userQuota) || 0,
                    purchaseDate: editingUser.purchaseDate || null,
                    role: licStatus !== 'none' ? 'agency' : (editingUser.role || 'user')
                  });
                }}
                disabled={isSavingLocal}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {isSavingLocal ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [view, setView] = useState<"dashboard" | "generator" | "api_settings">("dashboard");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [userApiKeys, setUserApiKeys] = useState<string[]>(["", "", ""]);
  const [keysLoaded, setKeysLoaded] = useState(false);

  const [step, setStep] = useState(1);
  const swiperRef = useRef<SwiperType | null>(null);

  const goToStep = (newStep: number) => {
    setStep(newStep);
    if (swiperRef.current) {
      setTimeout(() => {
        swiperRef.current?.slideTo(newStep - 1);
      }, 100);
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [revisionInput, setRevisionInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // State for AI-powered helper features
  const [isSuggestingMateri, setIsSuggestingMateri] = useState(false);
  const [isSuggestingVisual, setIsSuggestingVisual] = useState(false);
  const [isSuggestingFooter, setIsSuggestingFooter] = useState(false);

  const [outlineText, setOutlineText] = useState("");
  
  const [activeTab, setActiveTab] = useState("1"); // Page ID
  const [pageData, setPageData] = useState<Record<string, any>>({}); 

  const defaultFormData = {
    mapel: 'Bahasa Inggris',
    materi: 'Transportation',
    jenjang: 'SD (Kurikulum Merdeka)',
    fase: 'Fase B',
    kelas: 'Kelas 3',
    halaman: 2,
    rasio: '30:70',
    drillingMode: false,
    mode: 'STANDAR',
    visual: 'PLAYFUL_COLOR',
    namaGuru: '',
    namaSekolah: '',
    tahunAjaran: '',
    footerText: 'Dibuat dengan LKPD Generator Pro',
    karakter: 'Hewan Hutan (Animal)',
    bilingual: false,
    pesanKhusus: '',
    ukuranKertas: 'A4',
    orientasi: 'Portrait',
    referensiProyek: '',
  };

  const [formData, setFormData] = useState(defaultFormData);

  // --- Start: Project Health/Memory Logic ---
  const projectUsage = useMemo(() => {
    try {
      const dataToMeasure = {
        formData,
        outline: outlineText,
        pageData: JSON.stringify(pageData)
      };
      const bytes = JSON.stringify(dataToMeasure).length;
      const limit = 1000000; // 1MB limit
      const percentage = Math.min((bytes / limit) * 100, 100);
      
      return {
        bytes,
        percentage,
        isWarning: percentage > 60,
        isCritical: percentage > 85,
        kb: (bytes / 1024).toFixed(1)
      };
    } catch (e) {
      return { bytes: 0, percentage: 0, isWarning: false, isCritical: false, kb: "0" };
    }
  }, [formData, outlineText, pageData]);
  // --- End: Project Health/Memory Logic ---

  const [isMounted, setIsMounted] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [userStatus, setUserStatus] = useState<string>("loading");

  const isPromoPeriod = () => {
    const now = new Date();
    const start = new Date("2026-05-15T00:00:00Z");
    const end = new Date("2026-05-17T23:59:59Z");
    return now >= start && now <= end;
  };

  const isQuotaExceeded = () => {
    if (userRole === "super-admin" || userRole === "admin") return false;
    
    // If part of an agency, check agency status first
    if (userProfile?.agencyId) {
      // Note: Ideally we'd fetch agency profile here, but for now we assume 
      // if they are in the team, they follow their own user limit OR stay active.
      // In a real app, we'd check if (agencyProfile.status === 'suspended')
    }

    if (userProfile?.licenseStatus === "unlimited") return false;
    if (userProfile?.role === "agency" && userProfile?.licenseStatus === "capped") {
      return (userProfile.usageCount || 0) >= (userProfile.userQuota || 0);
    }
    
    // Default user limit (10 projects for free users)
    if (userRole === "user" && !userProfile?.licenseStatus) {
      return projects.length >= 10; 
    }
    return false;
  };

const [isExpandedMagicPrompt, setIsExpandedMagicPrompt] = useState(false);
  const [isExpandedRevisionOutline, setIsExpandedRevisionOutline] = useState(false);
  const [isExpandedRevisionPage, setIsExpandedRevisionPage] = useState(false);

  const { user, logout } = useAuth();

  const fetchProjects = async () => {
    if (!user) return;
    setIsLoadingProjects(true);
    try {
      const q = query(
        collection(db, "lkpds"), 
        where("userId", "==", user.uid),
        orderBy("updatedAt", "desc"),
        limit(50)
      );
      const querySnapshot = await getDocs(q);
      const projectList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProjects(projectList);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, "lkpds");
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleSaveProject = async () => {
    if (!user) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const projectData = {
        userId: user.uid,
        title: `${formData.mapel} - ${formData.materi}`,
        step: step,
        formData: formData,
        outline: outlineText,
        pageData: JSON.stringify(pageData),
        referensiProyek: formData.referensiProyek || "",
        updatedAt: serverTimestamp()
      };

      // Check for size limit (roughly 1MB limit for Firestore)
      const estimatedSize = JSON.stringify(projectData).length;
      if (estimatedSize > 950000) { // ~950KB buffer
        throw new Error("Penyimpanan Gagal: Project ini terlalu besar (terlalu banyak detail halaman). Silakan bagi menjadi dua project berbeda agar tetap bisa tersimpan.");
      }

      if (projectId) {
        await updateDoc(doc(db, "lkpds", projectId), projectData);
      } else {
        const newProject = {
          ...projectData,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, "lkpds"), newProject);
        setProjectId(docRef.id);

        // Update Usage Count for license
        if (userRole === "agency" || userRole === "user") {
          const userRef = doc(db, "users", user.uid);
          await updateDoc(userRef, {
            usageCount: increment(1)
          });
          setUserProfile((prev: any) => ({
            ...prev,
            usageCount: (prev?.usageCount || 0) + 1
          }));
        }
      }
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      
      fetchProjects();
    } catch (err: any) {
      console.error("Gagal menyimpan project", err);
      if (err?.message?.includes("too large") || err?.message?.includes("limit exceeded")) {
        setErrorMsg("Batas Kapasitas: Project terlalu besar untuk disimpan dalam satu file. Mohon kurangi jumlah halaman.");
      } else {
        setErrorMsg(err?.message || "Gagal menyimpan ke server. Hubungi admin jika masalah berlanjut.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenProject = (project: any) => {
    setProjectId(project.id);
    setFormData({ ...defaultFormData, ...(project.formData || {}) });
    setOutlineText(project.outline || "");
    
    // Handle serialized pageData to avoid nested array errors in Firestore
    let pData = {};
    if (typeof project.pageData === 'string') {
      try {
        pData = JSON.parse(project.pageData);
      } catch (e) {
        console.error("Failed to parse pageData", e);
        pData = {};
      }
    } else {
      pData = project.pageData || {};
    }
    setPageData(pData);
    
    setStep(project.step || 1);
    setView("generator");
    goToStep(project.step || 1);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Hapus project ini secara permanen?")) return;
    
    try {
      await deleteDoc(doc(db, "lkpds", id));
      if (projectId === id) {
        handleCreateNew();
      }
      fetchProjects();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `lkpds/${id}`);
    }
  };

  const handleCreateNew = () => {
    setProjectId(null);
    setFormData(defaultFormData);
    setOutlineText("");
    setPageData({});
    setStep(1);
    setView("generator");
    goToStep(1);
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    console.log("App Mounted", { isDarkMode, formData, user: user?.email });
    setIsMounted(true);
    
    // Check role and status if user exists
    if (user) {
      const fetchUserData = async () => {
        try {
          const userRef = doc(db, "users", user.uid);
          let userSnap = await getDoc(userRef);
          
          let profileToUse = userSnap.exists() ? userSnap.data() : null;

          // Check if user has been removed from agency
          if (profileToUse?.removedByAgency) {
            console.log("User profile marks as removed by agency. Skipping migration.");
          } else {
            // Check if there is a pending license/skeleton for this email
            const q = query(collection(db, "users"), where("email", "==", user.email?.toLowerCase()), limit(5));
            const querySnap = await getDocs(q);
            
            if (!querySnap.empty) {
              // Find doc that is NOT the current UID (meaning it's a skeleton with random ID)
              const skeletonDoc = querySnap.docs.find(doc => doc.id !== user.uid);
              
              if (skeletonDoc) {
                const skeletonData = skeletonDoc.data();
                console.log("Found pending license/skeleton doc, migrating...");
                const mergedUser = {
                  ...(profileToUse || {}),
                  ...skeletonData,
                  uid: user.uid,
                  email: user.email?.toLowerCase(),
                  lastLogin: serverTimestamp(),
                  displayName: user.displayName || profileToUse?.displayName || skeletonData.displayName || "",
                  photoURL: user.photoURL || profileToUse?.photoURL || skeletonData.photoURL || "",
                  status: skeletonData.status || "active" // Ensure we respect status from skeleton, don't hardcode active
                };
                
                await setDoc(userRef, mergedUser);
                await deleteDoc(doc(db, "users", skeletonDoc.id));
                
                userSnap = await getDoc(userRef); // Refresh
                profileToUse = userSnap.data();
              }
            }
          }

          if (userSnap.exists()) {
            let data = userSnap.data();
            
            // ALWAYS sync latest info to keep agency/admin dashboards updated
            const needsUpdate = 
              data.displayName !== user.displayName || 
              data.photoURL !== user.photoURL || 
              !data.lastLogin;

            if (needsUpdate) {
              await updateDoc(userRef, {
                displayName: user.displayName || data.displayName || "",
                photoURL: user.photoURL || data.photoURL || "",
                lastLogin: serverTimestamp()
              });
            }

            // AUTO-BOOTSTRAP: Force jagofeed@gmail.com to be super-admin if not already
            if (user.email === "jagofeed@gmail.com" && data.role !== "super-admin") {
              await updateDoc(doc(db, "users", user.uid), { 
                role: "super-admin", 
                status: "active" 
              });
              data = { ...data, role: "super-admin", status: "active" };
            }

            setUserProfile(data);
            setUserRole(data.role || "user");
            setUserStatus(data.status || "active");
          } else {
            // If user does not exist in Firestore, only allow jagofeed@gmail.com to self-register
            if (user.email === "jagofeed@gmail.com") {
              const newUser = {
                uid: user.uid,
                email: "jagofeed@gmail.com",
                role: "super-admin",
                status: "active",
                licenseStatus: "unlimited",
                userQuota: 999999,
                usageCount: 0,
                purchaseDate: null,
                lastLogin: serverTimestamp(),
                displayName: user.displayName || "Super Admin",
                photoURL: user.photoURL || ""
              };
              await setDoc(doc(db, "users", user.uid), newUser);
              setUserProfile(newUser);
              setUserRole("super-admin");
              setUserStatus("active");
            } else {
              setUserStatus("not_invited");
            }
          }
        } catch (e) {
          console.error("Error checking/creating user profile", e);
          setUserStatus("error");
        }
      };
      fetchUserData();
    } else {
      setUserStatus("unauthenticated");
    }

    // Load BYOK Keys
    try {
      const savedKeys = localStorage.getItem('eduPrint_apiKeys');
      if (savedKeys) {
        setUserApiKeys(JSON.parse(savedKeys));
      }
      setKeysLoaded(true);
    } catch (e) {
      setKeysLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    if (isMounted && keysLoaded) {
      try {
        localStorage.setItem('eduPrint_apiKeys', JSON.stringify(userApiKeys));
      } catch (e) {}
    }
  }, [userApiKeys, isMounted, keysLoaded]);

  const handleKeyChange = (index: number, val: string) => {
    const newKeys = [...userApiKeys];
    newKeys[index] = val;
    setUserApiKeys(newKeys);
  };

  const isAutoinjected = useMemo(() => {
    return userRole === "super-admin" || userRole === "admin";
  }, [userRole]);

  const isUserKeyReady = isAutoinjected || userApiKeys.some(k => k && k.trim().length > 10);

  // Initial theme logic
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const numSiswaPages = parseInt(String(formData.halaman)) || 1;
  const numGuruPages = Math.ceil(numSiswaPages / 2);

  // Modified calls using BYOK logic
  const handleSuggestMateri = async () => {
    setIsSuggestingMateri(true);
    try {
      const prompt = `Berikan 1 ide topik/materi spesifik yang sangat menarik dan kreatif untuk jenjang ${formData.jenjang} (${formData.fase} - ${formData.kelas}) mata pelajaran ${formData.mapel}. Hanya keluarkan nama materinya saja, maksimal 5 kata.`;
      const result = await callGeminiAPI(prompt, "Kamu adalah asisten guru yang jenius.", false, userRole, userApiKeys, isAutoinjected);
      if (result) {
        setFormData((prev: any) => ({ ...prev, materi: result?.replace(/["*]/g, '').trim() }));
      }
    } catch (err: any) {
      console.error("Gagal mendapat saran materi", err);
      setErrorMsg(err?.message || "Gagal mendapat saran materi");
    } finally {
      setIsSuggestingMateri(false);
    }
  };

  const handleSuggestVisual = async () => {
    setIsSuggestingVisual(true);
    try {
      const prompt = `Buatkan 1 instruksi kalimat visual yang kreatif, menarik, dan spesifik untuk generator gambar berdasarkan gaya "${formData.visual}" dan karakter "${formData.karakter}". Materinya adalah "${formData.mapel} - ${formData.materi}".`;
      const result = await callGeminiAPI(prompt, "Kamu adalah art director kreatif.", false, userRole, userApiKeys, isAutoinjected);
      if (result) {
        setFormData((prev: any) => ({ ...prev, pesanKhusus: result?.replace(/["*]/g, '').trim() }));
      }
    } catch (err: any) {
      console.error("Gagal mendapat saran visual", err);
      setErrorMsg(err?.message || "Gagal mendapat saran visual");
    } finally {
      setIsSuggestingVisual(false);
    }
  };

  const handleJenjangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const newData = { ...formData, jenjang: val };
    
    // Auto-select first available fase or type
    const jenjangData = JENJANG_MAP[val];
    if (jenjangData && jenjangData.fases) {
      const firstFase = Object.keys(jenjangData.fases)[0];
      newData.fase = firstFase;
      newData.kelas = jenjangData.fases[firstFase][0];
    } else if (jenjangData && jenjangData.types) {
      newData.fase = "-";
      newData.kelas = jenjangData.types[0];
    }
    
    setFormData(newData);
  };

  const handleFaseChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const jenjangData = JENJANG_MAP[formData.jenjang];
    if (jenjangData && jenjangData.fases && jenjangData.fases[val]) {
      const classes = jenjangData.fases[val];
      setFormData({ ...formData, fase: val, kelas: classes[0] });
    }
  };

  const handleSuggestFooter = async () => {
    setIsSuggestingFooter(true);
    try {
      const prompt = `Buatkan 1 kalimat slogan singkat (maksimal 6 kata) untuk menyemangati siswa belajar.`;
      const result = await callGeminiAPI(prompt, "Kamu adalah pemberi motivasi anak.", false, userRole, userApiKeys, isAutoinjected);
      if (result) {
        setFormData((prev: any) => ({ ...prev, footerText: result?.replace(/["*]/g, '').trim() }));
      }
    } catch (err: any) {
      console.error("Gagal mendapat saran footer", err);
      setErrorMsg(err?.message || "Gagal mendapat saran footer");
    } finally {
      setIsSuggestingFooter(false);
    }
  };

  const handleGenerateOutline = async () => {
    console.log("Generating Outline...");
    
    // License Check
    if (isQuotaExceeded()) {
      setErrorMsg("Kuota Lisensi Habis: Anda telah mencapai batas maksimal pembuatan proyek untuk lisensi ini. Silakan hubungi Super Admin untuk memperpanjang/meningkatkan lisensi.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg("");
    try {
      let contextPrev = "";
      if (formData.referensiProyek) {
        const refProject = projects.find(p => p.id === formData.referensiProyek);
        if (refProject && refProject.outline) {
          contextPrev = `\nKONTEKS PROYEK SEBELUMNYA (Outline Proyek Lama):\n${refProject.outline}\n--- Gunakan ini sebagai referensi agar materi berkesinambungan dan tidak duplikat. ---`;
        }
      }

      const userPrompt = `
        Berdasarkan parameter berikut, buatkan Rencana Konten (Outline) untuk LKPD.
        PARAMETER:
        - Mata Pelajaran: ${formData.mapel}
        - Materi Spesifik: ${formData.materi}
        - Jenjang: ${formData.jenjang}
        - Fase & Kelas/Tingkat: ${formData.fase} - ${formData.kelas}
        - Jumlah Halaman Siswa: ${numSiswaPages} halaman
        - Jumlah Halaman Guru: ${numGuruPages} halaman (Otomatis ditambahkan di akhir untuk kunci jawaban)
        - Mode Konten: ${formData.drillingMode ? 'DRILLING MODE AKTIF — Hanya soal latihan padat, ZERO materi teori, target kepadatan soal maksimal per halaman. Outline hanya berisi daftar soal/latihan tanpa alokasi halaman materi.' : `Rasio Materi vs Latihan: ${formData.rasio}`}
        - Mode Kesulitan: ${formData.mode}
        - Gaya Visual: ${formData.visual}
        - Tema Karakter (Maskot): ${formData.karakter}
        - Bilingual: ${formData.bilingual ? 'Ya (Instruksi Indonesia, Konten Bahasa Inggris)' : 'Tidak (Bahasa Utama Saja)'}
        - Ukuran Kertas: ${formData.ukuranKertas}
        - Orientasi: ${formData.orientasi}
        - Instruksi Khusus: ${formData.pesanKhusus ? formData.pesanKhusus : 'Tidak ada'}
        ${contextPrev}

        FORMAT OUTPUT YANG DIMINTA (Contoh untuk 2 siswa + 1 guru):
        OUTLINE LKPD: [Mapel] — [Materi] | Kelas [X] | Mode: [Y]
        Hal 1 — Identitas + [Nama Aktivitas]: [deskripsi singkat]
        Hal 2 — [Nama Aktivitas]: [deskripsi singkat]
        ...
        Hal Guru 1 — Kunci Jawaban (Hal 1-2) + Rubrik Penilaian
        Hal Guru 2 (Jika ada) — Kunci Jawaban Lanjutan
        
        Alokasi waktu estimasi total: ±XX menit
      `;
      const result = await callGeminiAPI(userPrompt, SYSTEM_PROMPT, false, userRole, userApiKeys, isAutoinjected);
      if (result) {
        setOutlineText(result.trim());
        goToStep(2);
        
      } else {
        throw new Error("Hasil outline kosong.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal menghasilkan outline.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReviseOutline = async () => {
    if (!revisionInput.trim()) return;
    setIsRevising(true);
    setErrorMsg("");
    try {
      const userPrompt = `
        Ini adalah Outline LKPD saat ini:
        ${outlineText}

        Pengguna meminta REVISI berikut: 
        "${revisionInput}"

        Tolong perbarui outline di atas sesuai dengan permintaan revisi. 
        Pastikan format tetap rapi dan keluarkan HANYA teks outline yang sudah direvisi.
      `;
      const result = await callGeminiAPI(userPrompt, SYSTEM_PROMPT, false, userRole, userApiKeys, isAutoinjected);
      if (result) {
        setOutlineText(result.trim());
        setRevisionInput("");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal merevisi outline.");
      console.error(err);
    } finally {
      setIsRevising(false);
    }
  };

  const handleProceedToJSON = () => {
    goToStep(3);
    setActiveTab("1");
    
  };

  const extractJSON = (text: string) => {
    if (!text) throw new Error("Respons AI kosong.");
    
    // Remove potential hidden characters or BOM
    const cleanText = text.trim().replace(/^[\u200B\u200C\u200D\u200E\u200F\uFEFF]/, "");
    
    try {
      // Try normal parse
      return JSON.parse(cleanText);
    } catch (e) {
      // Try to find JSON block in markdown
      const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/) || cleanText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          console.error("Failed to parse extracted JSON block", e2);
        }
      }
      
      // Last resort: try to find the first '{' and last '}'
      const firstBrace = cleanText.indexOf('{');
      const lastBrace = cleanText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          const possibleJson = cleanText.substring(firstBrace, lastBrace + 1);
          return JSON.parse(possibleJson);
        } catch (e3) {
          console.error("Failed to parse brace-extracted text", e3);
        }
      }
      
      throw new Error("Teks respons tidak mengandung format JSON yang valid.");
    }
  };

  const handleRevisePageJSON = async () => {
    if (!revisionInput.trim() || !pageData[activeTab]?.data) return;
    
    setPageData((prev: any) => ({ 
      ...prev, 
      [activeTab]: { ...prev[activeTab], loading: true } 
    }));
    
    try {
      const currentJSON = JSON.stringify(pageData[activeTab].data, null, 2);
      const userPrompt = `
        Konteks Project:
        - Mapel: ${formData.mapel}
        - Materi: ${formData.materi}
        - Jenjang & Kelas: ${formData.jenjang} - ${formData.kelas} (${formData.fase})
        
        Outline Content:
        ${outlineText}
        
        JSON Layout Saat Ini untuk ${activeTab}:
        ${currentJSON}
        
        INSTRUKSI REVISI DARI USER:
        "${revisionInput}"
        
        TUGAS: Revisi objek JSON di atas berdasarkan instruksi user. 
        - Jaga konsistensi branding (FOOTER_BRANDING).
        - Tetap kembalikan dalam format JSON yang valid dan lengkap.
        - Jangan kurangi kualitas detail visual_prompt-nya.
      `;
      
      const resultText = await callGeminiAPI(userPrompt, SYSTEM_PROMPT, true, userRole, userApiKeys, isAutoinjected);
      const parsedData = resultText ? extractJSON(resultText) : null;
      
      if (parsedData) {
        setPageData((prev: any) => ({ 
          ...prev, 
          [activeTab]: { 
            ...prev[activeTab], 
            data: parsedData,
            loading: false 
          } 
        }));
        setRevisionInput(""); // Clear input on success
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Gagal merevisi JSON.");
      setPageData((prev: any) => ({ ...prev, [activeTab]: { ...prev[activeTab], loading: false } }));
    }
  };

  const handleGenerateSinglePage = async (pageId: string) => {
    setPageData((prev: any) => ({ ...prev, [pageId]: { ...prev[pageId], loading: true } }));
    setErrorMsg("");
    
    try {
      const isGuru = pageId.startsWith('Guru');
      const pageTargetName = isGuru ? `Halaman ${pageId} (Kunci Jawaban)` : `Halaman ${pageId} (Lembar Kerja Siswa)`;
      const drillingInstruction = formData.drillingMode
        ? 'INSTRUKSI KERAS — DRILLING MODE: Halaman ini HANYA berisi soal latihan. DILARANG TOTAL ada blok materi atau teori. Gunakan layout 2-kolom untuk soal PG. Susun soal sepadat mungkin. '
        : '';
      const optionalInstructions = formData.pesanKhusus
        ? `${drillingInstruction}User meminta: "${formData.pesanKhusus}". Wajib integrasikan permintaan ini ke dalam tema konten dan visual_prompt.`
        : (drillingInstruction || 'Tidak ada instruksi khusus tambahan.');
      
      let pageContext = "";
      if (isGuru) {
        pageContext = "SANGAT PENTING: Karena ini adalah HALAMAN GURU, terapkan aturan BAGIAN 1 - HALAMAN TERAKHIR secara ketat. Dilarang menggunakan elemen dekoratif berlebihan, pastikan semua KUNCI JAWABAN dan rubrik evaluasi ditampilkan dengan jelas.";
      } else if (pageId === "1") {
        pageContext = "SANGAT PENTING: Ini adalah HALAMAN 1. Terapkan aturan BAGIAN 1 - HALAMAN 1 secara ketat (Wajib ada HEADER_IDENTITAS_LENGKAP di bagian atas sebelum soal/materi).";
      } else {
        pageContext = "SANGAT PENTING: Karena ini adalah HALAMAN SISWA, DILARANG KERAS mencantumkan jawaban yang benar di dalam JSON (seperti tanda silang, lingkaran, atau teks penanda pada jawaban). Terapkan aturan BAGIAN 1 - HALAMAN 2 DST.";
      }

      const footerTemplate = buildFooterTemplate(
        pageId,
        formData.namaGuru,
        formData.tahunAjaran
      );
      const footerTemplateStr = JSON.stringify(footerTemplate, null, 2);

      const userPrompt = `
        Berdasarkan Outline berikut:
        ${outlineText}
        
        Gaya Visual: ${formData.visual}
        Mode Konten: ${formData.drillingMode ? 'DRILLING_MODE: true — Terapkan BAGIAN 3B secara penuh. ZERO materi teori. Layout 2 kolom. Kepadatan soal maksimal.' : `Rasio Materi:Latihan: ${formData.rasio}`}
        Tema Karakter: ${formData.karakter}
        Mode: ${formData.mode}
        Bilingual: ${formData.bilingual ? 'Ya' : 'Tidak'}
        Ukuran Kertas: ${formData.ukuranKertas}
        Orientasi: ${formData.orientasi}
        
        IDENTITAS BRANDING:
        - Nama Guru: ${formData.namaGuru || '-'}
        - Nama Sekolah: ${formData.namaSekolah || '-'}
        - Tahun Ajaran: ${formData.tahunAjaran || '-'}
        - Teks Footer: ${formData.footerText}

        INSTRUKSI TAMBAHAN (SANGAT PENTING):
        ${optionalInstructions}
        - WAJIB gunakan area "FOOTER_BRANDING" dengan format teks dan visual_prompt yang persis sama di setiap halaman untuk konsistensi branding (lihat aturan BAGIAN 5 di System Prompt).
        - Selalu gunakan area "HEADER_MINIMAL" untuk halaman siswa (Halaman 2 ke atas).

        TUGAS UTAMA: Buatkan JSON Layout KHUSUS untuk ${pageTargetName}.
        - Jangan generate halaman lain.
        - Terapkan aturan Zero-Placeholder (tulis soal utuh).
        - Keluarkan hasilnya HANYA berupa objek JSON murni (jangan array).
        
        INSTRUKSI KRUSIAL PEMISAHAN KONTEN:
        ${pageContext}
        
        Format wajib:
        {
          "meta": { "page_number": "${pageId}", "subject": "${formData.mapel}", "paper_size": "${formData.ukuranKertas}", "orientation": "${formData.orientasi}" },
          "layout_structure": [ ... ]
        }

        FOOTER TEMPLATE — INSTRUKSI KERAS:
        Salin objek JSON berikut PERSIS SAMA ke dalam output JSON 
        kamu sebagai area FOOTER_BRANDING. Dilarang mengubah 
        visual_prompt, nama field, urutan element, atau struktur 
        apapun. Satu-satunya nilai yang boleh berbeda adalah 
        content nomor halaman jika pageId berbeda.

        ${footerTemplateStr}
      `;
      
      const resultText = await callGeminiAPI(userPrompt, SYSTEM_PROMPT, true, userRole, userApiKeys, isAutoinjected);
      const parsedData = resultText ? extractJSON(resultText) : null;
      
      setPageData((prev: any) => ({ 
        ...prev, 
        [pageId]: { loading: false, data: parsedData } 
      }));
      
    } catch (err: any) {
      setErrorMsg(err?.message || "Terjadi kesalahan saat menyusun halaman.");
      setPageData((prev: any) => ({ ...prev, [pageId]: { ...prev[pageId], loading: false } }));
      console.error(err);
    }
  };

  const handleBack = () => {
    setErrorMsg("");
    goToStep(step - 1);
  };
  
  const handleReset = () => {
    goToStep(1);
    setActiveTab("1");
    setOutlineText("");
    setPageData({});
    setErrorMsg("");
  };

  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.opacity = "0";
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const pageTabs = Array.from({ length: numSiswaPages }, (_, i) => (i + 1).toString());
  const guruTabs = Array.from({ length: numGuruPages }, (_, i) => `Guru ${i + 1}`);

  // Mencegah Hydration Error yang mematikan fungsi tombol
  if (!isMounted || userStatus === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
          <p className="text-slate-500 animate-pulse font-medium">Memverifikasi Akun...</p>
        </div>
      </div>
    );
  }

  // Pending Approval View
  if (userStatus === "pending" && userRole !== "admin" && userRole !== "super-admin") {
    return (
      <div className={`${isDarkMode ? 'dark' : ''} antialiased h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl shadow-blue-500/5 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-6 relative">
            <Clock className="w-10 h-10 animate-pulse" />
            <div className="absolute top-0 right-0 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-slate-900">
              <Plus className="w-3 h-3 rotate-45" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Menunggu Persetujuan</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            Akun Anda (<span className="font-bold text-slate-700 dark:text-slate-200">{user?.email}</span>) telah terdaftar, namun perlu diverifikasi oleh Administrator sebelum dapat menggunakan fitur generator.
          </p>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl mb-8">
            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
              Proses verifikasi biasanya memakan waktu kurang dari 24 jam. Silakan hubungi tim IT atau Admin jika ada pertanyaan.
            </p>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Cek Status Sekarang
            </button>
            <button 
              onClick={() => logout()}
              className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Keluar Aplikasi
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rejected View
  if (userStatus === "rejected" && userRole !== "admin" && userRole !== "super-admin") {
    return (
      <div className={`${isDarkMode ? 'dark' : ''} antialiased h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-3xl p-8 shadow-xl shadow-red-500/5 text-center">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <XCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Pendaftaran Ditolak</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            Maaf, permohonan akses Anda ke aplikasi telah ditolak oleh administrator. Silakan hubungi admin untuk info selengkapnya.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Keluar Aplikasi
          </button>
        </div>
      </div>
    );
  }

  // Suspended View
  if (userStatus === "suspended") {
    return (
      <div className={`${isDarkMode ? 'dark' : ''} antialiased h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900 rounded-3xl p-8 shadow-xl shadow-red-500/5 text-center">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Akun Ditangguhkan</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            Akses Anda ke aplikasi telah dinonaktifkan oleh administrator. Silakan hubungi dukungan jika Anda merasa ini adalah kesalahan.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all animate-pulse"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  // Not Invited View (Access Denied for non-whitelist registrations)
  if (userStatus === "not_invited") {
    return (
      <div className={`${isDarkMode ? 'dark' : ''} antialiased h-screen w-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300`}>
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 rounded-3xl p-8 shadow-xl shadow-red-500/5 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-950/40 rounded-3xl flex items-center justify-center text-red-500 mx-auto mb-6">
            <ShieldAlert className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-sans tracking-tight">Akses Ditolak</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
            Email <span className="font-bold text-slate-800 dark:text-slate-200">{user?.email}</span> belum terdaftar di whitelist. Silakan hubungi administrator untuk verifikasi.
          </p>
          <button 
            onClick={() => logout()}
            className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" /> Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'dark' : ''} antialiased font-sans transition-colors duration-300`}>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden transition-colors duration-300">
        
        {/* SIDEBAR */}
        <nav className={`bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm h-screen w-64 flex flex-col fixed left-0 top-0 z-40 transform transition-transform duration-300 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
          <div className="p-6 flex flex-col gap-1 border-b border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center">
              <h1 className="font-bold text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center">
                  <img src="/icon.png" alt="Logo" className="w-full h-full object-contain" onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://aidukasi.net/wp-content/uploads/2023/12/logo-bulat.png';
                  }} />
                </div>
                LKPD Pro
              </h1>
              <button className="md:hidden text-slate-500" onClick={() => setShowMobileMenu(false)}>
                <ArrowLeft className="w-5 h-5"/>
              </button>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">Educator Workspace</p>
          </div>
          
          <div className="px-4 py-6 flex flex-col gap-2">
            <button 
              onClick={handleCreateNew}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm shadow-md shadow-blue-600/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> LKPD Baru
            </button>
            <button 
              onClick={() => setView("dashboard")}
              className={`w-full border rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 ${view === 'dashboard' ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-blue-600' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
            >
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </button>
            {userRole === "super-admin" && (
              <button 
                onClick={() => setView("agency_management" as any)}
                className={`w-full border rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 ${view as string === 'agency_management' ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-blue-600' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
              >
                <ShieldAlert className="w-4 h-4" /> Agency Management
              </button>
            )}
            {userRole === "agency" && (
              <button 
                onClick={() => setView("team_management" as any)}
                className={`w-full border rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 ${view as string === 'team_management' ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-blue-600' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
              >
                 <User className="w-4 h-4" /> My Team
              </button>
            )}
            {userRole !== "super-admin" && userRole !== "admin" && (
              <button 
                onClick={() => setView("api_settings")}
                className={`w-full border rounded-xl py-2.5 px-4 flex items-center justify-center gap-2 font-bold text-sm transition-all active:scale-95 ${view === 'api_settings' ? 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700 text-blue-600' : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'}`}
              >
                <Zap className="w-4 h-4" /> API Settings
              </button>
            )}
          </div>
          
          <ul className="flex flex-col gap-1 px-3 flex-grow overflow-y-auto custom-scrollbar">
            {view === "generator" && (
              <>
                <li>
                  <button 
                    onClick={() => goToStep(1)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${step === 1 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <Settings className={`w-5 h-5 ${step === 1 ? 'text-blue-600 dark:text-blue-400' : ''}`} /> Parameters
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => step >= 2 && goToStep(2)}
                    disabled={step < 2}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${step === 2 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                  >
                    <FileText className={`w-5 h-5 ${step === 2 ? 'text-blue-600 dark:text-blue-400' : ''}`} /> Outline Review
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => step >= 3 && goToStep(3)}
                    disabled={step < 3}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors ${step === 3 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                  >
                    <Code className={`w-5 h-5 ${step === 3 ? 'text-blue-600 dark:text-blue-400' : ''}`} /> Final Output
                  </button>
                </li>
              </>
            )}
            
            {view === "dashboard" && projects.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent Projects</p>
                {projects.slice(0, 5).map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleOpenProject(p)}
                    className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left"
                  >
                    <FolderOpen className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{p.title}</span>
                  </button>
                ))}
              </div>
            )}
            {/* ADMIN SECTION */}
            {userRole === "admin" && (
              <li className="px-3 pt-4 pb-2">
                <p className="px-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Internal</p>
                <Link 
                  href="/admin" 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-100 dark:border-blue-900/30"
                >
                  <ShieldAlert className="w-5 h-5" /> Admin Dashboard
                </Link>
              </li>
            )}
          </ul>

          {/* FOOTER LINKS */}
          <div className="px-6 py-4 flex flex-col gap-2">
            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/30">
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center mb-1">Our Ecosystem</p>
              <div className="flex items-center justify-center gap-3">
                <a 
                  href="https://pakhusnul.id" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] sm:text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  pakhusnul.id
                </a>
                <div className="w-px h-3 bg-slate-200 dark:bg-slate-700"></div>
                <a 
                  href="https://aidukasi.net" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] sm:text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
                >
                  aidukasi.net
                </a>
              </div>
            </div>
          </div>

          {/* USER PROFILE SECTION */}
          <div className="mt-auto p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                {user?.photoURL ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm">
                    <Image 
                      src={user.photoURL} 
                      alt={user.displayName || "User"} 
                      fill 
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate dark:text-white">{user?.displayName || "Guru Hebat"}</p>
                  <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                    {userRole === 'super-admin' ? (
                      <span className="text-purple-600 font-bold">Super Admin</span>
                    ) : (
                      <>
                        <span className="capitalize">{userProfile?.licenseStatus && userProfile.licenseStatus !== 'none' ? userProfile.licenseStatus : 'Standard'}</span>
                        {userProfile?.licenseStatus && userProfile.licenseStatus !== 'none' && userProfile.licenseStatus !== 'unlimited' && userRole !== 'admin' && (
                          <span className="text-blue-600 font-bold">({userProfile?.usageCount || 0}/{userProfile?.userQuota || 10})</span>
                        )}
                        {userProfile?.licenseStatus === 'unlimited' && (
                          <span className="text-purple-600 font-bold">(Unlimited)</span>
                        )}
                        {!userProfile?.licenseStatus || userProfile.licenseStatus === 'none' && (
                          <span className="text-slate-400">({projects.length}/10)</span>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => logout()}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
              >
                <LogOut className="w-3.5 h-3.5" /> Keluar Aplikasi
              </button>
            </div>
          </div>
        </nav>

        {/* MOBILE BACKDROP */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-300"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* MAIN AREA */}
        <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden relative">
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 sticky top-0 z-30 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <button className="md:hidden text-slate-600 dark:text-slate-300 p-1" onClick={() => {
                console.log("Opening mobile menu");
                setShowMobileMenu(true);
              }}>
                <Menu className="w-6 h-6" />
              </button>
              
              <div className="hidden sm:flex items-center gap-2">
                <div className={`flex items-center text-sm font-semibold ${step >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${step >= 1 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>1</span>
                  Setup
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-1" />
                <div className={`flex items-center text-sm font-semibold ${step >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${step >= 2 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>2</span>
                  Outline
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-1" />
                <div className={`flex items-center text-sm font-semibold ${step >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2 ${step >= 3 ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>3</span>
                  Final Output
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {view === "generator" && (
                <>
                  {/* Health/Memory Indicator Bar */}
                  <div className="hidden sm:flex flex-col items-end gap-1 mr-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        projectUsage.isCritical ? 'text-red-500 animate-pulse' : 
                        projectUsage.isWarning ? 'text-amber-500' : 'text-slate-400'
                      }`}>
                        {projectUsage.isCritical ? 'Kapasitas Kritis' : projectUsage.isWarning ? 'Kapasitas Terisi' : 'Kapasitas Proyek'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{projectUsage.kb} KB / 1MB</span>
                    </div>
                    <div className="w-32 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/50 dark:border-slate-700/50">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          projectUsage.isCritical ? 'bg-red-500' : 
                          projectUsage.isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${projectUsage.percentage}%` }}
                      />
                    </div>
                    {projectUsage.isCritical && (
                      <span className="text-[9px] text-red-500 font-medium absolute -bottom-4 right-0 whitespace-nowrap">
                        Peringatan: Proyek hampir penuh!
                      </span>
                    )}
                  </div>
  
                  <button 
                    onClick={handleSaveProject}
                    disabled={isSaving}
                    className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-70 ${
                      saveSuccess 
                        ? 'bg-blue-600 shadow-blue-600/20' 
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    }`}
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : saveSuccess ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saveSuccess ? 'Berhasil' : (projectId ? 'Update' : 'Simpan')}
                  </button>
                </>
              )}
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full transition-colors"
                aria-label="Toggle Dark Mode"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {view === "api_settings" ? (
              <div className="max-w-3xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8">
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">API Settings</h1>
                  <p className="text-slate-500">Gunakan API Key Anda sendiri untuk proses generate. Sistem mendukung failover otomatis jika salah satu key mencapai batas kuota.</p>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-4 mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                      <HelpCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-blue-800 dark:text-blue-300">Cara Mendapatkan API Key?</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Dapatkan key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-blue-700">Google AI Studio</a>. Anda bisa memasukkan hingga 3 key berbeda.</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {[0, 1, 2].map((idx) => (
                      <div key={idx} className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                          <Zap className={`w-4 h-4 ${userApiKeys[idx] ? 'text-amber-500' : 'text-slate-300'}`} />
                          Gemini API Key {idx + 1} {idx === 0 && <span className="text-[10px] text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded ml-2">PRIMARY</span>}
                        </label>
                        <div className="relative">
                          <input 
                            type="password"
                            value={userApiKeys[idx]}
                            onChange={(e) => handleKeyChange(idx, e.target.value)}
                            placeholder="AIzaSy..."
                            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          />
                          {userApiKeys[idx] && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => setView("generator")}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-4 font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                    >
                      Simpan & Mulai Generate
                    </button>
                  </div>
                </div>
              </div>
            ) : view === "dashboard" ? (
              <div className="max-w-7xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Project Dashboard</h1>
                    <p className="text-slate-500">Kelola dan akses kembali desain LKPD yang telah Anda buat.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Cari project..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full md:w-64 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                  </div>
                </div>

                {isLoadingProjects ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                    <p className="text-slate-400 font-medium">Memuat daftar project...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
                    <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-300 dark:text-blue-500 mx-auto mb-6">
                      <FolderOpen className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Belum ada project</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm mx-auto">Mulai buat LKPD pertama Anda dengan menekan tombol di bawah ini.</p>
                    <button 
                      onClick={handleCreateNew}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 inline-flex items-center gap-2"
                    >
                      <PlusCircle className="w-5 h-5" /> Buat LKPD Baru
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {projects
                      .filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map((p) => (
                      <div 
                        key={p.id} 
                        onClick={() => handleOpenProject(p)}
                        className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full"
                      >
                        <div className="p-5 flex-1">
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
                              <FileText className="w-6 h-6" />
                            </div>
                            <button 
                              onClick={(e) => handleDeleteProject(p.id, e)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <h3 className="font-bold text-slate-800 dark:text-white mb-2 line-clamp-2 leading-snug">{p.title}</h3>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md">
                              Halaman: {p.formData?.halaman || 1}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md">
                              {p.formData?.jenjang || 'General'}
                            </span>
                          </div>
                          
                          {/* Card Memory Indicator */}
                          <div className="flex flex-col gap-1 mb-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Penyimpanan</span>
                              <span className="text-[9px] font-mono text-slate-400">
                                {(((JSON.stringify(p).length) / 1024)).toFixed(1)} KB
                              </span>
                            </div>
                            <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-500 ${
                                  (JSON.stringify(p).length / 1000000) > 0.85 ? 'bg-red-500' : 
                                  (JSON.stringify(p).length / 1000000) > 0.6 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min((JSON.stringify(p).length / 1000000) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium">
                              {p.updatedAt?.toDate ? p.updatedAt.toDate().toLocaleDateString('id-ID') : 'Baru saja'}
                            </span>
                          </div>
                          <div className="w-6 h-6 bg-white dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:scale-110 transition-all border border-slate-200 dark:border-slate-600">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (view as string) === "agency_management" ? (
              <AgencyManager isDarkMode={isDarkMode} />
            ) : (view as string) === "team_management" ? (
              <TeamManager userProfile={userProfile} />
            ) : (
              <div className={`mx-auto p-4 md:p-8 transition-all duration-500 ${step === 3 ? 'max-w-full' : 'max-w-6xl'}`}>
                {/* EXISTING GENERATOR UI */}
              
              {errorMsg && (
                <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-medium">{errorMsg}</p>
                </div>
              )}

              <Swiper
                onSwiper={(swiper) => {
                  console.log("Swiper initialized");
                  swiperRef.current = swiper;
                }}
                onSlideChange={(swiper) => {
                  console.log("Slide changed to:", swiper.activeIndex + 1);
                  setStep(swiper.activeIndex + 1);
                }}
                allowTouchMove={false}
                autoHeight={true}
                className="w-full"
              >
                <SwiperSlide key="setup">
                              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">Parameter Setup</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base">Tentukan ruang lingkup materi dan preferensi visual untuk worksheet Anda.</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 flex flex-col gap-6">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Kebutuhan Akademik</h2>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 mb-4">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <FileSymlink className="w-4 h-4 text-emerald-500" />
                            Kontinuitas Proyek (Opsional)
                          </label>
                          <select 
                            name="referensiProyek" value={formData.referensiProyek} onChange={handleChange}
                            className="w-full bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 outline-none text-sm"
                          >
                            <option value="">-- Buat Proyek Mandiri (Tanpa Referensi) --</option>
                            {projects.filter(p => p.id !== projectId).map(p => (
                              <option key={p.id} value={p.id}>Lanjutkan dari: {p.title || 'Untitled'}</option>
                            ))}
                          </select>
                          <p className="text-[10px] text-slate-500 px-1 italic">
                            *Pilih proyek lama jika ingin materi proyek baru ini saling berkesinambungan.
                          </p>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 mb-4">
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Mata Pelajaran</label>
                          <input 
                            type="text" name="mapel" value={formData.mapel} onChange={handleChange} 
                            placeholder="Contoh: Matematika, Bahasa Inggris, Biologi..."
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" 
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Jenjang</label>
                            <select 
                              name="jenjang" value={formData.jenjang} onChange={handleJenjangChange} 
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            >
                              {Object.keys(JENJANG_MAP).map(j => <option key={j}>{j}</option>)}
                            </select>
                          </div>
                          
                          {JENJANG_MAP[formData.jenjang]?.fases && (
                            <div className="flex flex-col gap-1.5">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Fase</label>
                              <select 
                                name="fase" value={formData.fase} onChange={handleFaseChange} 
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                              >
                                {Object.keys(JENJANG_MAP[formData.jenjang]?.fases || {}).map(f => <option key={f}>{f}</option>)}
                              </select>
                            </div>
                          )}

                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {JENJANG_MAP[formData.jenjang]?.fases ? "Kelas" : "Kategori/Level"}
                            </label>
                            <select 
                              name="kelas" value={formData.kelas} onChange={handleChange} 
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            >
                              {JENJANG_MAP[formData.jenjang]?.fases 
                                ? (JENJANG_MAP[formData.jenjang]?.fases?.[formData.fase] || []).map((k: string) => <option key={k}>{k}</option>)
                                : (JENJANG_MAP[formData.jenjang]?.types || []).map((t: string) => <option key={t}>{t}</option>)
                              }
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 mb-4">
                          <div className="flex justify-between items-center">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Topik Spesifik</label>
                            <button 
                              onClick={handleSuggestMateri} disabled={isSuggestingMateri}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold flex items-center gap-1 transition-colors bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md"
                            >
                              {isSuggestingMateri ? <Loader2 className="w-3 h-3 animate-spin"/> : <Lightbulb className="w-3 h-3"/>} Ide Topik
                            </button>
                          </div>
                          <input 
                            type="text" name="materi" value={formData.materi} onChange={handleChange} 
                            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none" 
                          />
                        </div>

                        <div className="grid grid-cols-12 gap-4">
                          <div className="flex flex-col gap-1.5 col-span-4">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              Jml Hal. <div title="Lembar siswa murni."><BadgeInfo className="w-3.5 h-3.5 text-slate-400" /></div>
                            </label>
                            <input 
                              type="number" name="halaman" value={formData.halaman} onChange={handleChange} min="1" max="20" 
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none text-center" 
                            />
                          </div>
                          {!formData.drillingMode && (
                            <div className="flex flex-col gap-1.5 col-span-8">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Rasio Materi : Latihan</label>
                              <input 
                                list="rasio-options"
                                autoComplete="off"
                                name="rasio" 
                                value={formData.rasio} 
                                onChange={handleChange} 
                                placeholder="Ketik manual atau pilih"
                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                              />
                              <datalist id="rasio-options">
                                <option value="30:70 (Banyak Latihan)"></option>
                                <option value="50:50 (Seimbang)"></option>
                                <option value="20:80 (Fokus Latihan)"></option>
                              </datalist>
                            </div>
                          )}
                        </div>

                        <div className="col-span-12 mt-1">
                          <label className={`flex items-center gap-3 p-3.5 border-2 rounded-xl cursor-pointer transition-all ${formData.drillingMode ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                            <input
                              type="checkbox"
                              name="drillingMode"
                              checked={formData.drillingMode}
                              onChange={handleChange}
                              className="w-5 h-5 accent-orange-500 rounded"
                            />
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold ${formData.drillingMode ? 'text-orange-700 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                ⚡ Mode Drilling (Full Soal)
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                Halaman diisi penuh soal latihan, tanpa blok materi teori.
                              </span>
                            </div>
                            {formData.drillingMode && (
                              <span className="ml-auto text-[10px] font-bold px-2 py-1 bg-orange-500 text-white rounded-full flex-shrink-0">AKTIF</span>
                            )}
                          </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Ukuran Kertas</label>
                            <select 
                              name="ukuranKertas" value={formData.ukuranKertas} onChange={handleChange} 
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            >
                              <option value="A4">A4 (210 x 297 mm)</option>
                              <option value="F4">F4 / Folio (215 x 330 mm)</option>
                              <option value="A5">A5 (148 x 210 mm)</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Orientasi Layout</label>
                            <select 
                              name="orientasi" value={formData.orientasi} onChange={handleChange} 
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                            >
                              <option value="Portrait">Portrait</option>
                              <option value="Landscape">Landscape</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Branding Sekolah</h2>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Guru</label>
                            <input type="text" name="namaGuru" value={formData.namaGuru} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none" />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tahun Ajaran</label>
                            <input type="text" name="tahunAjaran" value={formData.tahunAjaran} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 outline-none" />
                          </div>
                          <div className="flex flex-col gap-1.5 md:col-span-2 mt-2">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Teks Custom Footer</label>
                              <button onClick={handleSuggestFooter} disabled={isSuggestingFooter} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold flex items-center gap-1">
                                {isSuggestingFooter ? <Loader2 className="w-3 h-3 animate-spin"/> : '✨'} Slogan AI
                              </button>
                            </div>
                            <input type="text" name="footerText" value={formData.footerText} onChange={handleChange} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500" placeholder="Belajar itu menyenangkan!" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-5 flex flex-col gap-6">
                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tingkat Kesulitan</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                          {[
                            { id: 'REMEDIAL', title: 'Guided (Remedial)', desc: 'Lebih banyak petunjuk visual.', icon: Smile },
                            { id: 'STANDAR', title: 'Standard (Medium)', desc: 'Kombinasi latihan mandiri.', icon: Brain },
                            { id: 'HOTS', title: 'Challenge (HOTS)', desc: 'Fokus pada penalaran kompleks.', icon: Zap }
                          ].map(mode => (
                            <label key={mode.id} className="cursor-pointer relative">
                              <input type="radio" name="difficulty" checked={formData.mode === mode.id} onChange={() => setFormData({...formData, mode: mode.id})} className="peer sr-only" />
                              <div className={`w-full p-4 rounded-xl border-2 transition-all flex items-start gap-3 ${formData.mode === mode.id ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                <mode.icon className={`mt-0.5 w-5 h-5 ${formData.mode === mode.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                                <div>
                                  <h3 className={`font-bold text-sm ${formData.mode === mode.id ? 'text-blue-800 dark:text-blue-300' : 'text-slate-800 dark:text-slate-200'}`}>{mode.title}</h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{mode.desc}</p>
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 md:p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                          <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Tema Visual</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {[
                            { id: 'PLAYFUL_COLOR', name: 'Playful', icon: ToyBrick, colorClass: 'from-pink-100 to-orange-100 text-pink-500' },
                            { id: 'CLEAN_MONO', name: 'Clean', icon: LayoutDashboard, colorClass: 'bg-white text-slate-600' },
                            { id: 'NATURE_GREEN', name: 'Nature', icon: TreePine, colorClass: 'from-green-100 to-emerald-100 text-green-600' },
                            { id: 'OCEAN_BLUE', name: 'Ocean', icon: Waves, colorClass: 'from-cyan-100 to-blue-100 text-blue-500' }
                          ].map(theme => (
                            <label key={theme.id} className="cursor-pointer">
                              <input type="radio" name="theme" checked={formData.visual === theme.id} onChange={() => setFormData({...formData, visual: theme.id})} className="peer sr-only" />
                              <div className={`border-2 rounded-xl p-3 text-center transition-all ${formData.visual === theme.id ? 'border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
                                <div className={`w-full h-12 rounded-lg mb-2 flex items-center justify-center border ${theme.id==='CLEAN_MONO' ? theme.colorClass : `bg-gradient-to-br ${theme.colorClass} border-transparent`}`}>
                                  <theme.icon className="w-6 h-6" />
                                </div>
                                <span className={`text-xs font-bold ${formData.visual === theme.id ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>{theme.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="flex flex-col gap-1.5 mb-2 group">
                          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">Atau Tema Kustom</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              name="visualCustom" 
                              value={['PLAYFUL_COLOR', 'CLEAN_MONO', 'NATURE_GREEN', 'OCEAN_BLUE'].includes(formData.visual) ? '' : formData.visual} 
                              onChange={(e) => setFormData({...formData, visual: e.target.value})}
                              placeholder="Misal: Vintage, Cyberpunk, Watercolor..."
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all text-sm"
                            />
                            {formData.visual && !['PLAYFUL_COLOR', 'CLEAN_MONO', 'NATURE_GREEN', 'OCEAN_BLUE'].includes(formData.visual) && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Custom Mascot (Opsional)</label>
                            <input 
                              type="text" list="karakter-options" name="karakter" value={formData.karakter} onChange={handleChange} 
                              placeholder="Misal: Superhero, Lebah, dll"
                              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-blue-500"
                            />
                            <datalist id="karakter-options">
                              <option value="Hewan Hutan (Animal)" />
                              <option value="Anak Sekolah Lokal" />
                              <option value="Robot Masa Depan" />
                              <option value="Tanpa Karakter (Formal)" />
                            </datalist>
                          </div>
                          
                          <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <input type="checkbox" name="bilingual" checked={formData.bilingual} onChange={handleChange} className="w-5 h-5 accent-blue-600 rounded" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Mode Bilingual (ID-EN)</span>
                          </label>

                          <div className="flex flex-col gap-1.5 mt-2 group relative">
                            <div className="flex justify-between items-center">
                              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Pesan Khusus AI</label>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setIsExpandedMagicPrompt(!isExpandedMagicPrompt)}
                                  className="p-1 px-1.5 bg-slate-100 dark:bg-slate-800 rounded-md text-slate-400 hover:text-blue-500 transition-colors border border-slate-200 dark:border-slate-700"
                                >
                                  {isExpandedMagicPrompt ? <RefreshCw className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                </button>
                                <button onClick={handleSuggestVisual} disabled={isSuggestingVisual} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 font-bold flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                                  {isSuggestingVisual ? <Loader2 className="w-3 h-3 animate-spin"/> : '✨'} Magic Prompt
                                </button>
                              </div>
                            </div>
                            <textarea 
                              name="pesanKhusus" value={formData.pesanKhusus} onChange={handleChange} 
                              placeholder="Misal: Gunakan scene pantai di Indonesia pada seluruh halamannya..."
                              className={`w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all ${isExpandedMagicPrompt ? 'min-h-[250px]' : 'min-h-[100px]'} resize-y`}
                            />
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col items-end pb-8">
                    <button 
                      onClick={handleGenerateOutline} 
                      disabled={isGenerating || !isUserKeyReady}
                      className="px-8 py-4 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-3 disabled:opacity-50 active:scale-95 group"
                    >
                      {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : <Zap className="w-5 h-5 group-hover:animate-pulse" />}
                      <span>Generate Outline</span>
                      {!isGenerating && <ChevronRight className="w-6 h-6" />}
                    </button>
                    {!isUserKeyReady && !isAutoinjected && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 max-w-md animate-in slide-in-from-right-4">
                        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                          <b>API Key Diperlukan:</b> Harap hubungkan API Key di menu 
                          <button onClick={() => setView('api_settings')} className="mx-1 font-bold underline">API Settings</button> 
                          karena sistem saat ini menggunakan mode BYOK.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                          </SwiperSlide>

              <SwiperSlide key="outline">
                              <div className="flex flex-col gap-6 animate-in fade-in">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Outline Review</h1>
                    </div>
                    <button onClick={handleBack} className="text-sm font-semibold flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2">
                      <ArrowLeft className="w-4 h-4" /> Kembali
                    </button>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-sm border-slate-200 dark:border-slate-800">
                    <textarea 
                      value={outlineText}
                      onChange={(e) => setOutlineText(e.target.value)}
                      className="w-full h-[300px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-xl font-mono text-sm leading-relaxed text-slate-800 dark:text-slate-300 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className={`flex gap-2 mt-4 items-start bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 relative group transition-all ${isExpandedRevisionOutline ? 'min-h-[150px]' : ''}`}>
                      <textarea 
                        value={revisionInput} onChange={(e) => setRevisionInput(e.target.value)}
                        placeholder="Revisi outline di sini... (tekan Revisi untuk memproses)" 
                        className={`flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 outline-none w-full bg-slate-50 dark:bg-slate-950 dark:text-white transition-all ${isExpandedRevisionOutline ? 'min-h-[120px]' : 'min-h-[50px] max-h-[200px]'}`}
                        rows={isExpandedRevisionOutline ? 4 : 1}
                        onInput={(e) => {
                          if (!isExpandedRevisionOutline) {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = 'auto';
                            target.style.height = target.scrollHeight + 'px';
                          }
                        }}
                      />
                      <div className="flex flex-col gap-2 self-end">
                        <button 
                          onClick={() => setIsExpandedRevisionOutline(!isExpandedRevisionOutline)}
                          className="p-2 bg-white/80 dark:bg-slate-800/80 rounded-lg border border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {isExpandedRevisionOutline ? <RefreshCw className="w-3.5 h-3.5 rotate-180" /> : <Plus className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={handleReviseOutline} disabled={isRevising || !revisionInput.trim()}
                          className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-all active:scale-95"
                        >
                          {isRevising ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} 
                          <span className="hidden sm:inline">Revisi</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pb-8">
                    <button 
                      onClick={handleProceedToJSON}
                      className="px-6 py-3 font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg"
                    >
                      Setujui & Lanjut <ChevronRight className="w-5 inline" />
                    </button>
                  </div>
                </div>
                          </SwiperSlide>

              <SwiperSlide key="output">
                <div className="flex flex-col min-h-full lg:h-[calc(100vh-160px)] animate-in fade-in pb-10 lg:pb-0">
                  <div className="mb-4">
                    <h1 className="text-2xl font-bold">Final Output Layout</h1>
                    <p className="text-slate-500 text-sm">Pilih halaman di bawah (mobile) atau di kiri (desktop) untuk melihat prompt JSON.</p>
                  </div>
                  <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                    <aside className="w-full lg:w-72 flex flex-shrink-0 flex-col gap-4 lg:min-h-0">
                      <div className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl border flex flex-col h-fit lg:h-full overflow-hidden shadow-sm">
                        <div className="p-4 overflow-x-auto lg:overflow-y-auto custom-scrollbar flex-1">
                          <div className="flex lg:flex-col gap-4 lg:gap-0">
                            <div className="flex flex-shrink-0 flex-col gap-1 pr-4 lg:pr-0 border-r lg:border-r-0 lg:border-b lg:pb-4 border-slate-100 dark:border-slate-800/50">
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Siswa</div>
                              <ul className="flex lg:flex-col gap-2 lg:gap-1">
                                {pageTabs.map((tab) => (
                                  <li key={tab} className="flex-shrink-0">
                                    <button 
                                      onClick={() => setActiveTab(tab)} 
                                      className={`min-w-[100px] lg:w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs lg:text-sm font-medium transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                    >
                                      <span className="truncate">Hal {tab}</span>
                                      {pageData[tab]?.data ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="flex flex-shrink-0 flex-col gap-1 pl-4 lg:pl-0 lg:pt-4">
                              <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Guru</div>
                              <ul className="flex lg:flex-col gap-2 lg:gap-1">
                                {guruTabs.map((tab) => (
                                  <li key={tab} className="flex-shrink-0">
                                    <button 
                                      onClick={() => setActiveTab(tab)} 
                                      className={`min-w-[100px] lg:w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-xs lg:text-sm font-medium transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-[1.02]' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                    >
                                      <span className="truncate">{tab}</span>
                                      {pageData[tab]?.data ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </div>
                    </aside>
                    <section className="flex-1 flex flex-col gap-4 min-h-[400px] lg:min-h-0 pb-10 lg:pb-0">
                      <div className="flex justify-between items-center border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-sm">
                        <h3 className="font-bold flex items-center gap-2 px-3">
                          <Code className="w-5 h-5 text-blue-500" />
                          <span className="text-slate-800 dark:text-slate-200">
                            {activeTab.startsWith('Guru') ? `${activeTab}_Kunci.json` : `Halaman_${activeTab}_Siswa.json`}
                          </span>
                        </h3>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleGenerateSinglePage(activeTab)}
                            disabled={pageData[activeTab]?.loading}
                            className="p-2.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                            title="Regenerate Halaman Ini"
                          >
                            <RefreshCw className={`w-4 h-4 ${pageData[activeTab]?.loading ? 'animate-spin' : ''}`} />
                          </button>
                          <button 
                            onClick={() => pageData[activeTab]?.data && copyToClipboard(JSON.stringify(pageData[activeTab].data, null, 2))}
                            className={`flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 border rounded-xl transition-all font-bold text-xs sm:text-sm ${
                              copied 
                                ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg' 
                                : 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95'
                            }`}
                            title="Salin JSON"
                          >
                          {copied ? (
                            <>
                              <CheckCircle className="w-5 h-5 sm:w-4 sm:h-4" /> 
                              <span className="hidden sm:inline">Berhasil Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-5 h-5 sm:w-4 sm:h-4 text-white" /> 
                              <span className="hidden sm:inline">Salin JSON</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 bg-white dark:bg-[#0D1117] border border-slate-200 dark:border-slate-800 rounded-2xl relative overflow-hidden flex flex-col shadow-inner">
                        {!pageData[activeTab]?.data && !pageData[activeTab]?.loading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white dark:bg-slate-900 z-10 transition-all">
                            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-blue-300 dark:text-blue-500 group">
                              <FileSymlink className="w-10 h-10 transition-transform group-hover:scale-110" />
                            </div>
                            <div className="text-center max-w-xs px-6">
                              <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 underline decoration-blue-500/30 underline-offset-4">Belum ada data layout</h4>
                              <p className="text-xs text-slate-500 mb-6 leading-relaxed">Silakan klik tombol di bawah untuk menghasilkan prompt JSON untuk halaman ini menggunakan AI.</p>
                              <button 
                                onClick={() => handleGenerateSinglePage(activeTab)}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2 mx-auto"
                              >
                                🚀 Hasilkan JSON {activeTab}
                              </button>
                            </div>
                          </div>
                        )}
                        {pageData[activeTab]?.loading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 z-20 gap-4">
                            <div className="relative">
                              <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                              <div className="absolute inset-0 blur-lg bg-blue-400/20 animate-pulse rounded-full"></div>
                            </div>
                            <div className="text-center flex flex-col items-center gap-4">
                              <div>
                                <span className="text-sm font-bold text-blue-600 block mb-1">Menganalisis Kurikulum...</span>
                                <span className="text-xs text-slate-400">Sedang menyusun layout {activeTab}</span>
                              </div>
                              
                              <button 
                                onClick={() => handleGenerateSinglePage(activeTab)}
                                className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                              >
                                <RefreshCw className="w-3 h-3" /> Hubungkan Ulang (Regenerate)
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="absolute inset-0 overflow-auto custom-scrollbar p-6 pb-24">
                          <pre className="text-sm font-mono leading-relaxed text-slate-800 dark:text-slate-300 whitespace-pre">
                            {pageData[activeTab]?.data ? JSON.stringify(pageData[activeTab].data, null, 2) : ''}
                          </pre>
                        </div>

                        {/* REVISION CHAT BAR */}
                        {pageData[activeTab]?.data && (
                          <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95 z-30 transition-all ${isExpandedRevisionPage ? 'h-1/2' : 'h-auto'}`}>
                            <div className={`max-w-3xl mx-auto flex items-end gap-3 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl shadow-blue-500/10 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all relative group ${isExpandedRevisionPage ? 'h-full flex-col p-4' : ''}`}>
                              <div className={`flex-1 flex items-start px-2 py-1 overflow-y-auto ${isExpandedRevisionPage ? 'w-full' : ''}`}>
                                <Sparkles className="w-4 h-4 text-blue-500 mt-1 mr-2 flex-shrink-0" />
                                <textarea 
                                  value={revisionInput}
                                  onChange={(e) => setRevisionInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleRevisePageJSON();
                                    }
                                  }}
                                  onInput={(e) => {
                                    if (!isExpandedRevisionPage) {
                                      const target = e.target as HTMLTextAreaElement;
                                      target.style.height = 'auto';
                                      target.style.height = Math.min(target.scrollHeight, 150) + 'px';
                                    }
                                  }}
                                  placeholder="Minta revisi... (Shift+Enter untuk baris baru)"
                                  className={`w-full bg-transparent border-none outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 resize-none py-0.5 ${isExpandedRevisionPage ? 'h-full' : 'max-h-[150px]'}`}
                                  rows={1}
                                />
                              </div>
                              <div className={`flex gap-3 items-center ${isExpandedRevisionPage ? 'w-full justify-between pt-2 border-t border-slate-100 dark:border-slate-700' : ''}`}>
                                <button 
                                  onClick={() => setIsExpandedRevisionPage(!isExpandedRevisionPage)}
                                  className="p-2 text-slate-400 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                                  title={isExpandedRevisionPage ? "Kecilkan" : "Perbesar"}
                                >
                                  {isExpandedRevisionPage ? <RefreshCw className="w-4 h-4 rotate-180" /> : <Plus className="w-4 h-4" />}
                                </button>
                                <button 
                                  onClick={handleRevisePageJSON}
                                  disabled={!revisionInput.trim() || pageData[activeTab]?.loading}
                                  className={`bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white rounded-xl transition-all active:scale-90 flex-shrink-0 flex items-center justify-center gap-2 ${isExpandedRevisionPage ? 'px-6 py-2.5 font-bold' : 'p-2.5'}`}
                                >
                                  {pageData[activeTab]?.loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  ) : (
                                    <>
                                      <Send className="w-5 h-5" />
                                      {isExpandedRevisionPage && <span>Kirim Revisi</span>}
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </SwiperSlide>
              </Swiper>

              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
