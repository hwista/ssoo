# 🚀 배포 가이드

Markdown Wiki System의 배포 및 운영에 대한 상세한 가이드입니다.

## 📋 목차

1. [배포 환경](#-배포-환경)
2. [빌드 프로세스](#-빌드-프로세스)
3. [배포 방법](#-배포-방법)
4. [환경 설정](#-환경-설정)
5. [모니터링](#-모니터링)
6. [문제 해결](#-문제-해결)

---

## 🌍 배포 환경

### 지원하는 플랫폼

| 플랫폼 | 설명 | 추천도 |
|--------|------|--------|
| **Vercel** | Next.js에 최적화된 플랫폼 | ⭐⭐⭐⭐⭐ |
| **Netlify** | 정적 사이트 호스팅 | ⭐⭐⭐⭐ |
| **AWS** | EC2, S3, CloudFront | ⭐⭐⭐⭐ |
| **Google Cloud** | Cloud Run, App Engine | ⭐⭐⭐ |
| **Docker** | 컨테이너 기반 배포 | ⭐⭐⭐⭐ |

### 시스템 요구사항

#### 최소 요구사항
- **Node.js**: 18.17.0 이상
- **메모리**: 512MB 이상
- **디스크 공간**: 1GB 이상

#### 권장 요구사항
- **Node.js**: 20.0.0 이상
- **메모리**: 2GB 이상
- **디스크 공간**: 5GB 이상

---

## 🔨 빌드 프로세스

### 빌드 명령어

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 실행
npm start

# 타입 체크
npm run type-check

# 린트 검사
npm run lint

# 테스트 실행
npm test
```

### 빌드 최적화

#### 1. 번들 크기 최적화

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 번들 분석
  experimental: {
    bundlePagesRouterDependencies: true,
  },
  
  // 이미지 최적화
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // 압축 설정
  compress: true,
  
  // 불필요한 파일 제외
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
  },
};
```

#### 2. 코드 분할

```typescript
// 동적 임포트 사용
const TreeComponent = dynamic(() => import('@/components/TreeComponent'), {
  loading: () => <div>로딩 중...</div>,
  ssr: false
});

// 라우트 기반 분할
const WikiPage = dynamic(() => import('@/app/wiki/page'), {
  loading: () => <div>페이지 로딩 중...</div>
});
```

#### 3. 정적 자산 최적화

```typescript
// 이미지 최적화
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="로고"
  width={200}
  height={100}
  priority
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

---

## 🚀 배포 방법

### 1. Vercel 배포

#### 자동 배포 설정

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 연결
vercel link

# 배포
vercel --prod
```

#### vercel.json 설정

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["icn1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

### 2. Docker 배포

#### Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS base

# 의존성 설치 단계
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# 실행 단계
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  markdown-wiki:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    volumes:
      - ./data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### 3. AWS 배포

#### AWS App Runner

```yaml
# apprunner.yaml
version: 1.0
runtime: nodejs20
build:
  commands:
    build:
      - npm install
      - npm run build
run:
  runtime-version: 20
  command: npm start
  network:
    port: 3000
    env: PORT
  env:
    - name: NODE_ENV
      value: "production"
```

#### AWS Lambda (Serverless)

```javascript
// serverless.yml
service: markdown-wiki

provider:
  name: aws
  runtime: nodejs20.x
  region: ap-northeast-2
  stage: prod
  
functions:
  app:
    handler: lambda.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true
    timeout: 30
    memorySize: 1024

plugins:
  - serverless-nextjs-plugin
```

---

## ⚙️ 환경 설정

### 환경 변수

#### 개발 환경 (.env.local)

```bash
# 개발 설정
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API 설정
API_BASE_URL=http://localhost:3000/api
API_TIMEOUT=30000

# 파일 시스템 설정
FILES_DIRECTORY=/path/to/files
MAX_FILE_SIZE=10485760  # 10MB

# 디버그 설정
DEBUG=true
NEXT_PUBLIC_DEBUG=true
```

#### 프로덕션 환경 (.env.production)

```bash
# 프로덕션 설정
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# API 설정
API_BASE_URL=https://your-domain.com/api
API_TIMEOUT=10000

# 파일 시스템 설정
FILES_DIRECTORY=/app/data
MAX_FILE_SIZE=5242880   # 5MB

# 보안 설정
SESSION_SECRET=your-secret-key
ENCRYPTION_KEY=your-encryption-key

# 로깅 설정
LOG_LEVEL=info
LOG_FILE=/var/log/markdown-wiki.log
```

### Next.js 설정

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // 실험적 기능
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: ['fs', 'path'],
  },
  
  // 환경별 설정
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // 리다이렉트
  async redirects() {
    return [
      {
        source: '/',
        destination: '/wiki',
        permanent: true,
      },
    ];
  },
  
  // 헤더 설정
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
  
  // 출력 설정
  output: 'standalone',
  
  // 정적 자산 설정
  assetPrefix: process.env.NODE_ENV === 'production' ? '/static' : '',
};

module.exports = nextConfig;
```

---

## 📊 모니터링

### 애플리케이션 모니터링

#### 1. 헬스 체크 API

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 기본 헬스 체크
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || '1.0.0',
    };
    
    // 추가 체크 (예: 데이터베이스, 외부 서비스)
    await checkFileSystem();
    
    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error.message 
      },
      { status: 503 }
    );
  }
}

async function checkFileSystem() {
  // 파일 시스템 접근 가능성 체크
  const fs = require('fs').promises;
  await fs.access(process.env.FILES_DIRECTORY || './data');
}
```

#### 2. 성능 모니터링

```typescript
// lib/monitoring.ts
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  static getInstance() {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }
  
  measureApiResponse(endpoint: string, duration: number, statusCode: number) {
    console.log(`API ${endpoint} - ${duration}ms - ${statusCode}`);
    
    // 메트릭 수집 (예: DataDog, CloudWatch)
    if (process.env.NODE_ENV === 'production') {
      this.sendMetric('api.response_time', duration, {
        endpoint,
        status_code: statusCode.toString(),
      });
    }
  }
  
  private sendMetric(name: string, value: number, tags: Record<string, string>) {
    // 외부 모니터링 서비스로 메트릭 전송
  }
}
```

### 로깅 시스템

#### 구조화된 로깅

```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'markdown-wiki' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

#### 로그 수집 및 분석

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';

export function middleware(request: NextRequest) {
  const start = Date.now();
  
  const response = NextResponse.next();
  
  // 응답 완료 후 로깅
  response.headers.set('x-request-id', generateRequestId());
  
  // 비동기로 로그 기록
  setTimeout(() => {
    logger.info('Request completed', {
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      duration: Date.now() - start,
      statusCode: response.status,
      requestId: response.headers.get('x-request-id'),
    });
  }, 0);
  
  return response;
}

function generateRequestId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
```

---

## 🔧 문제 해결

### 일반적인 배포 문제

#### 1. 빌드 실패

**문제**: 타입 오류로 인한 빌드 실패
```bash
Error: Type error: Property 'xxx' does not exist on type 'yyy'
```

**해결방법**:
```bash
# 타입 체크 실행
npm run type-check

# 증분 빌드 비활성화
rm -rf .next
npm run build
```

#### 2. 메모리 부족

**문제**: 빌드 중 메모리 부족 오류
```bash
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**해결방법**:
```bash
# Node.js 메모리 제한 증가
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# package.json에 추가
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

#### 3. 정적 파일 경로 문제

**문제**: 정적 파일이 로드되지 않음

**해결방법**:
```javascript
// next.config.js
module.exports = {
  assetPrefix: process.env.NODE_ENV === 'production' ? '/static' : '',
  basePath: process.env.BASE_PATH || '',
};
```

### 성능 최적화

#### 1. 느린 로딩 시간

**진단**:
```bash
# 번들 분석
npm install -g @next/bundle-analyzer
ANALYZE=true npm run build
```

**최적화**:
```typescript
// 코드 분할
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false
});

// 이미지 최적화
import Image from 'next/image';
<Image src="/image.jpg" alt="" width={300} height={200} priority />
```

#### 2. API 응답 속도

**캐싱 구현**:
```typescript
// API 캐싱
export async function GET(request: Request) {
  const url = new URL(request.url);
  const cacheKey = url.pathname + url.search;
  
  // 캐시 확인
  const cached = await cache.get(cacheKey);
  if (cached) {
    return new Response(cached, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    });
  }
  
  // 데이터 처리
  const data = await processData();
  await cache.set(cacheKey, JSON.stringify(data), 3600);
  
  return NextResponse.json(data);
}
```

### 보안 설정

#### HTTPS 강제

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      }
    ];
  }
};
```

#### 환경 변수 보안

```bash
# 민감한 정보는 환경 변수로 관리
DATABASE_URL="postgresql://user:pass@host:5432/db"
JWT_SECRET="your-jwt-secret"
ENCRYPTION_KEY="your-encryption-key"

# .env.local은 .gitignore에 추가
echo ".env.local" >> .gitignore
```

---

## 📈 배포 체크리스트

### 배포 전 확인사항

- [ ] 모든 테스트 통과
- [ ] 타입 체크 통과
- [ ] 린트 규칙 준수
- [ ] 번들 크기 확인
- [ ] 환경 변수 설정
- [ ] 보안 헤더 설정
- [ ] HTTPS 설정
- [ ] 모니터링 설정
- [ ] 로깅 설정
- [ ] 백업 계획 수립

### 배포 후 확인사항

- [ ] 애플리케이션 정상 동작
- [ ] API 응답 정상
- [ ] 모든 페이지 로딩 확인
- [ ] 모바일 반응형 확인
- [ ] 성능 메트릭 확인
- [ ] 오류 로그 모니터링
- [ ] 사용자 피드백 수집

---

**추가 지원이 필요하시면 [이슈 트래커](https://github.com/your-repo/issues)에 문의해 주세요.**