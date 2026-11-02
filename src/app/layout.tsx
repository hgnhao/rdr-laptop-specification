import type { Metadata } from "next";
import { THEME_SCRIPT } from "@/lib/themeScript";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laptop Advisor · Sistem Pakar Ripple Down Rules",
  description:
    "Sistem pakar rekomendasi spesifikasi laptop berbasis Ripple Down Rules. Pakar mengoreksi kesimpulan dan sistem belajar lewat rule pengecualian.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme dipasang oleh THEME_SCRIPT sebelum hidrasi, jadi atributnya sengaja berbeda dari HTML server.
    <html lang="id" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
