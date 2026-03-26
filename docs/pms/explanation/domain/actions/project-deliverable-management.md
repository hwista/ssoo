# Action Spec — D02 산출물 업로드/교체

## 구현 상태

- 상태: ⬜ 미구현 (스펙 문서)
- 최종 검증일: 2026-02-02
- 현재 기준:
  - 산출물 관련 API/화면/서비스 전체 미구현
  - 파일 업로드 스토리지 미구현


## 1) 목적
프로젝트 산출물 파일 업로드(또는 교체)하여 storage_object_key 갱신

## 2) Actor
- 프로젝트 참여자(권한 정책 필요)

## 3) 입력
- project_id, status_code, deliverable_code
- storage_object_key, original_file_name, mime_type, file_size_bytes

## 4) DB 영향
- UPDATE pr_project_deliverable_r_m (file 메타 갱신)
- 히스토리 누적

## 5) Validation
- 해당 (project_id, status_code, deliverable_code) row 존재
- 스토리지 업로드 성공 후에만 key 기록


# Action Spec — D03 산출물 제출 상태 변경(3단계)

## 1) 목적
산출물 제출 진행을 상태로 관리
- before_submit → submitted → confirmed

## 2) Actor
- PM/담당자(정책), confirmed는 PM 또는 AM 승인 가능 등 역할 정책 가능

## 3) 입력
- project_id, status_code, deliverable_code
- submission_status_code in {before_submit, submitted, confirmed}

## 4) DB 영향
- UPDATE pr_project_deliverable_r_m.submission_status_code
- submitted_at/submitted_by는 submitted 이상에서 기록 권장
- 히스토리 누적

## 5) Validation(권장)
- submitted 이상으로 갈 때 storage_object_key 존재 여부 검증(파일 없이 제출 방지)
- confirmed는 submitted 이후로만 가능

## Changelog

| Date | Change |
|------|--------|
| 2026-02-09 | Add changelog section. |

