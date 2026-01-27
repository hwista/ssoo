# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-22
- **분석자:** GitHub Copilot  
- **분석 대상 소스:** 수탁 전기동 자재 배차/운송 정보 관리 프로세스

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 배차현황 메인 | AllocateStoreCopper | 화면 활성화 | isShown watch | GET `/allocate-store-copper/{start}/{end}` | AllocateStoreCopper.vue |
| 배차현황 목록 | BaseTable | 행 클릭 | onClickRow() | - | AllocateStoreCopper.vue |
| 배차현황 목록 | BaseTable | 체크박스 클릭 | onClickCheckbox() | - | AllocateStoreCopper.vue |
| 배차현황 목록 | 검색 필드 | 검색어 입력 | onChangeSearchKeyword() | - | AllocateStoreCopper.vue |
| 배차현황 목록 | 날짜 선택기 | 기간 변경 | onDateRangeSelected() | GET `/allocate-store-copper/{start}/{end}` | AllocateStoreCopper.vue |
| 배차현황 액션 | 등록 버튼 | 버튼 클릭 | onClickButton() | - | AllocateStoreCopper.vue |
| 배차현황 액션 | 엑셀 다운로드 | 버튼 클릭 | onClickExcelButton() | GET `/allocate-store-copper/{start}/{end}/download` | AllocateStoreCopper.vue |
| 배차현황 액션 | 일괄 등록 버튼 | 버튼 클릭 | onClickUploadButton() | - | AllocateStoreCopper.vue |
| 배차현황 액션 | 파일 업로드 | 파일 선택 | handleFileUpload() | POST `/allocate-store-copper/create/excelUpload` | AllocateStoreCopper.vue |
| 배차/운송 등록 | 저장 버튼 | 버튼 클릭 | saveStoreCopperAllocation() | POST `/allocate-store-copper/save` | - |
| 배차/운송 등록 | 신규 등록 | 버튼 클릭 | createAllocateStoreCopperInfo() | POST `/allocate-store-copper/create` | - |
| 배차현황 삭제 | 삭제 버튼 | 버튼 클릭 | deleteResult() | POST `/allocate-store-copper/delete` | AllocateStoreCopper.vue |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| StoreCopperMain | StoreCopperMain.vue | 수탁 전기동 메인 화면 관리 | - | - | props → StoreCopperLayout |
| StoreCopperLayout | StoreCopperLayout.vue | 권한별 탭 구성 및 분기 | onClickTabButton() | - | 권한 체크 → 탭 표시 → 하위 컴포넌트 |
| AllocateStoreCopper | AllocateStoreCopper.vue | 배차현황 목록/등록/엑셀 관리 | fetchAllocateStoreCopper(), onClickRow(), handleFileUpload() | GET/POST `/allocate-store-copper` | API → 정렬/필터 → 테이블 → 액션 |
| StoreCopperTableHeader | - | 테이블 헤더 및 액션 버튼 | deleteResult() | - | 선택 데이터 → 삭제 액션 |
| BaseTable | - | 데이터 테이블 렌더링 | onClickCheckbox(), onClickRow() | - | 데이터 → 행/체크박스 이벤트 |
| DateRangePickerMonthLimit | - | 날짜 범위 선택기 | onDateRangeSelected() | - | 날짜 선택 → 부모 컴포넌트 |

## 2. 백엔드 분석

### 2.1 API 및 컨트롤러

