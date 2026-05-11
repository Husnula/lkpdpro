import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider, AuthGuard } from "@/components/AuthGuard";

export const metadata: Metadata = {
  title: "LKPD Generator Pro",
  description: "LKPD Generator Pro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <AuthProvider>
          <AuthGuard>
            {children}
          </AuthGuard>
        </AuthProvider>
      </body>
    </html>
  );
}
