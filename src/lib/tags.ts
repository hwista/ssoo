import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 데이터 저장 경로
const TAGS_FILE = path.join(process.cwd(), 'data/tags.json');
const DATA_DIR = path.join(process.cwd(), 'data');

// 태그 인터페이스
export interface Tag {
  id: string;
  name: string;
  color: string;
  description?: string;
  createdAt: string;
}

// 파일-태그 매핑 인터페이스
export interface FileTag {
  filePath: string;
  tagIds: string[];
  updatedAt: string;
}

// 전체 데이터 인터페이스
interface TagsData {
  tags: Tag[];
  fileTags: FileTag[];
  updatedAt: string;
}

// 기본 색상 팔레트
export const tagColors = [
  '#EF4444', // red
  '#F97316', // orange
  '#EAB308', // yellow
  '#22C55E', // green
  '#14B8A6', // teal
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#6B7280', // gray
  '#0EA5E9', // sky
];

// 디렉토리 생성
async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// 데이터 로드
async function loadTagsData(): Promise<TagsData> {
  await ensureDataDir();

  if (!existsSync(TAGS_FILE)) {
    const defaultData: TagsData = {
      tags: [],
      fileTags: [],
      updatedAt: new Date().toISOString()
    };
    await saveTagsData(defaultData);
    return defaultData;
  }

  const content = await readFile(TAGS_FILE, 'utf-8');
  return JSON.parse(content) as TagsData;
}

// 데이터 저장
async function saveTagsData(data: TagsData): Promise<void> {
  await ensureDataDir();
  data.updatedAt = new Date().toISOString();
  await writeFile(TAGS_FILE, JSON.stringify(data, null, 2));
}

// =====================
// 태그 관리 함수
// =====================

// 모든 태그 조회
export async function getAllTags(): Promise<Tag[]> {
  const data = await loadTagsData();
  return data.tags;
}

// 태그 생성
export async function createTag(
  name: string,
  color: string = tagColors[0],
  description?: string
): Promise<Tag> {
  const data = await loadTagsData();

  // 중복 체크
  if (data.tags.some(t => t.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('이미 존재하는 태그입니다');
  }

  const newTag: Tag = {
    id: `tag_${Date.now()}`,
    name,
    color,
    description,
    createdAt: new Date().toISOString()
  };

  data.tags.push(newTag);
  await saveTagsData(data);

  return newTag;
}

// 태그 수정
export async function updateTag(
  id: string,
  updates: Partial<Omit<Tag, 'id' | 'createdAt'>>
): Promise<Tag | null> {
  const data = await loadTagsData();
  const index = data.tags.findIndex(t => t.id === id);

  if (index === -1) {
    return null;
  }

  // 이름 중복 체크
  if (updates.name) {
    const duplicate = data.tags.find(
      t => t.id !== id && t.name.toLowerCase() === updates.name!.toLowerCase()
    );
    if (duplicate) {
      throw new Error('이미 존재하는 태그 이름입니다');
    }
  }

  data.tags[index] = {
    ...data.tags[index],
    ...updates
  };

  await saveTagsData(data);
  return data.tags[index];
}

// 태그 삭제
export async function deleteTag(id: string): Promise<boolean> {
  const data = await loadTagsData();
  const index = data.tags.findIndex(t => t.id === id);

  if (index === -1) {
    return false;
  }

  // 태그 삭제
  data.tags.splice(index, 1);

  // 파일-태그 매핑에서도 제거
  data.fileTags.forEach(ft => {
    ft.tagIds = ft.tagIds.filter(tid => tid !== id);
  });

  // 빈 매핑 제거
  data.fileTags = data.fileTags.filter(ft => ft.tagIds.length > 0);

  await saveTagsData(data);
  return true;
}

// =====================
// 파일-태그 매핑 함수
// =====================

// 파일의 태그 조회
export async function getFileTags(filePath: string): Promise<Tag[]> {
  const data = await loadTagsData();
  const fileTag = data.fileTags.find(ft => ft.filePath === filePath);

  if (!fileTag) {
    return [];
  }

  return data.tags.filter(t => fileTag.tagIds.includes(t.id));
}

// 파일에 태그 추가
export async function addTagToFile(filePath: string, tagId: string): Promise<boolean> {
  const data = await loadTagsData();

  // 태그 존재 확인
  if (!data.tags.some(t => t.id === tagId)) {
    throw new Error('존재하지 않는 태그입니다');
  }

  let fileTag = data.fileTags.find(ft => ft.filePath === filePath);

  if (!fileTag) {
    fileTag = {
      filePath,
      tagIds: [],
      updatedAt: new Date().toISOString()
    };
    data.fileTags.push(fileTag);
  }

  if (!fileTag.tagIds.includes(tagId)) {
    fileTag.tagIds.push(tagId);
    fileTag.updatedAt = new Date().toISOString();
    await saveTagsData(data);
  }

  return true;
}

// 파일에서 태그 제거
export async function removeTagFromFile(filePath: string, tagId: string): Promise<boolean> {
  const data = await loadTagsData();
  const fileTag = data.fileTags.find(ft => ft.filePath === filePath);

  if (!fileTag) {
    return false;
  }

  const index = fileTag.tagIds.indexOf(tagId);
  if (index === -1) {
    return false;
  }

  fileTag.tagIds.splice(index, 1);
  fileTag.updatedAt = new Date().toISOString();

  // 빈 매핑 제거
  if (fileTag.tagIds.length === 0) {
    const ftIndex = data.fileTags.findIndex(ft => ft.filePath === filePath);
    data.fileTags.splice(ftIndex, 1);
  }

  await saveTagsData(data);
  return true;
}

// 파일의 태그 설정 (기존 태그 대체)
export async function setFileTags(filePath: string, tagIds: string[]): Promise<boolean> {
  const data = await loadTagsData();

  // 모든 태그 존재 확인
  for (const tagId of tagIds) {
    if (!data.tags.some(t => t.id === tagId)) {
      throw new Error(`존재하지 않는 태그입니다: ${tagId}`);
    }
  }

  const index = data.fileTags.findIndex(ft => ft.filePath === filePath);

  if (tagIds.length === 0) {
    // 태그가 없으면 매핑 삭제
    if (index !== -1) {
      data.fileTags.splice(index, 1);
    }
  } else {
    if (index === -1) {
      data.fileTags.push({
        filePath,
        tagIds,
        updatedAt: new Date().toISOString()
      });
    } else {
      data.fileTags[index].tagIds = tagIds;
      data.fileTags[index].updatedAt = new Date().toISOString();
    }
  }

  await saveTagsData(data);
  return true;
}

// 특정 태그가 적용된 파일 목록 조회
export async function getFilesByTag(tagId: string): Promise<string[]> {
  const data = await loadTagsData();
  return data.fileTags
    .filter(ft => ft.tagIds.includes(tagId))
    .map(ft => ft.filePath);
}

// 태그별 파일 수 통계
export async function getTagStats(): Promise<{ tag: Tag; fileCount: number }[]> {
  const data = await loadTagsData();

  return data.tags.map(tag => ({
    tag,
    fileCount: data.fileTags.filter(ft => ft.tagIds.includes(tag.id)).length
  }));
}
