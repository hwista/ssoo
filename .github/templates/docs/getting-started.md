# [PROJECT_NAME] 시작하기

> 프로젝트 설정부터 첫 실행까지

---

## 사전 요구사항

- Node.js 20+
- pnpm 9+
- [기타 요구사항]

---

## 1. 프로젝트 클론

```bash
git clone https://github.com/[owner]/[repo].git
cd [repo]
```

---

## 2. 의존성 설치

```bash
pnpm install
```

---

## 3. 환경 설정

```bash
# 환경 변수 파일 복사
cp .env.example .env.local

# 필수 값 설정
# DATABASE_URL=...
# API_KEY=...
```

---

## 4. 데이터베이스 설정 (해당 시)

```bash
# 마이그레이션 실행
pnpm db:migrate

# 시드 데이터 (개발용)
pnpm db:seed
```

---

## 5. 개발 서버 실행

```bash
pnpm dev
```

- 웹: http://localhost:3000
- API: http://localhost:4000
- API 문서: http://localhost:4000/api-docs

---

## 6. 검증

```bash
# SDD Framework 검증
pnpm sdd:verify:quick

# 린트
pnpm lint

# 테스트
pnpm test
```

---

## 다음 단계

- [아키텍처 이해하기](common/architecture/)
- [개발 가이드](common/guides/)
- [API 사용법](common/reference/api/)

---

## 문제 해결

### 자주 발생하는 문제

#### pnpm install 실패
```bash
# node_modules 정리 후 재시도
pnpm clean && pnpm install
```

#### 포트 충돌
```bash
# 사용 중인 포트 확인
lsof -i :3000
```

---

## Changelog

| 날짜 | 변경 내용 |
|------|----------|
| [DATE] | 초기 버전 |