| 엔드포인트 | 메소드 | 컨트롤러 | 핵심 로직 | 호출 서비스 | 응답 형식 |
|-----------|-------|----------|----------|------------|----------|
| `/api/v1/copperrod/store-copper/allocate-store-copper/{start}/{end}` | GET | SalesStoreCopperController | 배차현황 조회, 권한별 필터링 | storeCopperService.getAllocateStoreCopperList() | List\<StoreCopperResponse\> |
| `/api/v1/copperrod/store-copper/allocate-store-copper/{manageId}` | GET | SalesStoreCopperController | 배차현황 상세 조회 | storeCopperService.getStoreCopperListDetail() | StoreCopperResponse |
| `/api/v1/copperrod/store-copper/allocate-store-copper/create` | POST | SalesStoreCopperController | 배차정보 신규 등록 | storeCopperService.createStoreCopper() | StoreCopperResponse |
| `/api/v1/copperrod/store-copper/allocate-store-copper/save` | POST | SalesStoreCopperController | 배차정보 수정 | storeCopperService.saveStoreCopperAllocation() | StoreCopper |
| `/api/v1/copperrod/store-copper/allocate-store-copper/delete` | POST | SalesStoreCopperController | 배차정보 삭제 | storeCopperService.deleteStoreCopperShipment() | StoreCopper |
| `/api/v1/copperrod/store-copper/allocate-store-copper/create/excelUpload` | POST | SalesStoreCopperController | 엑셀 일괄 등록 | storeCopperService.createStoreCopperExcelUpload() | Boolean |
| `/api/v1/copperrod/store-copper/allocate-store-copper/{start}/{end}/download` | GET | SalesStoreCopperController | 엑셀 다운로드 | getShipStoreCopperList(), ExcelGenerator | Binary Stream |
| `/api/v1/copperrod/store-copper/excel-upload-auth` | GET | SalesStoreCopperController | 엑셀 업로드 권한 체크 | storeCopperService.getExcelUploadAuth() | String |

### 2.2 서비스 레이어

| 서비스 클래스 | 메소드 | 기능 설명 | 호출 레포지토리 | DB 작업 | 참조 파일 |
|--------------|-------|----------|---------------|---------|----------|
| StoreCopperService | getAllocateStoreCopperList | 권한별 배차현황 목록 조회 | storeCopperRepository | SELECT VEHICLE_ALLOC_INFORM | StoreCopperService.java |
| StoreCopperService | getStoreCopperListDetail | 배차현황 상세 조회 | storeCopperRepository.findAllBymanageId | SELECT VEHICLE_ALLOC_INFORM | StoreCopperService.java |
| StoreCopperService | createStoreCopper | 배차정보 신규 생성 | storeCopperRepository.save | INSERT VEHICLE_ALLOC_INFORM | StoreCopperService.java |
| StoreCopperService | saveStoreCopperAllocation | 배차정보 수정 | storeCopperRepository.saveStoreCopperAllocation | UPDATE VEHICLE_ALLOC_INFORM | StoreCopperService.java |
| StoreCopperService | deleteStoreCopperShipment | 배차정보 삭제 | storeCopperRepository.deleteStoreCopperShipment | DELETE VEHICLE_ALLOC_INFORM | StoreCopperService.java |
| StoreCopperService | createStoreCopperExcelUpload | 엑셀 일괄 등록 | storeCopperRepository.save | INSERT VEHICLE_ALLOC_INFORM | StoreCopperService.java |
| StoreCopperService | getExcelUploadAuth | 엑셀 업로드 권한 체크 | storeCopperRepository.getExcelUploadAuth | SELECT COMMON_STANDARD | StoreCopperService.java |

### 2.3 로직 흐름도

**배차현황 조회 프로세스:**
1. 프론트엔드: AllocateStoreCopper → mounted/isShown → fetchAllocateStoreCopper()
2. API 호출: GET `/api/v1/copperrod/store-copper/allocate-store-copper/{start}/{end}`
3. 백엔드: SalesStoreCopperController.getAllocateStoreCopperList() → 권한 체크 (PARTNER/SALES)
4. 서비스: StoreCopperService.getAllocateStoreCopperList() → 권한별 분기 (masterYn)
5. 레포지토리: storeCopperRepository.findAllBetweenAllocationDate() 또는 findAllBetweenAllocationDateCustomerId()
6. DB: VEHICLE_ALLOC_INFORM 테이블 조회 → 결과 반환
7. 프론트엔드: 데이터 매핑 → 정렬/필터 → 테이블 표시

