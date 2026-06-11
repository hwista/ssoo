import type { Metadata } from 'next';
import '../../../../../packages/web-shell/src/styles/ssoo-global.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSOT CRM | 영업 허브',
  description: 'SSOT 영업기회 워크스페이스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
