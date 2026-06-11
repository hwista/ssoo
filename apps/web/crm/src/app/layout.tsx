import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSOO CRM',
  description: 'SSOO CRM 영업기회 워크스페이스',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
