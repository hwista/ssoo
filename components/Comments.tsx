'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Textarea, Text, Spinner } from '@fluentui/react-components';
import { Send24Regular, Edit24Regular, Delete24Regular, Chat24Regular, Person24Regular } from '@fluentui/react-icons';

interface Comment {
  id: string;
  filePath: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string;
  isEdited?: boolean;
  replies?: Comment[];
}

interface CommentsProps {
  filePath: string;
  currentUser?: string;
}

const Comments: React.FC<CommentsProps> = ({ filePath, currentUser = '사용자' }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 새 댓글 입력
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 답글 상태
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // 댓글 목록 로드
  const loadComments = useCallback(async () => {
    if (!filePath) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/comments?filePath=${encodeURIComponent(filePath)}&asTree=true`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '댓글을 불러올 수 없습니다');
      }

      setComments(data.comments);
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 로드 실패');
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);

  // 댓글 추가
  const handleAddComment = async (parentId?: string) => {
    const content = parentId ? replyContent : newComment;
    if (!content.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          author: currentUser,
          content: content.trim(),
          parentId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '댓글 등록 실패');
      }

      if (parentId) {
        setReplyContent('');
        setReplyingTo(null);
      } else {
        setNewComment('');
      }

      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 등록 실패');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 수정
  const handleUpdateComment = async (commentId: string) => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          commentId,
          content: editContent.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '댓글 수정 실패');
      }

      setEditingId(null);
      setEditContent('');
      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 수정 실패');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(
        `/api/comments?filePath=${encodeURIComponent(filePath)}&commentId=${commentId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '댓글 삭제 실패');
      }

      await loadComments();
    } catch (err) {
      setError(err instanceof Error ? err.message : '댓글 삭제 실패');
    }
  };

  // 컴포넌트 마운트 시 댓글 로드
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // 타임스탬프 포맷
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;

    return date.toLocaleDateString('ko-KR');
  };

  // 댓글 렌더링
  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      style={{
        padding: isReply ? '8px 0 8px 24px' : '12px 0',
        borderBottom: isReply ? 'none' : '1px solid #f3f4f6'
      }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* 아바타 */}
        <div style={{
          width: isReply ? 28 : 36,
          height: isReply ? 28 : 36,
          borderRadius: '50%',
          backgroundColor: '#6264a7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Person24Regular style={{ color: '#fff', width: isReply ? 14 : 18, height: isReply ? 14 : 18 }} />
        </div>

        <div style={{ flex: 1 }}>
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text weight="semibold" size={isReply ? 200 : 300}>{comment.author}</Text>
            <Text size={200} style={{ color: '#9ca3af' }}>
              {formatTimestamp(comment.createdAt)}
              {comment.isEdited && ' (수정됨)'}
            </Text>
          </div>

          {/* 내용 */}
          {editingId === comment.id ? (
            <div style={{ marginTop: 8 }}>
              <Textarea
                value={editContent}
                onChange={(e, data) => setEditContent(data.value)}
                style={{ width: '100%', marginBottom: 8 }}
                rows={2}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  appearance="primary"
                  size="small"
                  onClick={() => handleUpdateComment(comment.id)}
                  disabled={isSubmitting}
                >
                  저장
                </Button>
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => {
                    setEditingId(null);
                    setEditContent('');
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <Text size={isReply ? 200 : 300} style={{ whiteSpace: 'pre-wrap' }}>
              {comment.content}
            </Text>
          )}

          {/* 액션 버튼 */}
          {editingId !== comment.id && (
            <div style={{ marginTop: 8, display: 'flex', gap: 12 }}>
              {!isReply && (
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => {
                    setReplyingTo(comment.id);
                    setReplyContent('');
                  }}
                >
                  답글
                </Button>
              )}
              <Button
                appearance="subtle"
                size="small"
                icon={<Edit24Regular />}
                onClick={() => {
                  setEditingId(comment.id);
                  setEditContent(comment.content);
                }}
              />
              <Button
                appearance="subtle"
                size="small"
                icon={<Delete24Regular />}
                onClick={() => handleDeleteComment(comment.id)}
              />
            </div>
          )}

          {/* 답글 입력 */}
          {replyingTo === comment.id && (
            <div style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid #e5e7eb' }}>
              <Textarea
                placeholder="답글을 입력하세요..."
                value={replyContent}
                onChange={(e, data) => setReplyContent(data.value)}
                style={{ width: '100%', marginBottom: 8 }}
                rows={2}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  appearance="primary"
                  size="small"
                  onClick={() => handleAddComment(comment.id)}
                  disabled={isSubmitting || !replyContent.trim()}
                >
                  답글 등록
                </Button>
                <Button
                  appearance="subtle"
                  size="small"
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyContent('');
                  }}
                >
                  취소
                </Button>
              </div>
            </div>
          )}

          {/* 답글 목록 */}
          {comment.replies && comment.replies.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {comment.replies.map(reply => renderComment(reply, true))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: 16 }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Chat24Regular style={{ color: '#6264a7' }} />
        <Text size={400} weight="semibold">댓글</Text>
        <Text size={200} style={{ color: '#9ca3af' }}>
          ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </Text>
      </div>

      {/* 에러 표시 */}
      {error && (
        <div style={{
          padding: 12,
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          marginBottom: 16
        }}>
          <Text style={{ color: '#dc2626' }}>{error}</Text>
        </div>
      )}

      {/* 새 댓글 입력 */}
      <div style={{
        marginBottom: 24,
        padding: 16,
        backgroundColor: '#f9fafb',
        borderRadius: 8
      }}>
        <Textarea
          placeholder="댓글을 입력하세요..."
          value={newComment}
          onChange={(e, data) => setNewComment(data.value)}
          style={{ width: '100%', marginBottom: 8 }}
          rows={3}
        />
        <Button
          appearance="primary"
          icon={<Send24Regular />}
          onClick={() => handleAddComment()}
          disabled={isSubmitting || !newComment.trim()}
        >
          댓글 등록
        </Button>
      </div>

      {/* 로딩 */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spinner size="medium" />
        </div>
      )}

      {/* 댓글 목록 */}
      {!isLoading && comments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
          <Text>첫 번째 댓글을 작성해보세요</Text>
        </div>
      ) : (
        <div>
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  );
};

export default Comments;
