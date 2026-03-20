# 레거시 코드 분석-주문·출하 파트너/영업 화면

## 기본 정보
- **분석일자:** 2025-10-21
- **분석자:** 최휘성 책임
- **분석 대상 소스:** 주문·출하 파트너/영업 화면 (c:\PrivateFiles\dev\oms-onepick\one-pick-front, c:\PrivateFiles\dev\oms-onepick\one-pick-back)

## 분석 대상 소스 상세 목록

| 구분        | 경로/파일명                                         | 설명                       | 주요 담당 기능/역할           |
|-------------|-----------------------------------------------------|----------------------------|-------------------------------|
| 프론트엔드  | one-pick-front/src/views/Order/OrderMain.vue        | 주문 메인 화면             | 주문 전체 레이아웃, 데이터 로딩|
| 프론트엔드  | one-pick-front/src/views/Order/OrderHeader.vue      | 주문 헤더 컴포넌트         | 여신/구리 정보 표시           |
| 프론트엔드  | one-pick-front/src/views/Order/OrderBody.vue        | 주문 본문 컴포넌트         | 권한 분기, 하위 컴포넌트 연결 |
| 프론트엔드  | one-pick-front/src/views/Order/OrderLayout.vue      | 파트너 주문 탭 레이아웃    | 탭 전환, 하위 컴포넌트 표시    |
| 프론트엔드  | one-pick-front/src/views/Order/partner/OrderHistory/OrderHistoryPartner.vue | 파트너 주문 내역           | 주문 목록 조회/삭제           |
| 프론트엔드  | one-pick-front/src/views/Order/NoShipment.vue       | 미출하 목록                | 미출하 조회, 출하요청, 엑셀   |
| 프론트엔드  | one-pick-front/src/views/Order/DeliveredShipment.vue| 출하 완료 목록             | 출하 완료 조회, 성적서 요청   |
| 프론트엔드  | one-pick-front/src/store/modules/order-sheet-partner.js | 주문 Vuex 모듈           | 주문 상태 관리                |
| 프론트엔드  | one-pick-front/src/service/order-service.js         | 주문 API 래퍼              | 주문 관련 API 호출            |
| 프론트엔드  | one-pick-front/src/service/shipment-service.js      | 출하 API 래퍼              | 출하 관련 API 호출            |
| 백엔드      | one-pick-back/src/main/java/com/ls/controller/PartnerOrderController.java | 파트너 주문 컨트롤러      | 주문 CRUD, 미출하 조회        |
| 백엔드      | one-pick-back/src/main/java/com/ls/controller/SalesShipmentController.java | 출하 컨트롤러             | 출하/미출하/완료/요청         |
| 백엔드      | one-pick-back/src/main/java/com/ls/service/OrderService.java | 주문 서비스              | 주문 비즈니스 로직            |
| 백엔드      | one-pick-back/src/main/java/com/ls/service/ShipmentService.java | 출하 서비스              | 출하 비즈니스 로직            |
| 백엔드      | one-pick-back/src/main/java/com/ls/service/ShipmentRequestService.java | 출하요청 서비스          | 출하요청 생성/검증/삭제       |
| 백엔드      | one-pick-back/src/main/java/com/ls/service/ShipmentManagerFactory.java | 출하 매니저 팩토리       | 팀별 출하 로직 분기           |
| 백엔드      | one-pick-back/src/main/java/com/ls/util/ExcelGenerator.java | 엑셀 생성 유틸리티       | 엑셀 파일 생성                |
| DB          | orders, order_items, shipment, shipment_request, partner, credit_limit, copper_quantity | 주요 테이블               | 주문/출하/여신/구리 관리      |

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 주문 메인 | OrderMain | 로딩 시 | mounted() | `/common/credit-limit`, `/partner/estimated-quantity`, `/sales/estimated-quantity`, `/common/copper-quantity` | OrderMain.vue |
|  |  | 팝업 닫기 | closeNoticePopup(), closeHolidayPopup() | - | OrderMain.vue |
| 주문 헤더 | OrderHeader | - | 계산 프로퍼티 | - | OrderHeader.vue |
| 주문 본문 | OrderBody | 권한 분기 | computed 조건 | - | OrderBody.vue |
| 파트너 주문 탭 | OrderLayout | 탭 클릭 | onClickTabButton() | - | OrderLayout.vue |
| 주문 내역 | OrderHistoryPartner | 활성화 | activated() | `/partner/orders/{startDate}/{endDate}` | src/views/Order/partner/OrderHistory/OrderHistoryPartner.vue |
|  |  | 체크박스 | onClickRowCheckbox(), onClickHeaderCheckbox() | - | OrderHistoryPartner.vue |
| 미출하 목록 | NoShipment | 기간/검색/정렬 | onDateRangeSelected(), onChangeSearchKeyword(), onChangeSortCondition() | `/sales/shipments/no-shipments/{startDate}/{endDate}` | NoShipment.vue |
|  |  | 출하요청 생성 | onClickButton() | `POST /sales/shipments/request` | NoShipment.vue |
|  |  | 엑셀 다운로드 | downloadExcel(), downloadOrderCompletedExcel() | `/sales/shipments/no-shipments/.../download` | NoShipment.vue |
| 출하 목록 | DeliveredShipment | 기간/검색/정렬 | onDateRangeSelected(), onChangeSearchKeyword() | `/sales/shipments/delivered/{goodIssueDate}` | DeliveredShipment.vue |
|  |  | 성적서 요청 | openInspectionRequestDialog() | - (후속 다이얼로그) | DeliveredShipment.vue |
|  |  | 엑셀 다운로드 | onClickExcelDownloadButton() | `/sales/shipments/delivered/.../download` | DeliveredShipment.vue |
| 주문 서비스 호출 | Vuex 모듈 (orderSheetPartner 등) | 상태 변경 | mutations / actions | `/partner/orders`, `/partner/orders/{id}` | src/store/modules/order-sheet-partner.js, src/service/order-service.js |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|-----------|-----------|-----------|-----------|-------------|
| OrderMain | OrderMain.vue | 주문 전체 레이아웃, 여신/구리 데이터 로딩, 팝업 제어 | fetchCreditLimit(), getPartnerEstimatedQuantity(), getDeliveryCopperQuantity(), getSalesEstimatedQuantity() | `/common/credit-limit`, `/partner/estimated-quantity`, `/sales/estimated-quantity`, `/common/copper-quantity` | Vuex(creditLimit, estimatedQuantity, copperQuantity) → OrderHeader/OrderBody |
| OrderHeader | OrderHeader.vue | 팀/권한별 여신·구리 정보 표시 | 계산식 residualCredit, getNextMonth 등 | - | props(credit 데이터, 팀 정보) → UI 출력 |
| OrderBody | OrderBody.vue | 권한/팀 조건에 따른 화면 분기 | computed(isAuthorityPartner 등) | - | Vuex getters → 조건 분기 → 하위 컴포넌트 |
| OrderLayout | OrderLayout.vue | 파트너용 탭 레이아웃 (주문/미출하/출하) | onClickTabButton() | - | 탭 선택 → 하위 컴포넌트 표시 |
| OrderHistoryPartner | src/views/Order/partner/OrderHistory/OrderHistoryPartner.vue | 파트너 주문 내역 조회, 선택, 삭제 | fetchOrderList(), deleteOrdersByOrderIds() | `/partner/orders/{startDate}/{endDate}` | Vuex(orderHistoryPartner) 상태 → 표 렌더링 |
| NoShipment | NoShipment.vue | 미출하 목록 조회, 출하요청 생성, 엑셀 출력 | fetchSalesNoShipments(), createShipmentRequest(), exportNoShipmentsExcel(), exportOrderCompletedShipmentsExcel() | `/sales/shipments/no-shipments/...`, `/sales/shipments/request` | API 응답 → 목록 정렬/필터 → 사용자 액션 |
| DeliveredShipment | DeliveredShipment.vue | 출하 완료 목록 조회, 성적서 요청, 엑셀 출력 | fetchDeliveredShipments(), exportDeliveredExcel() | `/sales/shipments/delivered/...`, `/sales/shipments/delivered/.../download` | API 응답 → 목록 필터 → 선택 데이터 → 다이얼로그 |
| order-service | src/service/order-service.js | 주문 API 래퍼 | fetchOrderList(), createOrderSheet(), updateOrderSheet() 등 | `/partner/orders`, `/sales/orders` 등 | HTTP 모듈 → REST → 결과 반환 |
| shipment-service | shipment-service.js | 출하 API 래퍼 | fetchSalesShipmentListOfDivisions(), createShipmentRequest() 등 | `/sales/shipments`, `/partner/shipments` | HTTP 모듈 → REST → 결과 후속 처리 (시간 포맷, 정렬) |

