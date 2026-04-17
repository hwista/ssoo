import { AuthPageShell } from '@ssoo/web-auth';

/**
 * 인증 전 레이아웃 (로그인, 비밀번호 재설정 등)
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthPageShell>{children}</AuthPageShell>;
}
