'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, ImageIcon } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { SnsVisibilityScopeCode } from '@ssoo/types/sns';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { APP_HOME_PATH } from '@/lib/constants/routes';
import { useAccessStore, useAuthStore } from '@/stores';
import { useCreatePost, useCreateImagePost } from '@/hooks/queries/usePosts';
import { AttachLinkButton } from './AttachLinkButton';
import { ImageDrafts } from './ImageDrafts';
import { Input, NativeSelect } from '@ssoo/web-ui';

const VISIBILITY_OPTIONS: Array<{
  value: SnsVisibilityScopeCode;
  label: string;
}> = [
  { value: 'public', label: '전체 공개' },
  { value: 'organization', label: '내 조직' },
  { value: 'followers', label: '팔로워' },
  { value: 'self', label: '나만 보기' },
];

export function ComposeBox() {
  const userId = useAuthStore((state) => state.user?.userId);
  return <ComposeDraft key={userId ?? 'anonymous'} />;
}

function ComposeDraft() {
  const { user } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accessSnapshot = useAccessStore((state) => state.snapshot);
  const [content, setContent] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibilityScopeCode, setVisibilityScopeCode] =
    useState<SnsVisibilityScopeCode>('public');
  const createPost = useCreatePost();
  const createImagePost = useCreateImagePost();
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const pending = createPost.isPending || createImagePost.isPending;
  // Preserve the exact request after an ambiguous response; retry must not create a second post.
  const locked = pending || submissionId !== null;
  const pickImages = (selected: File[]) => {
    if (images.length + selected.length > 4) { setError('사진은 최대 4장까지 첨부할 수 있습니다.'); return; }
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size === 0 || file.size > 5_000_000)) {
      setError('사진은 JPEG·PNG·WebP 형식으로 장당 5MB 이하를 선택해 주세요.'); return;
    }
    setImages((previous) => [...previous, ...selected]);
    setError('');
  };
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
    if (!canCreatePost || !content.trim() || submitting.current) return;
    submitting.current = true;
    setError('');
    try {
      if (images.length) {
        const requestId = submissionId ?? crypto.randomUUID();
        setSubmissionId(requestId);
        await createImagePost.mutateAsync({ content: content.trim(), visibilityScopeCode, submissionId: requestId, images });
      } else {
        await createPost.mutateAsync({ content: content.trim(), visibilityScopeCode });
      }
      setContent('');
      setImages([]);
      setSubmissionId(null);
      setVisibilityScopeCode('public');
      setIsExpanded(false);
    } catch (cause) {
      const status = (cause as { status?: number }).status;
      if (status && status >= 400 && status < 500 && status !== 409) setSubmissionId(null);
      setError(cause instanceof Error ? cause.message : '게시하지 못했습니다. 다시 시도해 주세요.');
    } finally { submitting.current = false; }
  };

  const initials = user?.displayName?.slice(0, 2) || user?.userName?.slice(0, 2) || user?.loginId?.slice(0, 2) || '?';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-ssoo-primary text-primary-foreground text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {isExpanded ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="무슨 생각을 하고 계신가요?"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={locked}
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
                  <NativeSelect
                    disabled={locked}
                    id="post-visibility-scope"
                    value={visibilityScopeCode}
                    onChange={(e) => setVisibilityScopeCode(e.target.value as SnsVisibilityScopeCode)}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {VISIBILITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <ImageDrafts files={images} disabled={locked} onRemove={(index) => setImages((previous) => previous.filter((_, i) => i !== index))} />
                {error && <p role="alert" className="text-body-sm text-destructive">{error}</p>}
                {submissionId && !pending && <p className="text-body-sm text-muted-foreground">이전 게시 결과를 확인하려면 다시 시도해 주세요. 재시도 중에는 같은 내용을 유지합니다.</p>}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <Input ref={picker} type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="첨부 사진 선택" className="sr-only" tabIndex={-1} disabled={locked} onChange={(event) => { pickImages(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
                    <Button variant="ghost" size="icon" disabled={locked} aria-label="이미지 첨부" onClick={() => picker.current?.click()}>
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                    <AttachLinkButton disabled={locked} onAdd={(url) => setContent((previous) => `${previous}${previous && !previous.endsWith('\n') ? '\n' : ''}${url}`)} />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      onClick={() => {
                        setImages([]);
                        setSubmissionId(null);
                        setError('');
                        setIsExpanded(false);
                        setContent('');
                        setVisibilityScopeCode('public');
                      }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void handleSubmit()}
                      disabled={!canCreatePost || !content.trim() || pending}
                    >
                      <Send className="mr-1 h-4 w-4" />
                      {pending ? '게시 중...' : submissionId ? '다시 시도' : '게시'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
                <Button variant="plain" size="plain"
                  disabled={!canCreatePost}
                  className="w-full text-left px-4 py-3 rounded-full border border-input text-muted-foreground hover:bg-muted/50 transition-colors text-sm"
                  onClick={() => setIsExpanded(true)}
                >
                  {canCreatePost ? '무슨 생각을 하고 계신가요?' : '게시물 작성 권한이 없습니다.'}
                </Button>
              )}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
