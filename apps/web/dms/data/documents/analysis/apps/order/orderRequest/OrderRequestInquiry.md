# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-21
- **분석자:** GitHub Copilot
- **분석 대상 소스:** 주문 결과 조회 영역 (OrderHistory/NoShipment/DeliveredShipment)

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름
| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 파트너 주문 내역 | OrderHistoryPartner | 화면 활성화 | activated() | GET `/api/v1/partner/orders/{start}/{end}` | src/views/Order/partner/OrderHistory/OrderHistoryPartner.vue |
|  | 체크박스 | onClickRowCheckbox | - | OrderHistoryPartner.vue |
| 미출하 조회 | NoShipment | 기간 선택/검색 | onSelectDateRange, onChangeKeyword | GET `/api/v1/sales/shipments/no-shipments/{start}/{end}` | src/views/Shipment/ActiveShipment/NoShipment.vue |
|  | 엑셀 다운로드 | onClickExport | GET `/api/v1/sales/shipments/no-shipments/.../download` | NoShipment.vue |
| 출하 완료 조회 | DeliveredShipment | 기간 선택/검색 | onSelectDateRange, onChangeKeyword | GET `/api/v1/sales/shipments/delivered/{start}/{end}` | src/views/Shipment/ActiveShipment/DeliveredShipment.vue |
|  | 성적서 요청 | openInspectionRequestDialog | - | DeliveredShipment.vue |
| 주문 결과 탭 | OrderLayout | 탭 전환 | onClickTabButton | - | src/views/Order/partner/OrderLayout.vue |

### 1.2 주요 컴포넌트 분석
| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|-----------|-----------|-----------|-----------|-------------|
| OrderHistoryPartner | src/views/Order/partner/OrderHistory/OrderHistoryPartner.vue | 기간별 주문 결과 조회 및 선택 | fetchOrderList, changeCheckboxStateKey | GET `/partner/orders` | Vuex(orderHistoryPartner) → 테이블 |
| NoShipment | src/views/Shipment/ActiveShipment/NoShipment.vue | 미출하 주문 조회·엑셀 출력 | fetchSalesNoShipments, exportNoShipmentsExcel | GET `/sales/shipments/no-shipments` | API → 정렬 필터 → 테이블 |
| DeliveredShipment | src/views/Shipment/ActiveShipment/DeliveredShipment.vue | 출하 완료 조회·성적서 요청·엑셀 출력 | fetchDeliveredShipments, exportDeliveredExcel | GET `/sales/shipments/delivered` | API → Vuex(adminCopperrod 등) → 테이블 |
| OrderLayout | src/views/Order/partner/OrderLayout.vue | 주문/미출하/출하 탭 구성 | computed tabItems | - | 탭 상태 → 하위 컴포넌트 표시 |

## 2. 백엔드 분석

### 2.1 API 및 컨트롤러
| 엔드포인트 | 메소드 | 컨트롤러 | 핵심 로직 | 호출 서비스 | 응답 형식 |
|-----------|--------|-----------|-----------|-------------|-----------|
| `/api/v1/partner/orders/{start}/{end}` | GET | PartnerOrderController | 기간·팀 조건 주문 조회 | OrderService.getAllByPartnerId... | List\<OrderResponse\> |
| `/api/v1/sales/shipments/no-shipments/{start}/{end}` | GET | SalesShipmentController | 팀별 미출하 조회 | ShipmentManagerFactory → manager.getNoShipments | List\<NoShipmentResponse\> |
| `/api/v1/sales/shipments/no-shipments/.../download` | GET | SalesShipmentController | 미출하 엑셀 변환 | ShipmentManagerFactory, ExcelGenerator | 바이너리 스트림 |
| `/api/v1/sales/shipments/delivered/{start}/{end}` | GET | SalesShipmentController | 출하 완료 조회 | ShipmentManager.getDeliveredShipments | List\<DeliveredShipmentResponse\> |
| `/api/v1/sales/shipments/delivered/.../download` | GET | SalesShipmentController | 출하 완료 엑셀 변환 | ShipmentManager, ExcelGenerator | 바이너리 스트림 |

