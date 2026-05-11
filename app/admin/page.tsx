"use client";

import React, { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { useAuth } from "@/components/AuthGuard";
import { 
  CheckCircle, 
  Users, 
  Clock, 
  ShieldAlert, 
  Loader2, 
  LayoutDashboard,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: string;
  status: string;
  lastLogin: any;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pendingUsers, setPendingUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Verify Admin role
  useEffect(() => {
    if (!user) return;

    const checkAdmin = async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists() && userSnap.data().role === "admin") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setIsAdmin(false);
      }
    };
    checkAdmin();
  }, [user]);

  // Listen for pending users
  useEffect(() => {
    if (isAdmin !== true) return;

    const q = query(collection(db, "users"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users: AppUser[] = [];
      snapshot.forEach((doc) => {
        users.push({ ...doc.data() as AppUser, uid: doc.id });
      });
      setPendingUsers(users);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const approveUser = async (userId: string) => {
    setProcessingId(userId);
    try {
      await updateDoc(doc(db, "users", userId), {
        status: "active"
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (isAdmin === false) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Akses Ditolak</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
          <Link href="/" className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline">
            <LayoutDashboard className="w-4 h-4" /> Kembali ke Utama
          </Link>
        </div>
      </div>
    );
  }

  if (loading || isAdmin === null) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-6 lg:p-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-slate-500 dark:text-slate-400">Verifikasi pengguna baru LKPD Generator Pro</p>
            </div>
          </div>
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold shadow-sm hover:shadow-md transition-all h-fit"
          >
            Aplikasi Utama <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pending Approval</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{pendingUsers.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Role Anda</span>
                <ShieldAlert className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-black text-slate-900 dark:text-white capitalize">Administrator</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden mb-10">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase">User</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase">Login Terakhir</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-sm font-bold text-slate-500 uppercase text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {pendingUsers.length > 0 ? (
                  pendingUsers.map((u) => (
                    <tr key={u.uid} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-sm">
                            {u.photoURL ? (
                              <Image 
                                src={u.photoURL} 
                                alt={u.displayName} 
                                fill 
                                className="object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <Users className="w-5 h-5 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{u.displayName || "No Name"}</p>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                        {u.lastLogin ? new Date(u.lastLogin.toDate()).toLocaleString('id-ID') : 'Belum pernah'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                          PENDING
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => approveUser(u.uid)}
                          disabled={processingId === u.uid}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-blue-500/30 transition-all"
                        >
                          {processingId === u.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <LayoutDashboard className="w-8 h-8 opacity-20" />
                        <p>Tidak ada pengguna yang menunggu persetujuan.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