## 2. 백엔드 분석

### 2.1 API 및 컨트롤러

| 엔드포인트 | 메소드 | 컨트롤러 | 핵심 로직 | 호출 서비스 | 응답 형식 |
|-----------|--------|-----------|-----------|-------------|-----------|
| /api/v1/partner/orders/{startDate}/{endDate} | GET | PartnerOrderController.getAllOrders | 기간·팀 필터로 파트너 주문 조회 | OrderService | List\<OrderResponse\> |
| /api/v1/partner/orders/{orderId} | GET | PartnerOrderController.getPartnerOrder | 단일 주문 상세 | OrderService | OrderResponse |
| /api/v1/partner/orders | POST | PartnerOrderController.createOrder | 주문 생성 | OrderService | OrderResponse |
| /api/v1/partner/orders/{orderId} | PUT | PartnerOrderController.updateOrder | 주문 수정 | OrderService | OrderResponse |
| /api/v1/partner/orders/{orderIds} | DELETE | PartnerOrderController.deleteOrders | 주문 삭제 | OrderService | List\<OrderResponse\> |
| /api/v1/partner/orders/no-shipped/{start}/{end} | GET | PartnerOrderController.getNoShippedOrders | 미출하 목록 | OrderManager | List\<OrderResponse\> |
| /api/v1/sales/shipments/divisions | GET | SalesShipmentController.getShipmentListOfDivisions | 영업 담당 구역의 당일 출하 목록 | ShipmentService | List\<ShipmentResponse\> |
| /api/v1/sales/shipments | PUT | SalesShipmentController.updateShipmentListWithShipmentChange | 출하 상태 변경(수락/거절) | ShipmentService | List\<ShipmentResponse\> |
| /api/v1/sales/shipments/no-shipments/{start}/{end} | GET | SalesShipmentController.getNoShipments | 미출하 주문 조회 | ShipmentManagerFactory → manager | List\<NoShipmentResponse\> |
| /api/v1/sales/shipments/no-shipments/.../download | GET | SalesShipmentController.getNoShipmentsExcel | 미출하 엑셀 생성 | ShipmentManagerFactory, ExcelGenerator | 파일(Stream) |
| /api/v1/sales/shipments/delivered/{dates} | GET | SalesShipmentController.getDeliveredShipments | 출하 완료 조회 | ShipmentManager | List\<DeliveryShipmentResponse\> |
| /api/v1/sales/shipments/delivered/.../download | GET | SalesShipmentController.getDeliveredShipmentsExcel | 출하 완료 엑셀 | ShipmentManager, ExcelGenerator | 파일(Stream) |
| /api/v1/sales/shipments/request | GET/POST/PUT/DELETE | SalesShipmentController | 출하요청 CRUD, 재고 조회, 취소 | ShipmentRequestService, ShipmentManager | List\<ShipmentRequestResponse\>, long |

