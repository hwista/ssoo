import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 댓글 저장 디렉토리
const COMMENTS_DIR = path.join(process.cwd(), 'data/comments');

// 댓글 인터페이스
export interface Comment {
  id: string;
  filePath: string;
  author: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  parentId?: string; // 답글인 경우 부모 댓글 ID
  isEdited?: boolean;
}

// 댓글 목록 인터페이스
interface CommentsData {
  filePath: string;
  comments: Comment[];
  updatedAt: string;
}

// 디렉토리 생성
async function ensureCommentsDir(): Promise<void> {
  if (!existsSync(COMMENTS_DIR)) {
    await mkdir(COMMENTS_DIR, { recursive: true });
  }
}

// 파일 경로를 댓글 파일 경로로 변환
function getCommentsFilePath(filePath: string): string {
  const sanitizedPath = filePath.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
  return path.join(COMMENTS_DIR, `${sanitizedPath}.json`);
}

// 댓글 목록 조회
export async function getComments(filePath: string): Promise<Comment[]> {
  await ensureCommentsDir();

  const commentsFile = getCommentsFilePath(filePath);

  if (!existsSync(commentsFile)) {
    return [];
  }

  const content = await readFile(commentsFile, 'utf-8');
  const data = JSON.parse(content) as CommentsData;

  return data.comments;
}

// 댓글 추가
export async function addComment(
  filePath: string,
  author: string,
  content: string,
  parentId?: string
): Promise<Comment> {
  await ensureCommentsDir();

  const comments = await getComments(filePath);

  const newComment: Comment = {
    id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    filePath,
    author,
    content,
    createdAt: new Date().toISOString(),
    parentId
  };

  comments.push(newComment);

  const commentsFile = getCommentsFilePath(filePath);
  const data: CommentsData = {
    filePath,
    comments,
    updatedAt: new Date().toISOString()
  };

  await writeFile(commentsFile, JSON.stringify(data, null, 2));

  return newComment;
}

// 댓글 수정
export async function updateComment(
  filePath: string,
  commentId: string,
  content: string
): Promise<Comment | null> {
  const comments = await getComments(filePath);

  const index = comments.findIndex(c => c.id === commentId);
  if (index === -1) {
    return null;
  }

  comments[index] = {
    ...comments[index],
    content,
    updatedAt: new Date().toISOString(),
    isEdited: true
  };

  const commentsFile = getCommentsFilePath(filePath);
  const data: CommentsData = {
    filePath,
    comments,
    updatedAt: new Date().toISOString()
  };

  await writeFile(commentsFile, JSON.stringify(data, null, 2));

  return comments[index];
}

// 댓글 삭제
export async function deleteComment(
  filePath: string,
  commentId: string
): Promise<boolean> {
  const comments = await getComments(filePath);

  const index = comments.findIndex(c => c.id === commentId);
  if (index === -1) {
    return false;
  }

  // 해당 댓글과 모든 답글 삭제
  const filteredComments = comments.filter(
    c => c.id !== commentId && c.parentId !== commentId
  );

  const commentsFile = getCommentsFilePath(filePath);
  const data: CommentsData = {
    filePath,
    comments: filteredComments,
    updatedAt: new Date().toISOString()
  };

  await writeFile(commentsFile, JSON.stringify(data, null, 2));

  return true;
}

// 댓글 수 조회
export async function getCommentCount(filePath: string): Promise<number> {
  const comments = await getComments(filePath);
  return comments.length;
}

// 트리 구조로 댓글 정리
export function organizeCommentsAsTree(comments: Comment[]): (Comment & { replies: Comment[] })[] {
  const rootComments = comments.filter(c => !c.parentId);
  const repliesMap = new Map<string, Comment[]>();

  // 답글을 부모 ID별로 그룹화
  comments.forEach(c => {
    if (c.parentId) {
      const replies = repliesMap.get(c.parentId) || [];
      replies.push(c);
      repliesMap.set(c.parentId, replies);
    }
  });

  // 루트 댓글에 답글 추가
  return rootComments.map(comment => ({
    ...comment,
    replies: repliesMap.get(comment.id) || []
  }));
}
