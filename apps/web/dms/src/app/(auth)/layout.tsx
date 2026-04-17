import { AuthPageShell } from '@ssoo/web-auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dms-auth-theme">
      <AuthPageShell>{children}</AuthPageShell>
    </div>
  );
}