### 2.2 서비스 레이어

| 서비스 클래스 | 메소드 | 기능 설명 | 호출 레포지토리 | DB 작업 | 참조 파일 |
|--------------|--------|-----------|-----------------|---------|-----------|
| OrderService | getAllOrders/getOrderBy.../create/update/delete | 파트너 주문 CRUD, 상태 체크, 메시지 연동 | OrderRepository, OrderItemRepository 등 | SELECT/INSERT/UPDATE/DELETE orders, order_items | src/main/java/com/ls/service/OrderService.java |
| ShipmentService | getShipmentListOfDivisions(), changeShipment..., accept/reject 등 | 출하 목록 조회, 상태 변경, 메시지 발송, 인터페이스 연동 | ShipmentRepository, OrderRepository | SELECT/UPDATE shipments, orders | ShipmentService.java |
| ShipmentRequestService | createShipmentRequests(), saveShipmentRequests(), delete... | 출하요청 생성·중복검사·삭제, 메일 발송 대상 조회 | ShipmentRequestRepository | INSERT/UPDATE/DELETE shipment_request | ShipmentRequestService.java |
| ShipmentManagerFactory/ShipmentManager | getNoShipments(), getDeliveryExpectedShipments() 등 | 팀별 출하 로직 분리, 조회/엑셀 계산 | 다수 레포지토리(내부) | SELECT | (미제공) |
| ExcelGenerator | generate(), generateCopperRod() 등 | 조회 결과를 엑셀로 변환 | - | - | Controller 의존 |

