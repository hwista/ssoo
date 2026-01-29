'use client';

/**
 * Wiki 라우트 페이지
 * 
 * Note: 실제 렌더링은 ContentArea > pageComponents에서 처리
 * 이 파일은 Next.js App Router 라우팅을 위해 존재
 * (main)/layout.tsx의 AppLayout이 ContentArea로 페이지 렌더링
 */
export default function WikiPage() {
  // AppLayout > ContentArea가 pageComponents로 렌더링하므로
  // 이 컴포넌트의 반환값은 사용되지 않음
  return null;
}