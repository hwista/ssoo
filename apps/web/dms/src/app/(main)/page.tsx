import { AppLayout } from '@/components/layout';

/**
 * DMS 메인 셸 페이지 (/)
 *
 * - 브라우저 공개 진입점은 `/` 하나만 사용
 * - 실제 탭 기반 화면 전환은 AppLayout > ContentArea가 담당
 */
export default function MainPage() {
  return <AppLayout />;
}