**엑셀 일괄 등록 프로세스:**
1. 프론트엔드: 파일 선택 → handleFileUpload() → XLSX.read()
2. 엑셀 파싱: makeColumn() → 데이터 변환 → validationResult() → 유효성 검증
3. API 호출: POST `/api/v1/copperrod/store-copper/allocate-store-copper/create/excelUpload`
4. 백엔드: SalesStoreCopperController.createStoreCopperExcelUpload()
5. 서비스: StoreCopperService.createStoreCopperExcelUpload() → 배치 처리
6. 레포지토리: storeCopperRepository.save() → 반복 실행
7. DB: VEHICLE_ALLOC_INFORM 테이블 대량 INSERT
8. 프론트엔드: 결과 알림 → 목록 새로고침

**배차정보 등록/수정 프로세스:**
1. 프론트엔드: 등록 버튼 → AllocateStoreCopperSheet 라우팅
2. 폼 입력 → createAllocateStoreCopperInfo() 또는 saveAllocateStoreCopperInfo()
3. API 호출: POST `/allocate-store-copper/create` 또는 `/allocate-store-copper/save`
4. 백엔드: 신규/수정 분기 → StoreCopperService 호출
5. 서비스: createStoreCopper() 또는 saveStoreCopperAllocation()
6. 레포지토리: INSERT 또는 UPDATE VEHICLE_ALLOC_INFORM
7. 공급업체 ID 조회: storeCopperRepository.getSupplierId() → PROJECT_USER 조인
8. 결과 반환 → 화면 갱신

## 3. 데이터베이스 분석

### 3.1 주요 테이블

| 테이블명 | 주요 컬럼 | 역할 | 관계 테이블 | 인덱스 |
|---------|----------|------|------------|--------|
| VEHICLE_ALLOC_INFORM | MANAGE_ID, CUSTOMER_ID, ALLOCATION_DATE, INCOMING_DATE, ACTUAL_WEIGHT, FLAG | 배차/운송 정보 관리 | PROJECT_USER | MANAGE_ID(PK) |
| PROJECT_USER | ID, SUPPLIER_ID | 고객-공급업체 매핑 | VEHICLE_ALLOC_INFORM | ID(PK) |
| COMMON_STANDARD | TYPE, CATEGORY, CODE, VALUE | 시스템 설정 (엑셀 업로드 권한) | - | (TYPE,CATEGORY,CODE) 복합키 |

### 3.2 데이터 흐름

| 기능 | 시작점 | 데이터 흐름 | 변경/조회 테이블 | 결과 |
|------|-------|------------|-----------------|------|
| 배차현황 조회 | 화면 로드/날짜 변경 | 프론트 → API → 권한체크 → DB | VEHICLE_ALLOC_INFORM (조회) | 배차현황 목록 표시 |
| 배차정보 등록 | 등록 버튼 | 폼 입력 → API → 서비스 → DB | VEHICLE_ALLOC_INFORM (INSERT), PROJECT_USER (조회) | 신규 배차정보 생성 |
| 배차정보 수정 | 행 클릭 → 수정 | 폼 수정 → API → 서비스 → DB | VEHICLE_ALLOC_INFORM (UPDATE) | 배차정보 업데이트 |
| 배차정보 삭제 | 체크박스 선택 → 삭제 | 선택 목록 → API → 서비스 → DB | VEHICLE_ALLOC_INFORM (DELETE) | 선택 데이터 삭제 |
| 엑셀 일괄등록 | 파일 업로드 | 엑셀 파싱 → 검증 → API → 배치처리 | VEHICLE_ALLOC_INFORM (INSERT) | 대량 데이터 등록 |
| 엑셀 다운로드 | 다운로드 버튼 | API → 데이터 조회 → 엑셀 생성 | VEHICLE_ALLOC_INFORM (조회) | 엑셀 파일 생성 |
| 권한 체크 | 화면/기능 접근 | 로그인ID → 권한 조회 | COMMON_STANDARD (조회) | 기능 활성화/비활성화 |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 엑셀 업로드 시 클라이언트 사이드에서만 유효성 검증이 이루어져 서버 검증 누락 위험
- 권한별 화면 분기 로직이 여러 컴포넌트에 중복되어 유지보수 어려움 (StoreCopperLayout.vue)
- 엑셀 파일 파싱 로직이 프론트엔드에 하드코딩되어 있어 포맷 변경 시 배포 필요
- VEHICLE_ALLOC_INFORM 테이블의 대량 데이터 처리 시 성능 이슈 가능성
- 배차/운송 상태 관리가 FLAG 컬럼 하나로만 이루어져 상태 추적 한계
- 엑셀 다운로드 시 대용량 데이터 처리에 대한 메모리 최적화 부족

