# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-22
- **분석자:** GitHub Copilot
- **분석 대상 소스:** 수탁 전기동 자재 공급 계획 관리 프로세스

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 수탁 전기동 메인 | StoreCopperMain | 컴포넌트 마운트 | mounted() | - | StoreCopperMain.vue |
| 공급계획등록 | SupplyPlanStoreCopper | 셀 클릭 | onClickCell() | - | SupplyPlanStoreCopper.vue |
| 공급계획등록 | SupplyPlanStoreCopper | 저장 버튼 | onClickSaveButton() | POST /copperrod/store-copper/supply-plan/save | SupplyPlanStoreCopper.vue |
| 공급계획등록 | SupplyPlanStoreCopper | 엑셀 다운로드 | onClickExcelButton() | GET /copperrod/store-copper/supply-plan/download | SupplyPlanStoreCopper.vue |
| 공급계획등록 | SupplyPlanStoreCopper | 전월 잔량입력 | onClickRestQtyButton() | - | SupplyPlanStoreCopper.vue |
| 공급계획 폼 | SupplyPlanStoreCopperSheetForm | 고객사 선택 | onClickSelectCustomerInfo() | - | SupplyPlanStoreCopperSheetForm.vue |
| 공급계획 폼 | SupplyPlanStoreCopperSheetForm | 년도 선택 | onClickYear() | GET /copperrod/store-copper/supply-plan/sap | SupplyPlanStoreCopperSheetForm.vue |
| 공급계획 폼 | SupplyPlanStoreCopperSheetForm | 월 선택 | onClickMonth() | GET /copperrod/store-copper/supply-plan/sap | SupplyPlanStoreCopperSheetForm.vue |
| 배차현황 | AllocateStoreCopper | 목록 조회 | fetchAllocateStoreCopper() | GET /copperrod/store-copper/allocate-store-copper | - |
| 실중량산출 | MeasureStoreCopper | 목록 조회 | fetchMeasureStoreCopper() | GET /copperrod/store-copper/measure-store-copper | - |
| 입고현황 | CurrentStoreCopper | 목록 조회 | fetchCurrentStoreCopper() | GET /copperrod/store-copper/current-store-copper | - |
| 입고현황 | CurrentStoreCopper | 입고/취소 | saveStoreCopper() | POST /copperrod/store-copper/current-store-copper/save | - |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| StoreCopperMain | StoreCopperMain.vue | 수탁 전기동 메인 화면 관리 | - | - | props → StoreCopperLayout |
| StoreCopperLayout | StoreCopperLayout.vue | 탭 기반 레이아웃 관리 | onClickTabButton() | - | 권한별 탭 분기 → 하위 컴포넌트 |
| SupplyPlanStoreCopper | SupplyPlanStoreCopper.vue | 공급계획 등록/수정 | saveSupplyPlan(), searchSupplyPlan() | POST/GET /supply-plan | 캘린더 → 계획량 입력 → 저장 |
| SupplyPlanStoreCopperSheet | SupplyPlanStoreCopperSheet.vue | 공급계획 입력 폼 래퍼 | onClickYear(), onClickMonth() | - | 폼 데이터 → 부모 컴포넌트 |
| SupplyPlanStoreCopperSheetForm | SupplyPlanStoreCopperSheetForm.vue | 공급계획 상세 폼 | searchSapSupplyPlan() | GET /supply-plan/sap | SAP 데이터 조회 → 계산 → 표시 |
| CopperCalendar | - | 월별 캘린더 UI | onClickCell() | - | 일별 계획량 입력 인터페이스 |

## 2. 백엔드 분석

### 2.1 API 및 컨트롤러

| 엔드포인트 | 메소드 | 컨트롤러 | 핵심 로직 | 호출 서비스 | 응답 형식 |
|-----------|-------|----------|----------|------------|----------|
| /api/v1/copperrod/store-copper/allocate-store-copper/{start}/{end} | GET | SalesStoreCopperController | 배차현황 조회 | storeCopperService.getAllocateStoreCopperList() | List\<StoreCopperResponse\> |
| /api/v1/copperrod/store-copper/measure-store-copper/{start}/{end} | GET | SalesStoreCopperController | 실중량 산출현황 조회 | storeCopperService.getMeasureStoreCopperList() | List\<StoreCopperResponse\> |
| /api/v1/copperrod/store-copper/current-store-copper/{start}/{end} | GET | SalesStoreCopperController | 입고현황 조회 | storeCopperService.getCurrentStoreCopperList() | List\<StoreCopperResponse\> |
| /api/v1/copperrod/store-copper/current-store-copper/save/{date}/{flag} | POST | SalesStoreCopperController | 입고/입고취소 | storeCopperService.sendStoreCopper() | Boolean |
| /api/v1/copperrod/store-copper/supply-plan/{year}/{month}/{customerId} | GET | SalesStoreCopperController | 공급계획 조회 | storeCopperService.getSupplyPlanStoreCopperList() | List\<StoreCopperSupplyPlan\> |
| /api/v1/copperrod/store-copper/supply-plan/sap/{year}/{month}/{customerId} | GET | SalesStoreCopperController | SAP 공급계획 조회 | storeCopperService.getSapSupplyPlanStoreCopper() | List\<SupplyPlan\> |
| /api/v1/copperrod/store-copper/supply-plan/save/{year}/{month}/{customerId}/{restQty} | POST | SalesStoreCopperController | 공급계획 저장 | storeCopperService.saveSupplyPlanStoreCopperList() | Boolean |
| /api/v1/copperrod/store-copper/supply-plan/{year}/{month}/download | GET | SalesStoreCopperController | 공급계획 엑셀 다운로드 | storeCopperService.getStoreCopperSupplyPlanExcel() | Binary Stream |

