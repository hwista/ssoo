# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-21
- **분석자:** GitHub Copilot
- **분석 대상 소스:** 고객 다음달 주문 계획 입력 프로세스 관련 코드

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 헤더 영역 | 사용자 정보 버튼 | 설정 버튼 클릭 | onClickSettingPartnerButton() | GET /partner/estimated-quantity/{month} | TheUserInformation.vue |
| 계획량 설정 팝업 | 폼 입력 | 입력 값 변경 | v-model 바인딩 | - | BaseAdminUserPartnerModifyDialogConfirm.vue |
| 계획량 설정 팝업 | 확인 버튼 | 버튼 클릭 | onClickOk() | POST /partner/estimated-quantity | BaseAdminUserPartnerModifyDialogConfirm.vue |
| 헤더 영역 | 계획량 표시 | 페이지 로드 | getNextMonth() | - | OrderHeader.vue |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| TheUserInformation | TheUserInformation.vue | 사용자 정보 및 팝업 관리 | onClickSettingPartnerButton(), savePartnerEstimatedQuantity() | GET/POST /partner/estimated-quantity | 사용자 액션 → API 호출 → Vuex 상태 업데이트 → 알림 표시 |
| AdminUserPartnerModifyDialogConfirm | AdminUserPartnerModifyDialogConfirm.vue | 계획량 입력 다이얼로그 래퍼 | onClickOk() | - | 부모로부터 데이터 수신 → 자식 컴포넌트에 전달 → 이벤트 전파 |
| BaseAdminUserPartnerModifyDialogConfirm | BaseAdminUserPartnerModifyDialogConfirm.vue | 계획량 입력 폼 | localTotalPlanQuantity(), onClickOk() | - | 입력 폼 → 데이터 계산 → 이벤트 전파 |
| OrderHeader | OrderHeader.vue | 여신/구리 정보 표시 | getNextMonth(), getFormattedNumber() | - | Vuex 상태 → 화면 표시 |

## 2. 백엔드 분석

### 2.1 API 및 컨트롤러

| 엔드포인트 | 메소드 | 컨트롤러 | 핵심 로직 | 호출 서비스 | 응답 형식 |
|-----------|-------|----------|----------|------------|----------|
| /api/v1/partner/estimated-quantity/{month} | GET | PartnerEstimatedQuantityController | 월별 예상량 조회 | partnerEstimateQuantityService.getPartnerEstimatedQuantityById() | PartnerEstimatedQuantityResponse |
| /api/v1/partner/estimated-quantity | POST | PartnerEstimatedQuantityController | 예상량 저장 | partnerEstimateQuantityService.savePartnerEstimatedQuantity() | PartnerEstimatedQuantityResponse |

### 2.2 서비스 레이어

| 서비스 클래스 | 메소드 | 기능 설명 | 호출 레포지토리 | DB 작업 | 참조 파일 |
|--------------|-------|----------|---------------|---------|----------|
| PartnerEstimateQuantityService | getPartnerEstimatedQuantityById | 특정 월/사용자의 계획량 조회 | partnerEstimatedQuantityRepository.findByMonthAndUserId | SELECT | PartnerEstimateQuantityService.java |
| PartnerEstimateQuantityService | savePartnerEstimatedQuantity | 계획량 저장 | partnerEstimatedQuantityRepository.save | INSERT/UPDATE | PartnerEstimateQuantityService.java |

### 2.3 로직 흐름도

파트너 예상량 설정 프로세스:
1. 프론트엔드: TheUserInformation → `onClickSettingPartnerButton()` → `getPartnerEstimatedQuantity()`
2. API 호출: estimated-quantity-service.js → `GET /api/v1/partner/estimated-quantity/{month}`
3. 백엔드: PartnerEstimatedQuantityController.getPartnerEstimatedQuantityByUserId() → PartnerEstimateQuantityService.getPartnerEstimatedQuantityById()
4. DB: partner_estimated_quantity 테이블 조회 → 결과 반환
5. 다이얼로그 표시: BaseAdminUserPartnerModifyDialogConfirm에 데이터 바인딩
6. 사용자 입력: 일반/수탁 계획량 입력 → 합계 자동 계산
7. 저장 버튼 클릭: `onClickOk()` → `savePartnerEstimatedQuantity()` → changePartnerEstimatedQuantity 액션
8. API 호출: estimated-quantity-service.js → `POST /api/v1/partner/estimated-quantity`
9. 백엔드: PartnerEstimatedQuantityController.savePartnerEstimatedQuantity() → PartnerEstimateQuantityService.savePartnerEstimatedQuantity()
10. DB: partner_estimated_quantity 테이블 저장 → 결과 반환
11. 상태 업데이트: Vuex store (estimated-quantity.js)에 결과 반영
12. 알림 표시: "계획량이 수정되었습니다."

## 3. 데이터베이스 분석

### 3.1 주요 테이블

