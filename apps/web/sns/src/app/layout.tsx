import type { Metadata } from 'next';
import { getSsooAppMetadata, SsooFaviconSync } from '@ssoo/web-shell';
import { Providers } from './providers';
import '../../../../../packages/web-shell/src/styles/ssoo-global.css';
import './globals.css';

export const metadata: Metadata = getSsooAppMetadata('sns');

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body data-ssoo-theme="sns">
        <SsooFaviconSync appKey="sns" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
