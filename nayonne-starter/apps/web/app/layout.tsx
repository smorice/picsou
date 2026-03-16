import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Les Nayonnes",
  description: "Reseau social familial prive",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
