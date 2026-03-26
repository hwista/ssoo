import type { Metadata } from 'next';
import { Providers } from './providers';
import "./globals.css";

export const metadata: Metadata = {
  title: 'SSOT - 문서 허브',
  description: '위키, 시스템 개발문서, 블로그 통합 문서 관리 시스템',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