### 2.3 로직 흐름도

**주문생성 & 조회**
1. 프론트: OrderSheetPartner → order-service.createOrderSheet()
2. API: `POST /api/v1/partner/orders?salesTeamCode=...`
3. Controller: PartnerOrderController.createOrder()
4. Service: OrderService.createOrder()
5. Repository: OrderRepository.save(), OrderItemRepository.saveAll()
6. DB: orders/order_items INSERT → OrderResponse 변환 → 프론트 반환  
7. 주문내역 조회 시 OrderHistoryPartner → order-service.fetchOrderList() → 동일 Controller/Service 경로로 SELECT 수행

**미출하 목록 & 출하요청**
1. 프론트: NoShipment mounted/이벤트 → shipment-service.fetchSalesNoShipments()
2. API: `GET /api/v1/sales/shipments/no-shipments/{start}/{end}`
3. Controller: SalesShipmentController.getNoShipments()
4. Manager: ShipmentManagerFactory → 팀별 ShipmentManager.getNoShipments()
5. Service/Repository: 출하/주문/재고 정보 SELECT → NoShipmentResponse
6. 프론트: 정렬/필터 후 표시  
7. 출하요청 버튼 → shipment-service.createShipmentRequest()
8. API: `POST /api/v1/sales/shipments/request?salesTeamCode=...`
9. Controller: SalesShipmentController.createShipmentRequests()
10. Service: ShipmentRequestService.createShipmentRequests() (중복검증)
11. Repository: ShipmentRequestRepository.save()
12. 결과 ID 반환 → 라우팅 (ShipmentRequestSheet)

**출하 완료 조회 & 성적서 요청**
1. 프론트: DeliveredShipment → fetchDeliveredShipments()
2. API: `GET /api/v1/sales/shipments/delivered/{start,end}`
3. Controller: SalesShipmentController.getDeliveredShipments()
4. Manager: ShipmentManager.getDeliveredShipments()
5. Service/Repository: 배송 완료 데이터 SELECT → DeliveryShipmentResponse → 프론트  
6. 성적서 요청: InspectionRequestDialog로 전달(별도 흐름)  

## 3. 데이터베이스 분석

### 3.1 주요 테이블 (추정)

| 테이블명 | 주요 컬럼 | 역할 | 관계 테이블 | 인덱스 |
|---------|-----------|------|-------------|--------|
| orders | id, order_number, partner_id, sales_team_code, status, order_date, note | 주문 헤더 정보 | order_items, shipments | order_number(UK), partner_id IDX |
| order_items | id, order_id, item_no, item_code, quantity, price, status | 주문 품목 상세 | orders | order_id FK |
| shipment_request | id, order_sap_id, item_no, partner_id, request_datetime, mail_sent_datetime, status | 출하요청 관리 | shipments | order_sap_id IDX |
| shipment | id, order_id, partner_id, status, shipment_target_date, delivery_date, holding_reason | 출하 진행 정보 | orders | status IDX, shipment_target_date IDX |
| partner | partner_id, sales_team_code, partner_name | 고객사 정보 | orders, shipment | partner_id PK |
| credit_limit (추정) | partner_id, credit, used_credit | 여신 한도 | partner | partner_id PK |
| copper_quantity (추정) | partner_id, month, estimated_quantity, delivery_quantity | 구리 사용량 | partner | month IDX |

