Collecting workspace information# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2023-08-15
- **분석자:** GitHub Copilot
- **분석 대상 소스:** One-Pick 주문관리 시스템

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 주문 메인 | OrderMain | 컴포넌트 마운트 | mounted() | fetchCreditLimit, getPartnerEstimatedQuantity | [OrderMain.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-docs\Order\OrderMainVue.md) |
| 주문 메인 | 공지사항 팝업 | 닫기/오늘하루닫기 | closeNoticePopup() | - | [OrderMain.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-docs\Order\OrderMainVue.md) |
| 주문 메인 | 휴일 팝업 | 닫기/오늘하루닫기 | closeHolidayPopup() | - | [OrderMain.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-docs\Order\OrderMainVue.md) |
| 주문 헤더 | 여신/구리 정보 | 정보 계산 | residualCredit(), isLimitOver() | - | [OrderHeader.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-docs\Order\OrderMainVue.md) |
| 주문 내역 | 목록 | 행 클릭 | onClickRow() | fetchOrderList | [OrderHistoryPartner.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-front\src\views\Order\partner\OrderHistory\OrderHistoryPartner.vue) |
| 주문 내역 | 체크박스 | 체크박스 클릭 | onClickRowCheckbox() | - | [OrderHistoryPartner.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-front\src\views\Order\partner\OrderHistory\OrderHistoryPartner.vue) |
| 주문 레이아웃 | 탭 버튼 | 탭 클릭 | onClickTabButton() | - | [OrderLayout.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-front\src\views\Order\partner\OrderLayout.vue) |
| 주문서 작성 | 양식 | 저장 | onSavingTemporarily() | POST/PUT /partner/orders | [OrderSheetPartner.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-front\src\views\Order\partner\OrderSheet\OrderSheetPartner.vue) |
| 주문서 작성 | 양식 | 주문요청 | onClickRequestOrderButton() | POST/PUT /partner/orders | [OrderSheetPartner.vue](c:\PrivateFiles\dev\oms-onepick\one-pick-front\src\views\Order\partner\OrderSheet\OrderSheetPartner.vue) |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| OrderMain | OrderMain.vue | 주문 화면 구성, 팝업 관리 | fetchCreditLimit, getPartnerEstimatedQuantity | /common/credit-limit, /partner/estimated-quantity | Vuex → 하위 컴포넌트 |
| OrderHeader | OrderHeader.vue | 여신/구리 정보 표시 | residualCredit, isLimitOver | - | OrderMain → OrderHeader |
| OrderBody | OrderBody.vue | 권한 기반 컴포넌트 분기 | - | - | OrderMain → OrderBody → 권한별 컴포넌트 |
| OrderLayout | OrderLayout.vue | 파트너용 탭 레이아웃 | onClickTabButton | - | OrderBody → OrderLayout → 탭별 컴포넌트 |
| OrderHistoryPartner | OrderHistoryPartner.vue | 주문 내역 조회/표시 | fetchOrderList, onClickRow | GET /partner/orders | OrderLayout → OrderHistoryPartner |
| OrderSheetPartner | OrderSheetPartner.vue | 주문서 작성/수정 | saveOrder, validateOrder | POST/PUT /partner/orders | Vuex ↔ OrderSheetPartner |

## 2. 백엔드 분석

### 2.1 API 및 컨트롤러

| 엔드포인트 | 메소드 | 컨트롤러 | 핵심 로직 | 호출 서비스 | 응답 형식 |
|-----------|-------|----------|----------|------------|----------|
| /api/v1/partner/orders/{startDate}/{endDate} | GET | PartnerOrderController | 주문 목록 조회 | orderService.getAllByPartnerId... | List\<OrderResponse\> |
| /api/v1/partner/orders/{orderId} | GET | PartnerOrderController | 주문 상세 조회 | orderService.getOrderByOrderIdAndPartnerId | OrderResponse |
| /api/v1/partner/orders | POST | PartnerOrderController | 주문 생성 | orderService.createOrder | OrderResponse |
| /api/v1/partner/orders/{orderId} | PUT | PartnerOrderController | 주문 수정 | orderService.updateOrder | OrderResponse |
| /api/v1/partner/orders/{orderIdList} | DELETE | PartnerOrderController | 주문 삭제 | orderService.deleteOrders | List\<OrderResponse\> |
| /api/v1/partner/orders/no-shipped/{startDate}/{endDate} | GET | PartnerOrderController | 미출하 목록 조회 | orderManager.getNoShippedOrdersByDeliveryDate | List\<OrderResponse\> |
| /api/v1/partner/orders/limit | GET | PartnerOrderController | SCR 주문 제한 조회 | orderService.getAllByPartnerIdAndSalesTeamCodeDeliveryDate | List\<OrderResponse\> |

