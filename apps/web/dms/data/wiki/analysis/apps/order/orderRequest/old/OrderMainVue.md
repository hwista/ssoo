# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-17
- **분석자:** GitHub Copilot
- **분석 대상 소스:** OrderMain.vue, OrderHeader.vue, OrderBody.vue, OrderLayout.vue

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 주문 메인 | OrderMain | 컴포넌트 마운트 | mounted() | fetchCreditLimit, getPartnerEstimatedQuantity 등 | OrderMain.vue |
| 주문 메인 | OrderHeader | 여신정보 계산 | residualCredit, isLimitOver | - | OrderHeader.vue |
| 주문 메인 | OrderBody | 권한별 컴포넌트 렌더링 | - | - | OrderBody.vue |
| 주문 레이아웃(파트너) | OrderLayout | 탭 버튼 클릭 | onClickTabButton | - | OrderLayout.vue |
| 주문 내역 | OrderHistoryPartner | 컴포넌트 표시 | - | - | OrderHistoryPartner.vue |
| 미출하/주문확정 목록 | NoShipment | 컴포넌트 표시 | - | - | NoShippedOrderHistory.vue |
| 출하 목록 | DeliveredShipment | 컴포넌트 표시 | - | - | DeliveredShipment.vue |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| OrderMain | OrderMain.vue | 주문 화면 구성, 데이터 로딩 | mounted(), checkPopupExpiration | fetchCreditLimit, get*EstimatedQuantity | Vuex → 하위 컴포넌트 |
| OrderHeader | OrderHeader.vue | 여신/구리 정보 표시 | getFormattedNumber, getNowMonth | - | OrderMain → OrderHeader |
| OrderBody | OrderBody.vue | 권한별 컴포넌트 분기 | - | - | OrderMain → OrderBody → 권한별 컴포넌트 |
| OrderLayout | OrderLayout.vue | 파트너용 탭 레이아웃 | onClickTabButton | - | OrderBody → OrderLayout → 탭별 컴포넌트 |

## 2. 권한 및 컴포넌트 분기 구조

### 2.1 첫 번째 분기 (OrderBody)

| 권한/조건 | 렌더링 컴포넌트 | 분기 조건식 | 파일 |
|----------|----------------|------------|------|
| 파트너 & 유통배선 | OrderHistoryPartner | isAuthorityPartner && isDistributionCable | OrderBody.vue |
| 파트너 & !유통배선 | OrderLayout | isAuthorityPartner && !isDistributionCable | OrderBody.vue |
| 영업 & 구리봉 | OrderHistoryCopperRodSales | !isAuthorityPartner && isCopperRod | OrderBody.vue |
| 영업 & !구리봉 | OrderHistorySales | !isAuthorityPartner && !isCopperRod | OrderBody.vue |

### 2.2 두 번째 분기 (OrderLayout - 파트너용 탭)

| 탭 인덱스 | 컴포넌트 | 탭 이름 | 조건 | 파일 |
|----------|----------|--------|------|------|
| 0 | OrderHistoryPartner | 주문내역 | v-show="selectedTabIndex === 0" | OrderLayout.vue |
| 1 | NoShipment | 미출하목록/주문확정목록 | v-show="selectedTabIndex === 1", isCopperRod ? '주문확정목록' : '미출하목록' | OrderLayout.vue |
| 2 | DeliveredShipment | 출하목록 | v-show="selectedTabIndex === 2" | OrderLayout.vue |

## 3. 데이터 흐름 분석

### 3.1 데이터 로딩 및 전파

| 단계 | 컴포넌트/함수 | 데이터 | 목적지 | 비고 |
|-----|--------------|--------|--------|------|
| 1 | OrderMain/mounted | fetchCreditLimit | Vuex store | 여신한도 정보 |
| 2 | OrderMain/mounted | getPartnerEstimatedQuantity | Vuex store | 파트너 예상량(현재/다음달) |
| 3 | OrderMain/mounted | getDeliveryCopperQuantity | Vuex store | 출하량 |
| 4 | OrderMain/mounted | getSalesEstimatedQuantity | Vuex store | 영업 예상량(현재/다음달) |
| 5 | OrderMain/computed | residualQuantity | OrderHeader | 잔여량 계산 |
| 6 | OrderHeader/computed | residualCredit | UI 표시 | 여신잔액 계산 |
| 7 | OrderHeader/computed | isLimitOver | UI 표시 | 여신초과 판단 |

