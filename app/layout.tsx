import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tradein",
  description: "AI買取マッチング・エージェント"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