### 2.2 서비스 레이어
| 서비스 클래스 | 메소드 | 기능 설명 | 호출 레포지토리 | DB 작업 | 참조 파일 |
|--------------|--------|-----------|-----------------|---------|-----------|
| OrderService | getAllByPartnerIdAndSalesTeamCodeBetweenDates | 주문 결과 조회 | OrderRepository | SELECT orders/order_items | src/main/java/com/ls/service/OrderService.java |
| ShipmentRequestService | getShipmentRequests | 출하요청 현황 조회(미출하) | ShipmentRequestRepository | SELECT shipment_request | src/main/java/com/ls/service/ShipmentRequestService.java |
| ShipmentService | getShipmentListByPartnerId, getShipmentList | 출하 데이터 조회 | ShipmentRepository, OrderRepository | SELECT shipments/orders | src/main/java/com/ls/service/ShipmentService.java |
| ShipmentManager (팀별) | getNoShipments, getDeliveredShipments | 조회·집계 로직 | 다수 레포지토리 | SELECT | src/main/java/com/ls/manager/shipment |

## 3. 데이터 흐름 분석

### 3.1 주요 데이터 흐름
| 기능 | 시작점 | 데이터 흐름 | 변경/조회 테이블 | 결과 |
|------|--------|-------------|------------------|-------|
| 주문 결과 조회 | OrderHistoryPartner | 프론트 → `/partner/orders` → OrderService → OrderRepository | orders, order_items | 주문 내역 그리드 |
| 미출하 조회 | NoShipment | 프론트 → `/sales/shipments/no-shipments` → ShipmentManager | orders, shipment, shipment_request | 미출하 목록 및 엑셀 |
| 출하 완료 조회 | DeliveredShipment | 프론트 → `/sales/shipments/delivered` → ShipmentManager | shipment, orders | 출하 완료 목록 및 엑셀 |
| 출하요청 현황 확인 | DeliveredShipment/NoShipment | 프론트 → `/sales/shipments/request` (GET) | shipment_request | 상태 표시 |

### 3.2 권한 및 조건부 렌더링
| 권한/조건 | 렌더링 컴포넌트 | 분기 조건 | 데이터 소스 |
|----------|----------------|-----------|------------|
| 파트너 & 비유통 | OrderLayout | isAuthorityPartner && !isDistributionCable | Vuex getters |
| 파트너 & 유통배선 | OrderHistoryPartner 단독 | isAuthorityPartner && isDistributionCable | Vuex getters |
| 영업 사용자 | OrderHistorySales / CopperRodSales | !isAuthorityPartner | Vuex getters |
| 탭 구성 | NoShipment, DeliveredShipment | team === CopperRod ⇒ 탭명 변경 | OrderLayout computed |
| 엑셀 활성화 | 선택 데이터 유무 | selectedRows.length > 0 | 각 컴포넌트 data |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 조회 전용 화면에도 주문 생성 로직 관련 의존성(공통 서비스, Vuex 상태)이 섞여 있어 코드 이해가 어렵다.
- 미출하와 출하 완료 화면이 같은 서비스(shipment-service.js)에 의존하며 함수명이 모호해 기능 경계가 불분명하다.
- 권한·팀별 탭 구성 로직이 OrderLayout에 하드코딩되어 확장 시 반복 수정이 필요하다.
- 엑셀 다운로드, 날짜 필터 등 유사 기능이 컴포넌트마다 중복 구현된다.

### 4.2 개선 요구사항
- 조회 전용 모듈을 분리해 order-service/shipment-service에서 CRUD 로직과 독립시키기.
- 탭/권한 구성을 설정 파일 또는 공통 헬퍼로 추출해 유지보수성 향상.
- 조회 화면 공통 훅(날짜 범위, 검색어, 엑셀 다운로드)을 구축해 코드 중복 축소.
- ShipmentManager/Service의 조회 메소드에 반환 DTO 명세를 문서화하고, 필요 시 GraphQL·전용 API로 응답 단순화.

---