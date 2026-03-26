# Migration Scripts Archive (2026-01-23)

> 📍 원본 위치: `packages/database/scripts/migration/`  
> 📍 아카이브 일자: 2026-01-23  
> 📍 아카이브 사유: 멀티스키마 분리 완료 후 이력 보존

이 폴더는 **PostgreSQL 멀티 스키마 분리 마이그레이션** 과정에서 사용된 스크립트들의 아카이브입니다.

## 아카이브 사유

- 원본 트리거/시드 파일에 명시적 스키마 prefix가 적용됨
- Fresh 배포 시 `db push`가 스키마를 자동 생성함
- 기존 DB 마이그레이션 완료 후 해당 스크립트들은 **이력 보존** 목적으로만 유지

## 파일 설명

| 파일 | 설명 |
|------|------|
| `01_create_schemas.sql` | `common`, `pms`, `dms` 스키마 생성 |
| `02_migrate_tables.sql` | 기존 테이블을 적절한 스키마로 이동 |
| `03_update_triggers.sql` | 트리거 함수에 스키마 prefix 적용 |
| `04_refine_schema_separation.sql` | User 관련 테이블을 common 스키마로 최종 정리 |

## 참고

- 현재 트리거/시드 파일들은 `prisma/triggers/`, `prisma/seeds/`에 **최신 상태**로 유지됨
- 이 스크립트들은 **재실행 금지** (이미 적용된 기존 DB에 다시 실행하면 오류 발생)
