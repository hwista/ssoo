# 📡 API Reference

Markdown Wiki System의 모든 API 엔드포인트와 사용법을 설명합니다.

## 📋 목차

1. [파일 작업 API](#-파일-작업-api)
2. [파일 목록 API](#-파일-목록-api)
3. [실시간 감시 API](#-실시간-감시-api)
4. [에러 코드](#-에러-코드)
5. [사용 예제](#-사용-예제)

---

## 📄 파일 작업 API

### Endpoint
```
POST /api/file
```

### Request Format
```typescript
interface FileActionRequest {
  action: 'read' | 'write' | 'delete' | 'rename';
  path: string;
  content?: string;    // write 액션에서 필수
  newPath?: string;    // rename 액션에서 필수
}
```

### Response Format
```typescript
interface FileActionResponse {
  success: boolean;
  data?: any;
  error?: string;
}
```

### 액션별 상세

#### 1. 파일 읽기 (read)
```javascript
// Request
{
  "action": "read",
  "path": "example.md"
}

// Response (성공)
{
  "success": true,
  "data": "# Example\n\nThis is content..."
}

// Response (실패)
{
  "success": false,
  "error": "파일을 찾을 수 없습니다."
}
```

#### 2. 파일 쓰기 (write)
```javascript
// Request
{
  "action": "create",
  "path": "new-file.md",
  "content": "# New File\n\nContent here..."
}

// Response (성공)
{
  "success": true,
  "data": "파일이 성공적으로 저장되었습니다."
}
```

#### 3. 파일 삭제 (delete)
```javascript
// Request
{
  "action": "delete",
  "path": "unwanted.md"
}

// Response (성공)
{
  "success": true,
  "data": "파일이 성공적으로 삭제되었습니다."
}
```

#### 4. 파일 이름 변경 (rename)
```javascript
// Request
{
  "action": "rename",
  "path": "old-name.md",
  "newPath": "new-name.md"
}

// Response (성공)
{
  "success": true,
  "data": "파일 이름이 성공적으로 변경되었습니다."
}
```

---

## 📁 파일 목록 API

### Endpoint
```
GET /api/files
```

### Response Format
```typescript
interface FileListResponse {
  success: boolean;
  data: FileNode[];
  error?: string;
}

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}
```

### 사용 예제
```javascript
// Request
GET /api/files

// Response
{
  "success": true,
  "data": [
    {
      "name": "docs",
      "type": "directory",
      "path": "docs",
      "children": [
        {
          "name": "README.md",
          "type": "file",
          "path": "README.md"
        },
        {
          "name": "guides",
          "type": "directory",
          "path": "guides",
          "children": [
            {
              "name": "setup.md",
              "type": "file",
              "path": "guides/setup.md"
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 📡 실시간 감시 API

### Endpoint
```
GET /api/watch
```

### Response Format
Server-Sent Events (SSE) 스트림

```typescript
interface WatchEvent {
  type: 'file-changed' | 'file-created' | 'file-deleted';
  path: string;
  timestamp: number;
}
```

### 사용 예제
```javascript
// 클라이언트 사이드
const eventSource = new EventSource('/api/watch');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('파일 변경 감지:', data);
  
  // 파일 목록 새로고침
  refreshFileList();
};

eventSource.onerror = (error) => {
  console.error('SSE 연결 오류:', error);
};
```

---

## ⚠️ 에러 코드

### HTTP 상태 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| 200 | OK | 요청 성공 |
| 400 | Bad Request | 잘못된 요청 (필수 필드 누락 등) |
| 404 | Not Found | 파일/폴더를 찾을 수 없음 |
| 500 | Internal Server Error | 서버 내부 오류 |

### 커스텀 에러 메시지

| 에러 메시지 | 원인 | 해결 방법 |
|-------------|------|-----------|
| "Missing required fields" | 필수 필드 누락 | action, path 필드 확인 |
| "파일을 찾을 수 없습니다" | 존재하지 않는 파일 접근 | 파일 경로 확인 |
| "폴더를 생성할 수 없습니다" | 폴더 생성 권한 부족 | 파일 시스템 권한 확인 |
| "파일 이름이 중복됩니다" | 같은 이름의 파일 존재 | 다른 이름 사용 |

---

## 💡 사용 예제

### React에서 파일 읽기
```typescript
const loadFile = async (path: string) => {
  try {
    const response = await fetch('/api/file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'read',
        path: path
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setContent(result.data);
    } else {
      console.error('파일 로드 실패:', result.error);
    }
  } catch (error) {
    console.error('네트워크 오류:', error);
  }
};
```

### React에서 파일 저장
```typescript
const saveFile = async (path: string, content: string) => {
  try {
    const response = await fetch('/api/file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'write',
        path: path,
        content: content
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('파일 저장 성공');
      // 성공 알림 표시
    } else {
      console.error('파일 저장 실패:', result.error);
      // 에러 알림 표시
    }
  } catch (error) {
    console.error('네트워크 오류:', error);
  }
};
```

### 실시간 파일 감시 설정
```typescript
useEffect(() => {
  const eventSource = new EventSource('/api/watch');
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      case 'file-changed':
        // 파일 변경 처리
        handleFileChange(data.path);
        break;
      case 'file-created':
        // 파일 생성 처리
        handleFileCreate(data.path);
        break;
      case 'file-deleted':
        // 파일 삭제 처리
        handleFileDelete(data.path);
        break;
    }
  };
  
  eventSource.onerror = () => {
    console.error('실시간 감시 연결 실패');
  };
  
  return () => {
    eventSource.close();
  };
}, []);
```

---

## 🔧 개발자 도구

### API 테스트용 cURL 명령어

```bash
# 파일 읽기
curl -X POST http://localhost:3000/api/file \
  -H "Content-Type: application/json" \
  -d '{"action":"read","path":"README.md"}'

# 파일 쓰기
curl -X POST http://localhost:3000/api/file \
  -H "Content-Type: application/json" \
  -d '{"action":"write","path":"test.md","content":"# Test\nContent"}'

# 파일 목록
curl http://localhost:3000/api/files
```

### Postman 컬렉션 (예정)
- API 테스트를 위한 Postman 컬렉션 제공 예정

---

**더 자세한 정보는 [개발 표준 가이드](../DEVELOPMENT_STANDARDS.md)를 참조하세요.**