import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 p-6 text-center">
      <h1 className="text-6xl font-bold text-blue-600 mb-4">404</h1>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
        Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>
      <Link 
        href="/" 
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
      >
        Kembali ke Beranda
      </Link>
    </div>
  );
}