### 2.2 서비스 레이어

| 서비스 클래스 | 메소드 | 기능 설명 | 호출 레포지토리 | DB 작업 | 참조 파일 |
|--------------|-------|----------|---------------|---------|----------|
| StoreCopperService | getAllocateStoreCopperList | 배차현황 목록 조회 | storeCopperRepository | SELECT store_copper | StoreCopperService.java |
| StoreCopperService | getCurrentStoreCopperList | 입고현황 목록 조회 | storeCopperRepository | SELECT store_copper | StoreCopperService.java |
| StoreCopperService | sendStoreCopper | 입고/입고취소 처리 | storeCopperRepository | UPDATE store_copper | StoreCopperService.java |
| StoreCopperService | getSupplyPlanStoreCopperList | 공급계획 조회 | storeCopperSupplyPlanRepository | SELECT supply_plan | StoreCopperService.java |
| StoreCopperService | saveSupplyPlanStoreCopperList | 공급계획 저장 | storeCopperSupplyPlanRepository | INSERT/UPDATE supply_plan | StoreCopperService.java |
| StoreCopperService | getSapSupplyPlanStoreCopper | SAP 공급계획 조회 | - | SAP Interface | StoreCopperService.java |
| InterfaceService | getStoreCopperSupplyPlanTotalResult | SAP 공급계획 실적 조회 | - | SAP SOAP 호출 | InterfaceService.java |
| InterfaceService | createStoreCopperRequest | SAP 입고/취소 요청 | - | SAP SOAP 호출 | InterfaceService.java |

### 2.3 로직 흐름도

**공급계획 등록 프로세스:**
1. 프론트엔드: SupplyPlanStoreCopper → 고객사/년월 선택 → searchSapSupplyPlan()
2. API 호출: GET /api/v1/copperrod/store-copper/supply-plan/sap/{year}/{month}/{customerId}
3. 백엔드: SalesStoreCopperController.getSapSupplyPlanStoreCopper() → StoreCopperService.getSapSupplyPlanStoreCopper()
4. SAP Interface: InterfaceService.getStoreCopperSupplyPlanTotalResult() → SAP SOAP 호출
5. 응답 데이터: SAP → 백엔드 → 프론트엔드 (입고량, 출고량, 잔량 표시)
6. 사용자 입력: CopperCalendar에서 일별 계획량 입력 → onClickCell() → 다이얼로그
7. 저장 처리: onClickSaveButton() → saveSupplyPlan()
8. API 호출: POST /api/v1/copperrod/store-copper/supply-plan/save/{year}/{month}/{customerId}/{restQty}
9. 백엔드: StoreCopperService.saveSupplyPlanStoreCopperList() → DB 저장

**입고 처리 프로세스:**
1. 프론트엔드: CurrentStoreCopper → 목록 조회 → 입고 선택 → saveStoreCopper()
2. API 호출: POST /api/v1/copperrod/store-copper/current-store-copper/save/{date}/{flag}
3. 백엔드: StoreCopperService.sendStoreCopper() → InterfaceService.createStoreCopperRequest()
4. SAP Interface: SAP SOAP 호출 → 입고/취소 처리
5. 응답 처리: SAP 결과 → 로컬 DB 업데이트 → 프론트엔드 알림

## 3. 데이터베이스 분석

### 3.1 주요 테이블

| 테이블명 | 주요 컬럼 | 역할 | 관계 테이블 | 인덱스 |
|---------|----------|------|------------|--------|
| store_copper | manage_id, customer_id, allocation_date, incoming_date, actual_weight, flag | 전기동 입고 정보 관리 | - | manage_id(PK) |
| store_copper_supply_plan | supply_plan_id, year, month, customer_id, supplier_id | 공급계획 헤더 정보 | store_copper_supply_plan_calendar | supply_plan_id(PK) |
| store_copper_supply_plan_calendar | supply_plan_id, day1~day31, rest_qty | 일별 공급계획 상세 | store_copper_supply_plan | supply_plan_id(FK) |
| sap_supplier | id, supplier_id | SAP 공급업체 매핑 | - | id(PK) |
| delivery_copper_rod | delivery_doc_number, item_code, partner_id, release_quantity | 구리봉 출하 정보 | - | delivery_doc_number(PK) |

### 3.2 데이터 흐름

