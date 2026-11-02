import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sistem Pakar Rekomendasi Laptop (RDR)",
  description: "Sistem Rekomendasi Spesifikasi Laptop Berbasis Ripple Down Rules",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased bg-slate-50 font-sans">{children}</body>
    </html>
  );
}
