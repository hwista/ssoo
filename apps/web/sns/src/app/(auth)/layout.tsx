import { AuthPageShell } from '@ssoo/web-auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthPageShell>{children}</AuthPageShell>;
}
