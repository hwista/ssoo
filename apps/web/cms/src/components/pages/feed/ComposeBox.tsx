'use client';

import { useEffect, useState } from 'react';
import { Send, ImageIcon, Link2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CmsVisibilityScopeCode } from '@ssoo/types/cms';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { APP_HOME_PATH } from '@/lib/constants/routes';
import { useAccessStore, useAuthStore } from '@/stores';
import { useCreatePost } from '@/hooks/queries/usePosts';

const VISIBILITY_OPTIONS: Array<{
  value: CmsVisibilityScopeCode;
  label: string;
}> = [
  { value: 'public', label: '전체 공개' },
  { value: 'organization', label: '내 조직' },
  { value: 'followers', label: '팔로워' },
  { value: 'self', label: '나만 보기' },
];

export function ComposeBox() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibilityScopeCode, setVisibilityScopeCode] =
    useState<CmsVisibilityScopeCode>('public');
  const createPost = useCreatePost();
  const canCreatePost = accessSnapshot?.features.canCreatePost ?? false;

  useEffect(() => {
    if (searchParams.get('compose') !== '1') {
      return;
    }

    if (canCreatePost) {
      setIsExpanded(true);
    }

    router.replace(APP_HOME_PATH, { scroll: false });
  }, [canCreatePost, router, searchParams]);

  const handleSubmit = async () => {
    if (!canCreatePost || !content.trim()) return;
    await createPost.mutateAsync({
      content: content.trim(),
      visibilityScopeCode,
    });
    setContent('');
    setVisibilityScopeCode('public');
    setIsExpanded(false);
  };

  const initials = user?.displayName?.slice(0, 2) || user?.userName?.slice(0, 2) || user?.loginId?.slice(0, 2) || '?';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-ssoo-primary text-white text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            {isExpanded ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="무슨 생각을 하고 계신가요?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  autoFocus
                  className="resize-none"
                />
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="post-visibility-scope"
                    className="text-xs font-medium text-muted-foreground"
                  >
                    공개 범위
                  </label>
                  <select
                    id="post-visibility-scope"
                    value={visibilityScopeCode}
                    onChange={(e) => setVisibilityScopeCode(e.target.value as CmsVisibilityScopeCode)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Link2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsExpanded(false);
                        setContent('');
                        setVisibilityScopeCode('public');
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={!canCreatePost || !content.trim() || createPost.isPending}
                    >
                      <Send className="mr-1 h-4 w-4" />
                      게시
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
                <button
                  disabled={!canCreatePost}
                  className="w-full text-left px-4 py-3 rounded-full border border-input text-muted-foreground hover:bg-muted/50 transition-colors text-sm"
                  onClick={() => setIsExpanded(true)}
                >
                  {canCreatePost ? '무슨 생각을 하고 계신가요?' : '게시물 작성 권한이 없습니다.'}
                </button>
              )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
