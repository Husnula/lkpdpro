"use client";

// LKPD Generator Pro - Main Page
import React, { useState, useEffect, useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import { 
  BookOpen, Settings, FileText, CheckCircle, 
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
  doc, getDoc, collection, query, where, getDocs, 
  addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy 
} from 'firebase/firestore';


import { GoogleGenAI } from "@google/genai";

  const SYSTEM_PROMPT = `
Kamu adalah LKPD Generator Pro, spesialis perancang Lembar Kerja Peserta Didik (LKPD) visual untuk Kurikulum Merdeka. Tugasmu adalah merancang layout halaman yang padat, visual, edukatif, dan konsisten secara desain, lalu menerjemahkannya menjadi Prompt JSON Layout per halaman sesuai ukuran dan orientasi kertas yang diminta pengguna.

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

// Helper: Call Gemini API with Hybrid BYOK & Failover
const executeGeminiRequest = async (apiKey: string, userPrompt: string, systemInstruction: string, isJson: boolean) => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    // Note: Using gemini-3-flash-preview as recommended by the gemini-api skill rules
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: isJson ? "application/json" : "text/plain",
      },
    });
    
    return response.text;
  } catch (error: any) {
    console.error("Internal Gemini Request Error:", error);
    throw error;
  }
};

const callGeminiAPI = async (
  userPrompt: string, 
  systemInstruction: string, 
  isJson = false,
  role: string = "user",
  userKeys: string[] = []
) => {
  // 1. Admin Rule: Use environment variable
  if (role === "admin") {
    const adminKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!adminKey) throw new Error("Admin API Key (NEXT_PUBLIC_GEMINI_API_KEY) tidak ditemukan di environment.");
    return executeGeminiRequest(adminKey, userPrompt, systemInstruction, isJson);
  }

  // 2. User Rule: Tiered Failover (BYOK)
  const validUserKeys = userKeys.filter(k => k && k.trim() !== "");
  if (validUserKeys.length === 0) {
    throw new Error("API Key tidak ditemukan. Silakan masukkan API Key di menu 'API Settings'.");
  }

  let lastError = null;
  for (let i = 0; i < validUserKeys.length; i++) {
    try {
      return await executeGeminiRequest(validUserKeys[i], userPrompt, systemInstruction, isJson);
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message?.toLowerCase() || "";
      const isRateLimited = errorMsg.includes("429") || errorMsg.includes("quota exceeded");
      const isOverloaded = errorMsg.includes("503") || errorMsg.includes("500") || errorMsg.includes("overloaded");
      
      if ((isRateLimited || isOverloaded) && i < validUserKeys.length - 1) {
        console.warn(`API Key ${i + 1} mengalami limit. Mencoba Key ${i + 2}...`);
        continue; 
      }
      throw error; 
    }
  }
  throw lastError;
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
    orientasi: 'Portrait'
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [isMounted, setIsMounted] = useState(false);
  const [userRole, setUserRole] = useState<string>("user");
  const [userStatus, setUserStatus] = useState<string>("loading");

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
        orderBy("updatedAt", "desc")
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
    try {
      const projectData = {
        userId: user.uid,
        title: `${formData.mapel} - ${formData.materi}`,
        step: step,
        formData: formData,
        outline: outlineText,
        pageData: pageData,
        updatedAt: serverTimestamp()
      };

      if (projectId) {
        await updateDoc(doc(db, "lkpds", projectId), projectData);
      } else {
        const newProject = {
          ...projectData,
          createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, "lkpds"), newProject);
        setProjectId(docRef.id);
      }
      fetchProjects();
    } catch (e) {
      handleFirestoreError(e, projectId ? OperationType.UPDATE : OperationType.CREATE, `lkpds/${projectId || 'new'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenProject = (project: any) => {
    setProjectId(project.id);
    setFormData({ ...defaultFormData, ...(project.formData || {}) });
    setOutlineText(project.outline || "");
    setPageData(project.pageData || {});
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
          const userSnap = await getDoc(doc(db, "users", user.uid));
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserRole(data.role || "user");
            setUserStatus(data.status || "pending");
          } else {
            // Handle initial login case for primary admin
            if (user.email === "jagofeed@gmail.com") {
              setUserRole("admin");
              setUserStatus("active");
            } else {
              setUserRole("user");
              setUserStatus("pending");
            }
          }
        } catch (e) {
          handleFirestoreError(e, OperationType.GET, `users/${user.uid}`);
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

  const isUserKeyReady = userRole === "admin" || userApiKeys.some(k => k.trim().length > 10);

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
      const result = await callGeminiAPI(prompt, "Kamu adalah asisten guru yang jenius.", false, userRole, userApiKeys);
      if (result) {
        setFormData((prev: any) => ({ ...prev, materi: result?.replace(/["*]/g, '').trim() }));
      }
    } catch (err) {
      console.error("Gagal mendapat saran materi", err);
      setErrorMsg(err instanceof Error ? err.message : "Gagal mendapat saran materi");
    } finally {
      setIsSuggestingMateri(false);
    }
  };

  const handleSuggestVisual = async () => {
    setIsSuggestingVisual(true);
    try {
      const prompt = `Buatkan 1 instruksi kalimat visual yang kreatif, menarik, dan spesifik untuk generator gambar berdasarkan gaya "${formData.visual}" dan karakter "${formData.karakter}". Materinya adalah "${formData.mapel} - ${formData.materi}".`;
      const result = await callGeminiAPI(prompt, "Kamu adalah art director kreatif.", false, userRole, userApiKeys);
      if (result) {
        setFormData((prev: any) => ({ ...prev, pesanKhusus: result?.replace(/["*]/g, '').trim() }));
      }
    } catch (err) {
      console.error("Gagal mendapat saran visual", err);
      setErrorMsg(err instanceof Error ? err.message : "Gagal mendapat saran visual");
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
      const result = await callGeminiAPI(prompt, "Kamu adalah pemberi motivasi anak.", false, userRole, userApiKeys);
      if (result) {
        setFormData((prev: any) => ({ ...prev, footerText: result?.replace(/["*]/g, '').trim() }));
      }
    } catch (err) {
      console.error("Gagal mendapat saran footer", err);
      setErrorMsg(err instanceof Error ? err.message : "Gagal mendapat saran footer");
    } finally {
      setIsSuggestingFooter(false);
    }
  };

  const handleGenerateOutline = async () => {
    console.log("Generating Outline...");
    setIsGenerating(true);
    setErrorMsg("");
    try {
      const userPrompt = `
        Berdasarkan parameter berikut, buatkan Rencana Konten (Outline) untuk LKPD.
        PARAMETER:
        - Mata Pelajaran: ${formData.mapel}
        - Materi Spesifik: ${formData.materi}
        - Jenjang: ${formData.jenjang}
        - Fase & Kelas/Tingkat: ${formData.fase} - ${formData.kelas}
        - Jumlah Halaman Siswa: ${numSiswaPages} halaman
        - Jumlah Halaman Guru: ${numGuruPages} halaman (Otomatis ditambahkan di akhir untuk kunci jawaban)
        - Rasio Materi vs Latihan: ${formData.rasio}
        - Mode Kesulitan: ${formData.mode}
        - Gaya Visual: ${formData.visual}
        - Tema Karakter (Maskot): ${formData.karakter}
        - Bilingual: ${formData.bilingual ? 'Ya (Instruksi Indonesia, Konten Bahasa Inggris)' : 'Tidak (Bahasa Utama Saja)'}
        - Ukuran Kertas: ${formData.ukuranKertas}
        - Orientasi: ${formData.orientasi}
        - Instruksi Khusus: ${formData.pesanKhusus ? formData.pesanKhusus : 'Tidak ada'}

        FORMAT OUTPUT YANG DIMINTA (Contoh untuk 2 siswa + 1 guru):
        OUTLINE LKPD: [Mapel] — [Materi] | Kelas [X] | Mode: [Y]
        Hal 1 — Identitas + [Nama Aktivitas]: [deskripsi singkat]
        Hal 2 — [Nama Aktivitas]: [deskripsi singkat]
        ...
        Hal Guru 1 — Kunci Jawaban (Hal 1-2) + Rubrik Penilaian
        Hal Guru 2 (Jika ada) — Kunci Jawaban Lanjutan
        
        Alokasi waktu estimasi total: ±XX menit
      `;
      const result = await callGeminiAPI(userPrompt, SYSTEM_PROMPT, false, userRole, userApiKeys);
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
      const result = await callGeminiAPI(userPrompt, SYSTEM_PROMPT, false, userRole, userApiKeys);
      if (result) {
        setOutlineText(result.trim());
        setRevisionInput("");
      }
    } catch (err) {
      setErrorMsg("Gagal merevisi outline.");
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
    try {
      // Try normal parse
      return JSON.parse(text);
    } catch (e) {
      // Try to find JSON block in markdown
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          console.error("Failed to parse extracted JSON block", e2);
        }
      }
      
      // Last resort: try to find the first '{' and last '}'
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          return JSON.parse(text.substring(firstBrace, lastBrace + 1));
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
      
      const resultText = await callGeminiAPI(userPrompt, SYSTEM_PROMPT, true, userRole, userApiKeys);
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
    } catch (err) {
      setErrorMsg(`Gagal merevisi JSON: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setPageData((prev: any) => ({ ...prev, [activeTab]: { ...prev[activeTab], loading: false } }));
    }
  };

  const handleGenerateSinglePage = async (pageId: string) => {
    setPageData((prev: any) => ({ ...prev, [pageId]: { ...prev[pageId], loading: true } }));
    setErrorMsg("");
    
    try {
      const isGuru = pageId.startsWith('Guru');
      const pageTargetName = isGuru ? `Halaman ${pageId} (Kunci Jawaban)` : `Halaman ${pageId} (Lembar Kerja Siswa)`;
      const optionalInstructions = formData.pesanKhusus ? 'User meminta: "' + formData.pesanKhusus + '". Wajib integrasikan permintaan ini kuat-kuat ke dalam tema konten dan terutama "visual_prompt" di setiap section.' : 'Tidak ada instruksi khusus tambahan.';
      
      let pageContext = "";
      if (isGuru) {
        pageContext = "SANGAT PENTING: Karena ini adalah HALAMAN GURU, terapkan aturan BAGIAN 1 - HALAMAN TERAKHIR secara ketat. Dilarang menggunakan elemen dekoratif berlebihan, pastikan semua KUNCI JAWABAN dan rubrik evaluasi ditampilkan dengan jelas.";
      } else if (pageId === "1") {
        pageContext = "SANGAT PENTING: Ini adalah HALAMAN 1. Terapkan aturan BAGIAN 1 - HALAMAN 1 secara ketat (Wajib ada HEADER_IDENTITAS_LENGKAP di bagian atas sebelum soal/materi).";
      } else {
        pageContext = "SANGAT PENTING: Karena ini adalah HALAMAN SISWA, DILARANG KERAS mencantumkan jawaban yang benar di dalam JSON (seperti tanda silang, lingkaran, atau teks penanda pada jawaban). Terapkan aturan BAGIAN 1 - HALAMAN 2 DST.";
      }

      const userPrompt = `
        Berdasarkan Outline berikut:
        ${outlineText}
        
        Gaya Visual: ${formData.visual}
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
      `;
      
      const resultText = await callGeminiAPI(userPrompt, SYSTEM_PROMPT, true, userRole, userApiKeys);
      const parsedData = resultText ? extractJSON(resultText) : null;
      
      setPageData((prev: any) => ({ 
        ...prev, 
        [pageId]: { loading: false, data: parsedData } 
      }));
      
    } catch (err) {
      setErrorMsg(`Gagal menghasilkan JSON untuk Halaman ${pageId}: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
  if (userStatus === "pending" && userRole !== "admin") {
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
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all"
          >
            Log Out
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
            {userRole === "user" && (
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
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
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
                <button 
                  onClick={handleSaveProject}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {projectId ? 'Update' : 'Simpan'}
                </button>
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
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md">
                              {p.formData?.kelas || 'Lv'}
                            </span>
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
                    {!isUserKeyReady && userRole !== "admin" && (
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
                            <div className="text-center">
                              <span className="text-sm font-bold text-blue-600 block mb-1">Menganalisis Kurikulum...</span>
                              <span className="text-xs text-slate-400">Sedang menyusun layout {activeTab}</span>
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
