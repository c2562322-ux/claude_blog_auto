import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "병원 블로그 생성기",
  description: "네이버 블로그 병원 홍보 글 자동 생성 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('theme')??'dark';document.documentElement.classList.toggle('dark',t==='dark')}catch(e){document.documentElement.classList.add('dark')}`,
          }}
        />
      </head>
      <body className={`${geist.className} h-full bg-gray-50 dark:bg-gray-900`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