| 테이블명 | 주요 컬럼 | 역할 | 관계 테이블 | 인덱스 |
|---------|----------|------|------------|--------|
| partner_estimated_quantity | month, user_id, quantity, modify_date, next_normal_plan_quantity, next_consign_plan_quantity, modifier | 파트너별 월간 예상량 저장 | - | (month, user_id) 복합키 |

### 3.2 데이터 흐름

| 기능 | 시작점 | 데이터 흐름 | 변경/조회 테이블 | 결과 |
|------|-------|------------|-----------------|------|
| 예상량 조회 | 설정 버튼 클릭 | 프론트 → API → DB → 응답 → 다이얼로그 | partner_estimated_quantity(조회) | 예상량 폼에 표시 |
| 예상량 저장 | 확인 버튼 클릭 | 입력 폼 → API 요청 → DB → 응답 → Vuex 상태 업데이트 | partner_estimated_quantity(저장) | 알림 표시, 상태 업데이트 |
| 예상량 표시 | 화면 로드 | Vuex → OrderHeader 컴포넌트 | - | 헤더에 예상량 표시 |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 일반/수탁 계획량 입력 UI가 단순하고 설명이 부족하여 사용자 혼란 가능성
- 다이얼로그에서 현재 월과 다음 월의 데이터를 명확히 구분하지 않음
- 입력된 계획량의 유효성 검증 로직이 프론트엔드에만 있어 백엔드 검증 부재
- 과거 계획량 이력을 조회할 수 없어 추세 분석이 어려움
- 월별 계획량의 통계/분석 기능이 없어 관리 효율성 저하
- 사용자별 설정이 수동으로 이루어져 대량 등록 기능 부재

### 4.2 개선 요구사항
- 계획량 입력 UI를 개선하여 일반/수탁 항목에 대한 명확한 설명과 툴팁 제공
- 현재 월과 다음 월 데이터를 구분하여 표시하고 월간 변동 추이를 시각화
- 백엔드 검증 로직 추가 및 예외 처리 강화
- 계획량 이력 조회 및 추세 분석 기능 추가
- 월별 계획량의 통계 리포트 기능 개발
- 엑셀 업로드를 통한 다수 파트너 계획량 일괄 등록 기능 추가
- 관리자용 대시보드에 전체 파트너 계획량 현황 및 집계 기능 추가

## 5. 구현 세부 사항

주요 개선 항목에 대한 구체적 구현 방안:

1. **계획량 입력 UI 개선**
```javascript
// BaseAdminUserPartnerModifyDialogConfirm.vue 수정
<template>
  <!-- ... 기존 코드 ... -->
  <div class="form-input">
    <p class="form-input__label">다음달 계획량</p>
    <div class="form-input__quantity">
      <base-form-input-numeric              
        v-model="localNormalQuantity"              
        placeholder="0"
        :required="false"
        :min-value="0"
        :max-value="999999999"
        :should-be-validated="false"
      />
      <tooltip-icon 
        tooltip-text="일반 계약에 따른 다음 달 주문 계획량을 입력하세요"
      />           
    </div>
    <!-- ... 수탁 계획량 입력 필드 ... -->
  </div>
  <!-- ... 기존 코드 ... -->
</template>
```

2. **백엔드 검증 로직 추가**
```java
// PartnerEstimateQuantityService.java 수정
@Transactional
public PartnerEstimatedQuantity savePartnerEstimatedQuantity(String month, String userId, 
    double quantity, double normalQuantity, double consignQuantity, String modifier) {
    
    // 유효성 검증
    if (quantity < 0 || normalQuantity < 0 || consignQuantity < 0) {
        throw new IllegalArgumentException("수량은 0 이상이어야 합니다.");
    }
    
    if (Math.abs(quantity - (normalQuantity + consignQuantity)) > 0.001) {
        throw new IllegalArgumentException("총 수량과 일반/수탁 수량의 합이 일치하지 않습니다.");
    }
    
    // 이후 기존 로직
    PartnerEstimatedQuantity partnerEstimatedQuantity = new PartnerEstimatedQuantity();
    // ...
}
```

3. **계획량 이력 조회 기능 추가**
```java
// PartnerEstimatedQuantityController.java 추가
@GetMapping("/history/{userId}")
public List<PartnerEstimatedQuantityResponse> getPartnerEstimatedQuantityHistory(
        @PathVariable String userId,
        @RequestParam(required = false) String startMonth,
        @RequestParam(required = false) String endMonth) {
    
    List<PartnerEstimatedQuantity> history = partnerEstimateQuantityService
        .getHistoryByUserId(userId, startMonth, endMonth);
    
    return history.stream()
        .map(item -> modelMapper.map(item, PartnerEstimatedQuantityResponse.class))
        .collect(Collectors.toList());
}
```

이러한 개선사항들을 통해 사용자 경험을 향상시키고, 데이터 정확성을 높이며, 관리 효율성을 개선할 수 있습니다.