### 3.2 권한에 따른 데이터 표시 분기

| 영역 | 파트너(고객)용 | 영업용 | 분기 조건 | 파일 |
|-----|--------------|-------|----------|------|
| 예상량 | estimatedQuantity | salesEstimatedQuantity | isAuthorityPartner | OrderHeader.vue |
| 출고량 | deliveryQuantity/1000 | salesDeliveryQuantity/1000 | isAuthorityPartner | OrderHeader.vue |
| 잔량 | residualQuantity | salesResidualQuantity | isAuthorityPartner | OrderHeader.vue |
| 계획량 | nextEstimatedQuantity | salesNextEstimatedQuantity | isAuthorityPartner | OrderHeader.vue |

### 3.3 조건부 UI 표시

| UI 요소 | 표시 조건 | 파일 |
|--------|----------|------|
| 여신정보 | this.$route.path.endsWith('/order') && (this.currentTeam === TEAM.IndustrialDevice ‖ this.currentTeam === TEAM.Tube ‖ this.currentTeam === TEAM.StructuredCable) && this.isAuthorityPartner | OrderHeader.vue |
| 구리정보 | this.$route.path.endsWith('/order') && this.currentTeam === TEAM.CopperRod | OrderHeader.vue |
| 미출하/주문확정 탭 이름 | this.isCopperRod ? '주문확정목록' : '미출하목록' | OrderLayout.vue |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 복잡한 권한 기반 분기 로직이 여러 컴포넌트에 분산됨
- 하나의 컴포넌트(OrderHeader)가 두 가지 기능(여신정보/구리정보)을 처리
- 여러 비슷한 형태의 데이터(파트너용/영업용)가 병렬로 관리되어 중복 코드 발생
- 조건부 렌더링과 분기 로직이 너무 많아 유지보수가 어려움
- TabButton 컴포넌트 내 하드코딩된 탭 이름들

### 4.2 개선 요구사항
- 권한 기반 분기 로직을 중앙 관리하는 서비스 또는 믹스인 도입
- OrderHeader를 CreditInfoHeader와 CopperInfoHeader로 분리하여 단일 책임 원칙 적용
- 파트너/영업 데이터 구조 통합 및 타입 기반 확장
- 컴포넌트 Tree 구조 단순화 및 재사용성 증대
- 탭 메뉴 및 라벨 관리를 설정 파일로 분리

## 5. 핵심 비즈니스 로직

### 5.1 권한 판단 및 컴포넌트 분기
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

### 5.2 파트너용 탭 구조
```javascript
// OrderLayout.vue의 탭 구성 로직
tabItems() {
  return this.isAuthorityPartner
    ? [
      { leftText: '주문내역' },
      { leftText: this.isCopperRod ? '주문확정목록' : '미출하목록' },
      { leftText: '출하목록' },
    ]
    : [];
}
```

### 5.3 주요 데이터 계산 로직
```javascript
// OrderHeader.vue의 잔여 여신 계산
residualCredit() {
  return this.credit - this.usedCredit - this.requestedTotalOrderPriceWithVat;
}

// OrderMain.vue의 잔여 수량 계산
residualQuantity() {
  return this.currentQuantity - (this.deliveryQuantity / 1000);
}

// OrderMain.vue의 영업 잔여 수량 계산
salesResidualQuantity() {
  return this.salesCurrentQuantity - (this.deliveryQuantity / 1000);
}
```

이 분석 결과는 프로젝트의 복잡한 권한 기반 분기 구조와 UI 구성을 이해하는데 도움이 되며, 향후 리팩토링 및 기능 고도화의 기초 자료로 활용될 수 있습니다.