### 4.2 개선 요구사항
- 서버 사이드 엑셀 유효성 검증 로직 추가 및 배치 처리 최적화
- 권한 기반 UI 렌더링을 공통 서비스로 추상화하여 코드 중복 제거
- 엑셀 템플릿 및 파싱 로직을 서버로 이동하여 유연성 확보
- 데이터베이스 인덱스 최적화 및 페이징 처리 강화
- 배차/운송 상태를 별도 테이블로 분리하여 이력 관리 기능 추가
- 스트리밍 방식 엑셀 다운로드 및 비동기 처리 도입
- 실시간 데이터 동기화를 위한 WebSocket 도입 검토

### 4.3 개선 설계 제안

**1. 서버 사이드 엑셀 검증 강화**
```java
@Service
public class ExcelValidationService {
    public ValidationResult validateStoreCopperExcel(List<StoreCopperRequest> requests) {
        ValidationResult result = new ValidationResult();
        
        for (int i = 0; i < requests.size(); i++) {
            StoreCopperRequest request = requests.get(i);
            int rowNumber = i + 6; // 6행부터 시작
            
            // 서버 사이드 검증 로직
            if (!isValidDomesticIncome(request.getDomesticIncome())) {
                result.addError(rowNumber, "국산/수입구분이 올바르지 않습니다.");
            }
            // ... 기타 검증 로직
        }
        
        return result;
    }
}
```

**2. 권한 기반 컴포넌트 설정**
```javascript
// auth-component-config.js
export const STORE_COPPER_TAB_CONFIG = {
  SALES: [
    { key: 'supply-plan', label: '공급계획등록', component: 'SupplyPlanStoreCopper' },
    { key: 'allocate', label: '배차/운송현황', component: 'AllocateStoreCopper' },
    { key: 'measure', label: '실중량산출등록', component: 'MeasureStoreCopper' },
    { key: 'current', label: '전기동입고현황', component: 'CurrentStoreCopper' }
  ],
  PARTNER: [
    { key: 'supply-plan', label: '공급계획등록' },
    { key: 'allocate', label: '배차/운송현황' }
  ],
  MEASURE_ONLY: [
    { key: 'measure', label: '실중량산출등록' }
  ]
};
```

**3. 배차 상태 이력 테이블 추가**
```sql
CREATE TABLE VEHICLE_ALLOC_STATUS_HIST (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    manage_id VARCHAR(50),
    status_code VARCHAR(20),
    status_name VARCHAR(50),
    changed_date DATETIME,
    changed_by VARCHAR(50),
    remark TEXT,
    INDEX idx_manage_id_date (manage_id, changed_date)
);
```

**4. 스트리밍 엑셀 다운로드**
```java
@GetMapping("/allocate-store-copper/{start}/{end}/download-stream")
public ResponseEntity<StreamingResponseBody> downloadStoreCopperStream(
        @PathVariable String start, @PathVariable String end) {
    
    StreamingResponseBody stream = output -> {
        try (Workbook workbook = new SXSSFWorkbook(1000)) {
            Sheet sheet = workbook.createSheet();
            
            // 스트리밍 방식으로 데이터 처리
            storeCopperService.getAllocateStoreCopperStream(start, end)
                .forEach(data -> writeRowToSheet(sheet, data));
                
            workbook.write(output);
        }
    };
    
    return ResponseEntity.ok()
        .header("Content-Disposition", "attachment; filename=allocate-store-copper.xlsx")
        .body(stream);
}
```

이러한 개선사항들을 통해 시스템의 안정성, 성능, 유지보수성을 크게 향상시킬 수 있을 것입니다.