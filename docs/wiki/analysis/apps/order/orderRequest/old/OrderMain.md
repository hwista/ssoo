# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-17
- **분석자:** GitHub Copilot
- **분석 대상 소스:** OrderMain.vue, OrderBody.vue, OrderHeader.vue, OrderLayout.vue

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 주문 메인 | OrderMain | 컴포넌트 마운트 | mounted() | fetchCreditLimit | OrderMain.vue |
| 주문 메인 | OrderMain | 공지사항 팝업 닫기 | closeNoticePopup() | - | OrderMain.vue |
| 주문 메인 | OrderMain | 공지사항 오늘하루닫기 | closeNoticePopupToday() | - | OrderMain.vue |
| 주문 메인 | OrderMain | 휴일 팝업 닫기 | closeHolidayPopup() | - | OrderMain.vue |
| 주문 메인 | OrderMain | 휴일 오늘하루닫기 | closeHolidayPopupToday() | - | OrderMain.vue |
| 주문 레이아웃 | OrderLayout | 탭 버튼 클릭 | onClickTabButton() | - | OrderLayout.vue |
| 주문 헤더 | OrderHeader | 숫자 포맷팅 | getFormattedNumber() | - | OrderHeader.vue |
| 주문 헤더 | OrderHeader | 월 계산 | getNowMonth(), getNextMonth() | - | OrderHeader.vue |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| OrderMain | OrderMain.vue | 주문 화면 구성, 데이터 로딩, 팝업 관리 | mounted(), residualQuantity | fetchCreditLimit, getPartnerEstimatedQuantity, getDeliveryCopperQuantity, getSalesEstimatedQuantity | Vuex → 하위 컴포넌트 |
| OrderHeader | OrderHeader.vue | 여신정보/구리정보 표시, 사용자 정보 표시 | residualCredit, isLimitOver | - | OrderMain → OrderHeader |
| OrderBody | OrderBody.vue | 권한 기반 컴포넌트 분기 | - | - | OrderMain → OrderBody → 권한별 컴포넌트 |
| OrderLayout | OrderLayout.vue | 파트너용 탭 레이아웃, 탭 전환 | onClickTabButton | - | OrderBody → OrderLayout → 탭별 컴포넌트 |

## 2. 권한 및 기능 분기 분석

### 2.1 권한별 컴포넌트 분기 (OrderBody)

| 권한/조건 | 렌더링 컴포넌트 | 분기 조건 | 데이터 소스 |
|----------|----------------|-----------|------------|
| 파트너 & 유통배선 | OrderHistoryPartner | isAuthorityPartner && isDistributionCable | Vuex Getters |
| 파트너 & !유통배선 | OrderLayout | isAuthorityPartner && !isDistributionCable | Vuex Getters |
| 영업 & 구리봉 | OrderHistoryCopperRodSales | !isAuthorityPartner && isCopperRod | Vuex Getters |
| 영업 & !구리봉 | OrderHistorySales | !isAuthorityPartner && !isCopperRod | Vuex Getters |

### 2.2 파트너용 탭 구성 (OrderLayout)

| 탭 인덱스 | 컴포넌트 | 탭 이름 | 분기 조건 |
|----------|----------|--------|----------|
| 0 | OrderHistoryPartner | 주문내역 | selectedTabIndex === 0 |
| 1 | NoShipment | 미출하목록/주문확정목록 | selectedTabIndex === 1, isCopperRod 조건부 이름 변경 |
| 2 | DeliveredShipment | 출하목록 | selectedTabIndex === 2 |

### 2.3 UI 조건부 표시 (OrderHeader)

| UI 영역 | 표시 조건 | 분기 로직 |
|--------|----------|----------|
| 여신정보 | 경로가 '/order'로 끝나고, 특정 팀(IndustrialDevice, Tube, StructuredCable)이며, 파트너 권한일 때 | this.$route.path.endsWith('/order') && (팀 조건) && this.isAuthorityPartner |
| 구리정보 | 경로가 '/order'로 끝나고, 팀이 CopperRod일 때 | this.$route.path.endsWith('/order') && this.currentTeam === TEAM.CopperRod |

## 3. 데이터 흐름 분석

### 3.1 데이터 로딩 및 계산

