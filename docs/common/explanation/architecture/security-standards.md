# 웹 시스템 보안 표준 가이드

> 최종 업데이트: 2026-02-03

상용 웹 서비스 운영 시 준수해야 할 보안/인증 표준 체크리스트입니다.

---

## 1. 인증 (Authentication)

| 항목 | 설명 | 구현 방법 | 상태 |
|------|------|----------|------|
| **비밀번호 정책** | 최소 8자, 대소문자+숫자+특수문자 조합 | Zod 스키마, DB 제약 | 🔲 |
| **비밀번호 암호화** | bcrypt/argon2 해싱 (salt 포함) | bcrypt.hash() | ✅ |
| **로그인 실패 제한** | 5회 실패 시 계정 잠금 (30분) | cm_user.login_fail_count, locked_until | ✅ |
| **세션/토큰 만료** | Access 15분, Refresh 7일 | JWT expiresIn | ✅ |
| **다중 인증 (MFA)** | OTP, SMS, 이메일 2차 인증 | TOTP 라이브러리 | 🔲 |
| **자동 로그아웃** | 유휴 시간 초과 시 자동 로그아웃 (30분) | 클라이언트 타이머 | 🔲 |
| **비밀번호 변경 주기** | 90일마다 변경 권고/강제 | password_changed_at 필드 | 🔲 |
| **이전 비밀번호 재사용 금지** | 최근 5개 비밀번호 사용 불가 | password_history 테이블 | 🔲 |

### 구현 예시: 비밀번호 정책

```typescript
// lib/validations/auth.ts
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const passwordSchema = z.string()
  .min(8, '비밀번호는 8자 이상이어야 합니다.')
  .max(100, '비밀번호는 100자 이하여야 합니다.')
  .regex(passwordRegex, '비밀번호는 대소문자, 숫자, 특수문자를 포함해야 합니다.');
```

---

## 2. 인가 (Authorization)

| 항목 | 설명 | 구현 방법 | 상태 |
|------|------|----------|------|
| **역할 기반 접근 제어 (RBAC)** | 역할별 메뉴/기능 권한 | cm_role_menu_r, Guards | ✅ |
| **API 권한 검사** | 백엔드 Guard로 권한 체크 | @UseGuards(RolesGuard) | ⚠️ |
| **리소스 소유권 검증** | 본인 데이터만 접근 가능 | WHERE user_id = :currentUserId | 🔲 |
| **수직적 권한 상승 방지** | 일반 사용자가 관리자 기능 접근 차단 | @Roles('admin') | ⚠️ |
| **수평적 권한 상승 방지** | 다른 사용자 데이터 접근 차단 | 소유권 검증 미들웨어 | 🔲 |

### 구현 예시: Roles Guard

```typescript
// auth/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.roleCode);
  }
}
```

---

## 3. 데이터 보호

| 항목 | 설명 | 구현 방법 | 상태 |
|------|------|----------|------|
| **HTTPS 강제** | TLS 1.2+ 암호화 통신 | Nginx/Load Balancer SSL | 🔲 |
| **민감정보 암호화** | 개인정보, 카드번호 등 DB 암호화 | pgcrypto, 앱 레벨 암호화 | 🔲 |
| **데이터 마스킹** | 주민번호, 전화번호 UI 마스킹 | 마스킹 유틸 함수 | 🔲 |
| **SQL Injection 방지** | Prepared Statement, ORM 사용 | Prisma ORM | ✅ |
| **개인정보 접근 로깅** | 누가 언제 어떤 개인정보 조회 | audit_log 테이블 | 🔲 |

### 구현 예시: 데이터 마스킹

```typescript
// lib/utils/masking.ts
export const maskPhone = (phone: string) => 
  phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');

export const maskEmail = (email: string) => {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
};

export const maskResidentNumber = (rn: string) => 
  rn.replace(/(\d{6})-(\d{7})/, '$1-*******');
```

---

## 4. 입력 검증 & XSS/CSRF

| 항목 | 설명 | 구현 방법 | 상태 |
|------|------|----------|------|
| **서버 측 입력 검증** | DTO Validation | class-validator | ✅ |
| **클라이언트 측 검증** | Form Validation | React Hook Form + Zod | ✅ |
| **XSS 방지** | 출력 인코딩, CSP 헤더 | React 자동 이스케이프, helmet | ⚠️ |
| **CSRF 방지** | CSRF 토큰 또는 SameSite Cookie | csurf 미들웨어 | 🔲 |
| **파일 업로드 검증** | 확장자, 크기, 내용 검사 | multer + 커스텀 필터 | 🔲 |

### 구현 예시: CSRF 보호 (NestJS)

```typescript
// main.ts
import * as csurf from 'csurf';

app.use(csurf({ cookie: { sameSite: 'strict', secure: true } }));
```

---

## 5. API 보안

| 항목 | 설명 | 구현 방법 | 상태 |
|------|------|----------|------|
| **Rate Limiting** | IP/사용자별 요청 횟수 제한 | @nestjs/throttler | ✅ |
| **CORS 설정** | 허용 Origin 제한 | app.enableCors({ origin }) | ✅ |
| **API 버전 관리** | /api/... 형식 | setGlobalPrefix('api') | ✅ |
| **요청 크기 제한** | Body 크기 제한 (예: 10MB) | bodyParser.limit | ⚠️ |
| **민감정보 응답 제외** | 비밀번호 해시 등 응답에서 제외 | @Exclude() 데코레이터 | ✅ |

