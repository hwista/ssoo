'use client';

import { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/StateDisplay';
import { useAccessStore } from '@/stores';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const canReadFeed = accessSnapshot?.features.canReadFeed ?? false;

  if (!canReadFeed) {
    return (
      <div className="max-w-3xl mx-auto">
        <EmptyState
          icon={<Users className="h-12 w-12" />}
          title="전문가 검색 권한이 없습니다"
          description="현재 계정에는 CMS 검색 화면에 접근할 권한이 없습니다."
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-4">전문가 검색</h1>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="이름, 스킬, 기술 키워드로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['전체', '프로그래밍', '프레임워크', '인프라', '관리', '설계'].map((cat) => (
          <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-muted">
            {cat}
          </Badge>
        ))}
      </div>

      {/* Results placeholder */}
      <EmptyState
        icon={<Users className="h-12 w-12" />}
        title="검색어를 입력하세요"
        description="스킬, 이름, 기술 키워드로 전문가를 찾을 수 있습니다."
      />
    </div>
  );
}
