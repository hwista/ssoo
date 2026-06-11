import type { Metadata } from 'next';
import { Providers } from './providers';
import '../../../../../packages/web-shell/src/styles/ssoo-global.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'SSOT Admin | 플랫폼 관리',
  description: 'SSOT 플랫폼 관리 허브',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
