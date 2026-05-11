"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db, googleProvider, handleFirestoreError, OperationType } from "@/lib/firebase";
import { onAuthStateChanged, signInWithPopup, signOut, User } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { Loader2, LogIn } from "lucide-react";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Assign Admin role to specific email
        const role = user.email === "jagofeed@gmail.com" ? "admin" : "user";
        // New users are pending by default, admins are active
        const defaultStatus = role === "admin" ? "active" : "pending";

        setUser(user);
        
        // Save user info to Firestore
        try {
          const userRef = doc(db, "users", user.uid);
          // Check if user exists first to preserve existing role/status for non-admins
          let userSnap;
          try {
            userSnap = await getDoc(userRef);
          } catch (e) {
            console.warn("Could not fetch user snap, might be first login", e);
          }

          const isExistingUser = !!(userSnap && userSnap.exists());
          const existingData = isExistingUser ? userSnap?.data() : null;

          // Payload according to requested required fields: role, status, lastLogin
          const userData: any = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || existingData?.displayName || "",
            photoURL: user.photoURL || existingData?.photoURL || "",
            role: existingData?.role || role,
            status: existingData?.status || defaultStatus,
            lastLogin: serverTimestamp(),
          };

          // Override for admin if necessary
          if (user.email === "jagofeed@gmail.com") {
            userData.role = "admin";
            userData.status = "active";
          }

          try {
            await setDoc(userRef, userData, { merge: true });
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
          }
        } catch (error) {
          console.error("Error saving user profile:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600">
            <LogIn className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">LKPD Generator Pro</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Silakan masuk dengan akun Google Anda untuk mulai merancang LKPD edukatif.
          </p>
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-blue-500/30"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81.64z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Masuk dengan Google
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
