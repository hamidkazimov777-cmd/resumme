import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Resumee — AI Resume & Cover Letter Engine",
  description: "ATS-optimized resumes and cover letters tailored to any job.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden">
            <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
