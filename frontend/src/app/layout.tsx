import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/config/providers";
import { NavBar } from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgentMart",
  description: "The demand-first agentic commerce network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <NavBar />
          <main className="min-h-screen max-w-7xl mx-auto p-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