### 2.2 서비스 레이어

| 서비스 클래스 | 메소드 | 기능 설명 | 호출 레포지토리 | DB 작업 | 참조 파일 |
|--------------|-------|----------|---------------|---------|----------|
| OrderService | getAllByPartnerId... | 주문 목록 조회 | orderRepository.findAllBy... | SELECT orders | [OrderService.java](c:\PrivateFiles\dev\oms-onepick\one-pick-back\src\main\java\com\ls\service\OrderService.java) |
| OrderService | getOrderByOrderIdAndPartnerId | 주문 상세 조회 | orderRepository.findByOrderIdAndPartnerId | SELECT orders, order_items | [OrderService.java](c:\PrivateFiles\dev\oms-onepick\one-pick-back\src\main\java\com\ls\service\OrderService.java) |
| OrderService | createOrder | 주문 생성 | orderRepository.save | INSERT orders, order_items | [OrderService.java](c:\PrivateFiles\dev\oms-onepick\one-pick-back\src\main\java\com\ls\service\OrderService.java) |
| OrderService | updateOrder | 주문 수정 | orderRepository.save | UPDATE orders, order_items | [OrderService.java](c:\PrivateFiles\dev\oms-onepick\one-pick-back\src\main\java\com\ls\service\OrderService.java) |
| OrderService | deleteOrders | 주문 삭제 | orderRepository.findAll/delete | DELETE orders | [OrderService.java](c:\PrivateFiles\dev\oms-onepick\one-pick-back\src\main\java\com\ls\service\OrderService.java) |
| OrderManager | getNoShippedOrdersByDeliveryDate | 미출하 주문 조회 | orderRepository | SELECT orders, shipments | - |

### 2.3 로직 흐름도

**주문 생성 프로세스**:
1. 프론트엔드: OrderSheetPartner.vue → `onClickRequestOrderButton()` → `onRequestOrder()` → `saveOrder()`
2. 프론트엔드 서비스: order-service.js → `createOrderSheet(orderSheet, salesTeamCode)`
3. 백엔드 API: `POST /api/v1/partner/orders?salesTeamCode={code}`
4. 백엔드 컨트롤러: `PartnerOrderController.createOrder()`
5. 백엔드 서비스: `OrderService.createOrder()`
6. 레포지토리: `orderRepository.save(targetOrder)`
7. 데이터베이스: `INSERT INTO orders, order_items`
8. 응답: Order → OrderResponse → 프론트엔드

## 3. 데이터 흐름 분석

### 3.1 주요 데이터 흐름

| 기능 | 시작점 | 데이터 흐름 | 변경/조회 테이블 | 결과 |
|------|-------|------------|-----------------|------|
| 주문 목록 조회 | OrderHistoryPartner | 프론트 → API → 백엔드 → DB → 백엔드 → 프론트 | orders (조회) | 주문 목록 화면 표시 |
| 주문 상세 조회 | OrderSheetPartner | 프론트 → API → 백엔드 → DB → 백엔드 → 프론트 | orders, order_items (조회) | 주문서 상세 화면 표시 |
| 주문 생성 | OrderSheetPartner | 프론트 → 검증 → API → 백엔드 → DB → 백엔드 → 프론트 | orders, order_items (생성) | 주문 생성 완료 화면 |
| 여신정보 조회 | OrderMain | 프론트 → API → 백엔드 → DB → 백엔드 → 프론트 → OrderHeader | credit_limit (조회) | 여신정보 헤더 표시 |
| 구리정보 조회 | OrderMain | 프론트 → API → 백엔드 → DB → 백엔드 → 프론트 → OrderHeader | estimated_quantity, delivery_quantity (조회) | 구리정보 헤더 표시 |

### 3.2 권한 및 조건부 렌더링