### 구현 예시: Rate Limiting

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,  // 1분
      limit: 100,  // 100회
    }]),
  ],
})
export class AppModule {}
```

---

## 6. 세션 관리

| 항목 | 설명 | 구현 방법 | 상태 |
|------|------|----------|------|
| **토큰 저장 위치** | httpOnly Cookie 권장 | Set-Cookie 헤더 | ⚠️ localStorage |
| **토큰 갱신 전략** | Refresh Token Rotation | 갱신 시 새 RT 발급 | ✅ |
| **동시 세션 제한** | 중복 로그인 방지 (선택) | Redis 세션 관리 | 🔲 |
| **강제 로그아웃** | 관리자가 특정 사용자 세션 종료 | RT 무효화 API | 🔲 |
| **로그아웃 시 토큰 무효화** | 서버 측 RT 삭제 | clearRefreshToken() | ✅ |

### 토큰 저장 위치 비교

| 저장 위치 | XSS | CSRF | 탭 간 공유 | 권장 |
|----------|-----|------|-----------|------|
| localStorage | ❌ 취약 | ✅ 안전 | ✅ | 개발용 |
| httpOnly Cookie | ✅ 안전 | ❌ 취약 | ✅ | 운영용 (CSRF 토큰 필수) |
| Memory (변수) | ✅ 안전 | ✅ 안전 | ❌ | 고보안 |

---

## 7. 로깅 & 모니터링

| 항목 | 설명 | 구현 방법 | 상태 |
|------|------|----------|------|
| **인증 이벤트 로깅** | 로그인/로그아웃/실패 기록 | auth_log 테이블 | ⚠️ |
| **API 요청 로깅** | 요청/응답 로그 (민감정보 제외) | Morgan, Winston | 🔲 |
| **에러 로깅** | 구조화된 에러 로그 | Exception Filter | ⚠️ |
| **접근 로그** | 누가 언제 어떤 기능 사용 | access_log 테이블 | 🔲 |
| **이상 탐지** | 비정상 패턴 알림 | 알림 서비스 연동 | 🔲 |

### 로그 저장 기간 권장

| 로그 유형 | 보존 기간 | 비고 |
|----------|----------|------|
| 인증 로그 | 1년 | 법적 요구사항 |
| API 요청 로그 | 3개월 | 디버깅용 |
| 에러 로그 | 6개월 | 장애 분석용 |
| 개인정보 접근 로그 | 3년 | 개인정보보호법 |

---

## 8. 보안 헤더

| 헤더 | 값 | 설명 | 상태 |
|------|---|------|------|
| **Strict-Transport-Security** | max-age=31536000; includeSubDomains | HTTPS 강제 | 🔲 |
| **X-Content-Type-Options** | nosniff | MIME 스니핑 방지 | 🔲 |
| **X-Frame-Options** | DENY | Clickjacking 방지 | 🔲 |
| **Content-Security-Policy** | default-src 'self' | XSS 방지 | 🔲 |
| **X-XSS-Protection** | 1; mode=block | 브라우저 XSS 필터 | 🔲 |
| **Referrer-Policy** | strict-origin-when-cross-origin | Referrer 정보 제한 | 🔲 |

### 구현 예시: Helmet.js

```typescript
// main.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

---

## 9. 개인정보보호 (GDPR/개인정보보호법)

| 항목 | 설명 | 구현 방법 | 상태 |
|------|------|----------|------|
| **개인정보 수집 동의** | 약관 동의 UI | 회원가입 시 체크박스 | 🔲 |
| **개인정보 열람/삭제 요청** | 사용자 셀프 서비스 | 마이페이지 기능 | 🔲 |
| **데이터 보유 기한** | 기한 경과 시 자동 삭제/익명화 | 배치 작업 | 🔲 |
| **개인정보 영향평가** | 고위험 처리 시 평가 수행 | 문서화 | 🔲 |
| **개인정보 처리방침** | 웹사이트 공개 | 정적 페이지 | 🔲 |

---

## 10. 인프라 보안 (운영 환경)

| 항목 | 설명 | 권장 도구/서비스 |
|------|------|----------------|
| **방화벽** | 필요한 포트만 오픈 | AWS Security Group, Azure NSG |
| **WAF** | SQL Injection, XSS 등 차단 | AWS WAF, CloudFlare |
| **DDoS 방어** | 대용량 트래픽 공격 방어 | CloudFlare, AWS Shield |
| **SSL 인증서** | HTTPS 암호화 | Let's Encrypt, ACM |
| **비밀 관리** | 환경변수, API Key 관리 | AWS Secrets Manager, Vault |
| **취약점 스캔** | 정기적 보안 스캔 | OWASP ZAP, Nessus |
| **컨테이너 보안** | 이미지 스캔 | Trivy, Snyk |

---

## 상태 범례

| 표시 | 의미 |
|------|------|
| ✅ | 구현 완료 |
| ⚠️ | 부분 구현 또는 개선 필요 |
| 🔲 | 미구현 (TODO) |

---

## 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [개인정보보호법](https://www.law.go.kr/법령/개인정보보호법)
- [KISA 보안 가이드](https://www.kisa.or.kr/)

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