| 데이터 | 로딩 함수 | 계산식 | 사용 컴포넌트 |
|-------|----------|-------|--------------|
| 여신한도 | fetchCreditLimit | - | OrderHeader |
| 고객 예상량 | getPartnerEstimatedQuantity("0") | - | OrderHeader |
| 고객 계획량 | getPartnerEstimatedQuantity("1") | - | OrderHeader |
| 고객 출하량 | getDeliveryCopperQuantity("0") | - | OrderHeader |
| 영업 예상량 | getSalesEstimatedQuantity("0") | - | OrderHeader |
| 영업 계획량 | getSalesEstimatedQuantity("1") | - | OrderHeader |
| 고객 잔여량 | residualQuantity() | currentQuantity - (deliveryQuantity / 1000) | OrderHeader |
| 영업 잔여량 | salesResidualQuantity() | salesCurrentQuantity - (deliveryQuantity / 1000) | OrderHeader |
| 여신잔액 | residualCredit() | credit - usedCredit - requestedTotalOrderPriceWithVat | OrderHeader |
| 여신초과여부 | isLimitOver() | residualCredit < 0 | OrderHeader |

### 3.2 팝업 관리 로직

| 팝업 종류 | 표시 조건 | 저장소 | 함수 |
|----------|----------|--------|------|
| 공지사항 | isCopperRod && isAuthorityPartner && isPopupYn && !hideNoticePopup && !String(loginId).startsWith('6') | localStorage, sessionStorage | checkPopupExpiration(), closeNoticePopup(), closeNoticePopupToday() |
| 휴일안내 | isCopperRod && isAuthorityPartner && isPopupYn && !hideHolidayPopup && !String(loginId).startsWith('6') | localStorage, sessionStorage | checkHolidayPopupExpiration(), closeHolidayPopup(), closeHolidayPopupToday() |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 권한 기반 분기 로직이 컴포넌트 내에 복잡하게 구현되어 있음
- 팝업 관련 중복 코드(Notice/Holiday)가 동일한 패턴으로 반복됨
- 공지사항 텍스트가 컴포넌트 내에 하드코딩되어 있음
- 연속적인 API 호출로 초기 로딩 시간이 길어질 수 있음
- OrderHeader 내에서 여신정보와 구리정보를 조건부로 표시하여 단일 책임 원칙에 위배됨
- localStorage/sessionStorage 관리 로직이 여러 메서드에 분산되어 있음

### 4.2 개선 요구사항
- 권한 및 UI 분기 로직을 중앙 관리하는 서비스 도입
- 팝업 관리 로직을 재사용 가능한 믹스인이나 컴포넌트로 추출
- 공지사항 및 메시지를 외부 설정이나 API로 관리하도록 변경
- API 호출을 병렬화하여 로딩 성능 개선
- OrderHeader를 기능별로 분리(여신정보, 구리정보)하여 단일 책임 원칙 준수
- 저장소(localStorage/sessionStorage) 접근을 추상화하는 유틸리티 서비스 구현

## 5. 핵심 비즈니스 로직

### 5.1 권한 분기 로직
```javascript
// OrderBody.vue의 핵심 분기 로직
<template v-if="isAuthorityPartner">
  <order-history-partner v-if="isDistributionCable" />
  <order-layout v-else />
</template>
<template v-else>
  <order-history-copper-rod-sales v-if="isCopperRod" />
  <order-history-sales v-else />
</template>
```

### 5.2 팝업 표시 로직
```javascript
// OrderMain.vue의 팝업 표시 로직
if (this.isCopperRod && this.isAuthorityPartner && isPopupYn && !this.hideNoticePopup && !String(this.loginId).startsWith('6')){
  this.showNoticePopup = true;
}
```

### 5.3 여신 및 수량 계산 로직
```javascript
// 여신잔액 계산
residualCredit() {
  return this.credit - this.usedCredit - this.requestedTotalOrderPriceWithVat;
}

// 잔여수량 계산
residualQuantity() {
  return this.currentQuantity - (this.deliveryQuantity / 1000);
}
```

이 분석을 통해 프로젝트의 복잡한 권한 기반 UI 구조와 컴포넌트 간의 데이터 흐름을 파악할 수 있으며, 개선 가능한 여러 영역을 식별할 수 있습니다.