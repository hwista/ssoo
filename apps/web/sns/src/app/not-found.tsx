'use client';

import { SsooErrorPage } from '@ssoo/web-shell';

export default function NotFound() {
  return <SsooErrorPage kind="not-found" title="페이지를 찾을 수 없습니다"
    description="주소가 올바르지 않거나 페이지가 이동 또는 삭제되었을 수 있습니다."
    actions={[{ label: '홈으로 이동', href: '/' }, { label: '다른 서비스·계정으로 이동', href: '/recovery' }]} />;
}