| 기능 | 시작점 | 데이터 흐름 | 변경/조회 테이블 | 결과 |
|------|-------|------------|-----------------|------|
| 공급계획 조회 | 화면 로드 | 프론트 → API → SAP Interface → SAP | - | SAP 실적 데이터 표시 |
| 공급계획 저장 | 저장 버튼 | 프론트 → API → 서비스 → DB | store_copper_supply_plan, store_copper_supply_plan_calendar(INSERT/UPDATE) | 계획 저장 완료 |
| 배차현황 조회 | 탭 클릭 | 프론트 → API → 서비스 → DB | store_copper(조회) | 배차 목록 표시 |
| 입고 처리 | 입고 버튼 | 프론트 → API → SAP Interface → SAP → DB | store_copper(UPDATE) | 입고 상태 변경 |
| 엑셀 다운로드 | 다운로드 버튼 | 프론트 → API → 서비스 → DB → Excel | store_copper_supply_plan(조회) | 엑셀 파일 생성 |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- SAP Interface 의존도가 높아 SAP 시스템 장애 시 전체 기능 마비 위험
- 공급계획 입력 시 일별 31개 컬럼으로 구성된 테이블 구조의 확장성 제한
- 복잡한 권한 분기 로직이 컴포넌트에 하드코딩되어 유지보수 어려움
- SAP SOAP 호출 시 동기 방식으로 인한 응답 지연 문제
- 엑셀 다운로드 시 대량 데이터 처리 시 메모리 부족 위험
- 공급계획 계산 로직이 프론트엔드와 백엔드에 중복 구현됨

### 4.2 개선 요구사항
- SAP Interface 장애 대응을 위한 캐싱 및 비동기 처리 메커니즘 도입
- 공급계획 테이블 구조를 정규화하여 확장성 및 조회 성능 개선
- 권한 기반 UI 렌더링을 설정 파일 또는 공통 서비스로 추상화
- SAP Interface를 비동기 큐 기반으로 개선하여 응답성 향상
- 대용량 엑셀 처리를 위한 스트리밍 방식 도입
- 공급계획 계산 로직을 백엔드로 통합하여 일관성 확보
- 실시간 데이터 동기화를 위한 WebSocket 또는 SSE 도입 검토

### 4.3 개선 설계 제안

**1. 공급계획 테이블 정규화**
```sql
-- 기존: store_copper_supply_plan_calendar (day1~day31 컬럼)
-- 개선: store_copper_supply_plan_detail
CREATE TABLE store_copper_supply_plan_detail (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    supply_plan_id VARCHAR(50),
    plan_date DATE,
    domestic_ga1_quantity DECIMAL(15,3),
    domestic_ga2_quantity DECIMAL(15,3),
    -- ... 기타 수량 컬럼들
    created_date DATETIME,
    INDEX idx_supply_plan_date (supply_plan_id, plan_date)
);
```

**2. SAP Interface 비동기화**
```java
@Service
public class AsyncSapInterfaceService {
    @Async
    public CompletableFuture<List<SupplyPlan>> getSupplyPlanAsync(String planId, String month, String customerId) {
        // SAP 호출 로직
        return CompletableFuture.completedFuture(result);
    }
    
    @EventListener
    public void handleSapDataReceived(SapDataReceivedEvent event) {
        // 캐시 업데이트
        cacheManager.put("supply_plan_" + event.getPlanId(), event.getData());
    }
}
```

**3. 권한 기반 컴포넌트 설정**
```javascript
// auth-config.js
export const STORE_COPPER_TABS = {
  PARTNER: [
    { key: 'supply-plan', label: '공급계획등록', component: 'SupplyPlanStoreCopper' },
    { key: 'allocate', label: '배차/운송현황', component: 'AllocateStoreCopper' }
  ],
  SALES: [
    { key: 'supply-plan', label: '공급계획등록' },
    { key: 'allocate', label: '배차/운송현황' },
    { key: 'measure', label: '실중량산출등록' },
    { key: 'current', label: '전기동입고현황' }
  ],
  MEASURE_ONLY: [
    { key: 'measure', label: '실중량산출등록' }
  ]
};
```

**4. 스트리밍 엑셀 생성**
```java
@GetMapping("/supply-plan/{year}/{month}/download-stream")
public ResponseEntity<StreamingResponseBody> downloadSupplyPlanStream(
        @PathVariable String year, @PathVariable String month) {
    
    StreamingResponseBody stream = output -> {
        try (Workbook workbook = new SXSSFWorkbook(100)) { // 100행씩 메모리에 유지
            Sheet sheet = workbook.createSheet();
            
            storeCopperService.getSupplyPlanStream(year, month)
                .forEach(data -> writeRowToSheet(sheet, data));
                
            workbook.write(output);
        }
    };
    
    return ResponseEntity.ok()
        .header("Content-Disposition", "attachment; filename=supply-plan.xlsx")
        .body(stream);
}
```

이러한 개선사항들을 통해 시스템의 안정성, 성능, 확장성을 크게 향상시킬 수 있을 것입니다.