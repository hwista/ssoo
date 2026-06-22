import type { Metadata } from 'next';
import { getSsooAppMetadata, SsooFaviconSync } from '@ssoo/web-shell';
import { Providers } from './providers';
import '../../../../../packages/web-shell/src/styles/ssoo-global.css';
import './globals.css';

export const metadata: Metadata = getSsooAppMetadata('admin');

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body data-ssoo-theme="admin">
        <SsooFaviconSync appKey="admin" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
