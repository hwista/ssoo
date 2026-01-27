import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// 사용자 데이터 저장 경로
const USERS_FILE = path.join(process.cwd(), 'data/users.json');
const DATA_DIR = path.join(process.cwd(), 'data');

// 사용자 인터페이스
export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
  role: 'admin' | 'editor' | 'viewer';
}

// 사용자 목록 인터페이스
interface UsersData {
  users: User[];
  updatedAt: string;
}

// 디렉토리 생성
async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }
}

// 사용자 데이터 로드
async function loadUsers(): Promise<User[]> {
  await ensureDataDir();

  if (!existsSync(USERS_FILE)) {
    // 기본 관리자 사용자 생성
    const defaultUsers: User[] = [
      {
        id: 'admin',
        username: 'admin',
        displayName: '관리자',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ];
    await saveUsers(defaultUsers);
    return defaultUsers;
  }

  const content = await readFile(USERS_FILE, 'utf-8');
  const data = JSON.parse(content) as UsersData;
  return data.users;
}

// 사용자 데이터 저장
async function saveUsers(users: User[]): Promise<void> {
  await ensureDataDir();

  const data: UsersData = {
    users,
    updatedAt: new Date().toISOString()
  };

  await writeFile(USERS_FILE, JSON.stringify(data, null, 2));
}

// 모든 사용자 조회
export async function getAllUsers(): Promise<User[]> {
  return loadUsers();
}

// 사용자 조회 (ID로)
export async function getUserById(id: string): Promise<User | null> {
  const users = await loadUsers();
  return users.find(u => u.id === id) || null;
}

// 사용자 조회 (username으로)
export async function getUserByUsername(username: string): Promise<User | null> {
  const users = await loadUsers();
  return users.find(u => u.username === username) || null;
}

// 사용자 생성
export async function createUser(
  username: string,
  displayName: string,
  role: 'admin' | 'editor' | 'viewer' = 'editor',
  email?: string
): Promise<User> {
  const users = await loadUsers();

  // 중복 체크
  if (users.some(u => u.username === username)) {
    throw new Error('이미 존재하는 사용자명입니다');
  }

  const newUser: User = {
    id: `user_${Date.now()}`,
    username,
    displayName,
    email,
    role,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  await saveUsers(users);

  return newUser;
}

// 사용자 업데이트
export async function updateUser(
  id: string,
  updates: Partial<Omit<User, 'id' | 'createdAt'>>
): Promise<User | null> {
  const users = await loadUsers();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return null;
  }

  users[index] = {
    ...users[index],
    ...updates
  };

  await saveUsers(users);
  return users[index];
}

// 사용자 삭제
export async function deleteUser(id: string): Promise<boolean> {
  const users = await loadUsers();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    return false;
  }

  // 관리자는 삭제 불가
  if (users[index].role === 'admin' && users.filter(u => u.role === 'admin').length === 1) {
    throw new Error('마지막 관리자는 삭제할 수 없습니다');
  }

  users.splice(index, 1);
  await saveUsers(users);

  return true;
}

// 로그인 처리 (간단한 구현)
export async function login(username: string): Promise<User | null> {
  const user = await getUserByUsername(username);

  if (user) {
    await updateUser(user.id, { lastLoginAt: new Date().toISOString() });
    return user;
  }

  return null;
}

// 활동 로그 인터페이스
export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: 'create' | 'update' | 'delete' | 'view' | 'comment';
  targetType: 'file' | 'folder' | 'comment';
  targetPath: string;
  timestamp: string;
  details?: string;
}

const ACTIVITY_FILE = path.join(process.cwd(), 'data/activity.json');

// 활동 로그 추가
export async function logActivity(
  userId: string,
  username: string,
  action: ActivityLog['action'],
  targetType: ActivityLog['targetType'],
  targetPath: string,
  details?: string
): Promise<void> {
  await ensureDataDir();

  let logs: ActivityLog[] = [];

  if (existsSync(ACTIVITY_FILE)) {
    const content = await readFile(ACTIVITY_FILE, 'utf-8');
    logs = JSON.parse(content);
  }

  const newLog: ActivityLog = {
    id: `log_${Date.now()}`,
    userId,
    username,
    action,
    targetType,
    targetPath,
    timestamp: new Date().toISOString(),
    details
  };

  logs.unshift(newLog);

  // 최근 1000개만 유지
  if (logs.length > 1000) {
    logs = logs.slice(0, 1000);
  }

  await writeFile(ACTIVITY_FILE, JSON.stringify(logs, null, 2));
}

// 활동 로그 조회
export async function getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
  await ensureDataDir();

  if (!existsSync(ACTIVITY_FILE)) {
    return [];
  }

  const content = await readFile(ACTIVITY_FILE, 'utf-8');
  const logs = JSON.parse(content) as ActivityLog[];

  return logs.slice(0, limit);
}