| 권한/조건 | 렌더링 컴포넌트 | 분기 조건 | 데이터 소스 |
|----------|----------------|-----------|------------|
| 파트너 & 유통배선 | OrderHistoryPartner | isAuthorityPartner && isDistributionCable | Vuex store |
| 파트너 & !유통배선 | OrderLayout | isAuthorityPartner && !isDistributionCable | Vuex store |
| 영업 & 구리봉 | OrderHistoryCopperRodSales | !isAuthorityPartner && isCopperRod | Vuex store |
| 영업 & !구리봉 | OrderHistorySales | !isAuthorityPartner && !isCopperRod | Vuex store |
| 여신정보 표시 | 헤더 영역 | this.$route.path.endsWith('/order') && (this.currentTeam === TEAM.IndustrialDevice ‖ this.currentTeam === TEAM.Tube ‖ this.currentTeam === TEAM.StructuredCable) && this.isAuthorityPartner | OrderHeader.vue |
| 구리정보 표시 | 헤더 영역 | this.$route.path.endsWith('/order') && this.currentTeam === TEAM.CopperRod | OrderHeader.vue |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 권한과 팀 기반 분기 로직이 컴포넌트 내에 하드코딩되어 있어 유지보수와 확장이 어려움
- 여신정보와 구리정보 표시 로직이 OrderHeader 컴포넌트에 혼재되어 있음
- 팝업 관련 로직(공지사항/휴일)이 OrderMain에 중복 구현됨
- 미출하목록/주문확정목록 등의 탭 이름이 조건에 따라 하드코딩되어 변경됨
- 다양한 API 호출과 상태 관리가 OrderMain.vue와 OrderSheetPartner.vue에 집중됨
- SCR 그룹 코드들이 PartnerOrderController에 하드코딩되어 있어 관리가 어려움

### 4.2 개선 요구사항
- 권한 및 팀 기반 분기 로직을 중앙화하여 관리하는 서비스 또는 설정 도입
- OrderHeader를 CreditInfoHeader와 CopperInfoHeader로 분리하여 단일 책임 원칙 적용
- 팝업 관련 로직을 재사용 가능한 컴포넌트로 추출
- 탭 이름 및 표시 조건을 설정 파일로 관리하여 유지보수성 향상
- OrderMain과 OrderSheetPartner의 책임을 적절히 분산하는 구조 개선
- 하드코딩된 상수(SCR 그룹 코드 등)를 설정 파일이나 데이터베이스로 이동

### 4.3 개선 설계 제안

**1. 권한 및 팀 관리 서비스**
```javascript
// auth-team-service.js
export default {
  getComponentByAuthAndTeam(isPartner, isDistributionCable, isCopperRod) {
    if (isPartner) {
      return isDistributionCable ? 'order-history-partner' : 'order-layout';
    } else {
      return isCopperRod ? 'order-history-copper-rod-sales' : 'order-history-sales';
    }
  },
  
  getHeaderInfoType(path, team, isPartner) {
    if (!path.endsWith('/order')) return 'none';
    if (team === 'CopperRod') return 'copper';
    if (['IndustrialDevice', 'Tube', 'StructuredCable'].includes(team) && isPartner) return 'credit';
    return 'none';
  }
}
```

**2. 헤더 컴포넌트 분리**
```vue
<!-- OrderHeaderManager.vue -->
<template>
  <div>
    <credit-info-header v-if="headerType === 'credit'" :credit-data="creditData" />
    <copper-info-header v-else-if="headerType === 'copper'" :copper-data="copperData" />
  </div>
</template>
```

**3. 팝업 관리 컴포넌트**
```vue
<!-- PopupManager.vue -->
<template>
  <portal to="popup">
    <notice-popup v-if="shouldShowNoticePopup" @close="onClose" @close-today="onCloseToday" />
    <holiday-popup v-if="shouldShowHolidayPopup" @close="onClose" @close-today="onCloseToday" />
  </portal>
</template>
```

**4. 탭 구성 설정**
```javascript
// tab-config.js
export const TAB_CONFIG = {
  'CopperRod': [
    { key: 'orderHistory', text: '주문내역' },
    { key: 'noShipment', text: '주문확정목록' },
    { key: 'shipment', text: '출하목록' }