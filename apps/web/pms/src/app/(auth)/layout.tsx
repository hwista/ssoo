/**
 * 인증 전 레이아웃 (로그인, 비밀번호 재설정 등)
 * - 간단한 중앙 정렬 레이아웃
 * - AppLayout 없음
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
