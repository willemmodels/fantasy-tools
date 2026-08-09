import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { NavBar } from "@/components/shared/nav-bar";
import "./globals.css";

// Nunito's rounded terminals were picked specifically to move away from the
// sharp/serif-adjacent look the previous font fell back to (see below) — the
// variable is named --font-sans directly since that's what globals.css's
// @theme block expects; the old Geist setup named it --font-geist-sans, which
// left --font-sans self-referential (a no-op) and silently fell back to the
// browser default serif font.
const nunito = Nunito({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fantasy Tool",
  description: "Rankings, draft tracker, and trade analyzer for fantasy football.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
