'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button, Textarea } from '@ssoo/web-ui';
import { useComments, useCreateComment } from '@/hooks/queries/useComments';
import { useUserProfile } from '@/hooks/queries/useProfiles';

interface PostCommentsProps {
  id: string;
  postId: string;
  open: boolean;
  canWrite: boolean;
}

function CommentAuthor({ userId }: { userId: string }) {
  const profile = useUserProfile(userId);
  const user = profile.data?.data.data?.user;
  if (profile.isError) return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-caption text-muted-foreground">작성자 정보를 불러오지 못했습니다.</span>
      <Button variant="outline" size="sm" disabled={profile.isFetching} onClick={() => void profile.refetch()}>작성자 다시 불러오기</Button>
    </div>
  );
  return <p className="text-body-sm break-words">{user ? user.displayName || user.userName : '작성자 불러오는 중...'}</p>;
}

export function PostComments({ id, postId, open, canWrite }: PostCommentsProps) {
  const comments = useComments(postId, open);
  const create = useCreateComment();
  const submitting = useRef(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const items = comments.data ?? [];
  const byId = new Map(items.map((comment) => [comment.id, comment]));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !canWrite) return;
    setError(null);
    setSaved(false);
    const content = draft.trim();
    if (!content) { setError('댓글 내용을 입력하세요.'); return; }
    submitting.current = true;
    try {
      await create.mutateAsync({ postId, data: { content } });
      setDraft('');
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '댓글을 등록하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      submitting.current = false;
    }
  }

  return (
    <section id={id} hidden={!open} aria-label="댓글 목록과 작성" className="mt-4 space-y-3">
      {saved && <p role="status" className="text-body-sm">댓글을 등록했습니다.</p>}
      {comments.isLoading && <p role="status" className="text-body-sm text-muted-foreground">댓글을 불러오는 중...</p>}
      {comments.isError ? (
        <div className="space-y-2">
          <p role="alert" className="text-body-sm text-destructive">{saved ? '등록은 완료됐지만 댓글 목록을 불러오지 못했습니다.' : '댓글을 불러오지 못했습니다.'}</p>
          <Button variant="outline" size="sm" disabled={comments.isFetching} onClick={() => void comments.refetch()}>댓글 다시 불러오기</Button>
        </div>
      ) : comments.isSuccess && (items.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">아직 댓글이 없습니다.</p>
      ) : (
        <ol className="space-y-3">
          {items.map((comment) => (
            <li key={comment.id} className="space-y-1 break-words">
              {open && <CommentAuthor userId={comment.authorUserId} />}
              <time dateTime={comment.createdAt} className="text-caption text-muted-foreground">{new Date(comment.createdAt).toLocaleString('ko-KR')}</time>
              {comment.parentCommentId && <p className="line-clamp-2 text-caption text-muted-foreground">답글 · {byId.get(comment.parentCommentId)?.content ?? '원문 댓글을 확인할 수 없습니다.'}</p>}
              <p className="whitespace-pre-wrap break-words text-body-sm">{comment.content}</p>
            </li>
          ))}
        </ol>
      ))}
      {canWrite ? (
        <form onSubmit={submit} className="space-y-2" aria-busy={create.isPending}>
          <label htmlFor={`${id}-content`} className="text-body-sm">댓글 내용</label>
          <Textarea id={`${id}-content`} value={draft} required disabled={create.isPending}
            aria-describedby={error ? `${id}-error` : undefined}
            onChange={(event) => setDraft(event.target.value)} />
          {error && <p id={`${id}-error`} role="alert" className="text-body-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={create.isPending}>{create.isPending ? '등록 중...' : '댓글 등록'}</Button>
        </form>
      ) : <p className="text-body-sm text-muted-foreground">댓글 작성 권한이 없습니다.</p>}
    </section>
  );
}
