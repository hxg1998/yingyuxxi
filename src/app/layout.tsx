import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/auth/AuthProvider';

export const metadata: Metadata = {
  title: 'WordCard — 英语学习卡片',
  description: '输入英文单词、短语或短句，立刻得到帮你听懂、读出、用上的结构化学习卡片',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {/*
          AuthProvider mounts supabase.auth.onAuthStateChange() at the root level
          so auth state is available globally across all pages.
        */}
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
