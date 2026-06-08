import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