### 3.2 데이터 흐름

| 기능 | 시작점 | 데이터 흐름 | 변경/조회 테이블 | 결과 |
|------|--------|-------------|------------------|-------|
| 주문 목록 조회 | OrderHistoryPartner | 프론트 → `/partner/orders` → OrderService → OrderRepository | orders, order_items | 화면 표에 주문 목록 표시 |
| 주문 생성 | OrderSheetPartner | 프론트 → `/partner/orders` POST → OrderService | orders(INSERT), order_items(INSERT) | 신규 주문 생성 |
| 주문 삭제 | OrderHistoryPartner | 프론트 → `/partner/orders/{ids}` DELETE → OrderService | orders/order_items DELETE | 목록 갱신 |
| 미출하 조회 | NoShipment | 프론트 → `/sales/shipments/no-shipments` → ShipmentManager | orders, shipment, stock 관련 테이블 | 미출하 리스트 |
| 출하요청 생성 | NoShipment | 프론트 → `/sales/shipments/request` POST | shipment_request(INSERT) | 요청 후 ID 반환 |
| 출하 상태 변경 | SalesShipmentController PUT | 프론트 → `/sales/shipments` PUT → ShipmentService.accept/reject | shipment UPDATE | 상태 변경 및 메시지 발송 |
| 출하 완료 조회 | DeliveredShipment | 프론트 → `/sales/shipments/delivered` → ShipmentManager | shipment, orders | 출하 완료 목록 |
| 여신 데이터 조회 | OrderMain | 프론트 → `/common/credit-limit` | credit_limit | OrderHeader 표시 |
| 구리 데이터 조회 | OrderMain | 프론트 → `/partner/estimated-quantity`, `/common/copper-quantity` | copper_quantity | OrderHeader 표시 |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 권한/팀별 화면 분기 로직이 여러 컴포넌트에 중복되어 유지보수가 어려움 (OrderBody, OrderLayout, OrderHeader 등)
- 팝업(공지·휴일) 표시 조건과 스토리지 처리 로직이 OrderMain에 집중되어 가독성 저하
- 주문·미출하·출하 기능이 단일 서비스 파일(shipment-service.js, order-service.js)에 혼재되어 기능 단위 모듈화 부족
- 백엔드에서 팀별 상수(SCR 코드 등)를 서비스/컨트롤러에 하드코딩 → 설정 중심 관리 미흡
- Vuex 모듈 간 의존성(creditLimit, estimatedQuantity 등)이 많아 초기 로딩 시 API 호출이 순차적으로 이루어져 지연 가능성

### 4.2 개선 요구사항
- 권한/팀 판단 로직을 전역 헬퍼 혹은 Vuex getter로 통합하여 컴포넌트 간 일관성 확보
- 팝업 관리 전용 컴포넌트/서비스를 도입해 OrderMain 의존도를 낮추고 재사용성 향상
- 주문/출하 API 래퍼를 기능별 폴더로 재구성 (예: order-service/partner.js, shipment-service/no-shipment.js)
- SAP/SCR 등의 마스터 상수를 설정 파일 또는 DB 테이블로 이동하여 운영 중 변경 대응
- 초기 로딩 API를 Promise.all 등 비동기 병렬 처리로 개선하고, 필요 시 데이터 캐싱 전략 적용
- 출하 관련 테이블(미출하/출하완료)의 공통 필터·정렬 로직을 공용 유틸로 추출해 중복 제거
- 백엔드에서 엑셀 생성 로직과 데이터 조회 로직을 분리하여 테스트 용이성을 높이고, 대량 데이터 처리 시 비동기 큐 도입 검토

## 5. 분석 요청 방법
주문 결과를 조회하는 두 화면(출하 전 미출하 목록, 출하 완료 목록)을 중심으로 주문 생성 → 미출하 → 출하 완료의 흐름을 정리하였으며, 관련 프론트엔드 컴포넌트 및 백엔드 컨트롤러/서비스의 연결 구조를 위 표와 같이 정리했습니다.