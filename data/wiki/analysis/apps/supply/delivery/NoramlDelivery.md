# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-22
- **분석자:** GitHub Copilot
- **분석 대상 소스:** 일반 전기동 자재 운송/배차 프로세스

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 일반 전기동 메인 | NormalStoreCopperMain | 컴포넌트 마운트 | mounted() | - | NormalStoreCopperMain.vue |
| 일반 전기동 레이아웃 | NormalStoreCopperLayout | 탭 클릭 | onClickTabButton() | - | NormalStoreCopperLayout.vue |
| 배차/운송현황 | AllocateNormalStoreCopper | 화면 활성화 | isShown watch | GET `/allocate-normal-store-copper/{start}/{end}` | AllocateNormalStoreCopper.vue |
| 배차/운송현황 | AllocateNormalStoreCopper | 행 클릭 | onClickRow() | - | AllocateNormalStoreCopper.vue |
| 배차/운송현황 | AllocateNormalStoreCopper | 체크박스 클릭 | onClickCheckbox() | - | AllocateNormalStoreCopper.vue |
| 배차/운송현황 | AllocateNormalStoreCopper | 날짜 선택 | onDateRangeSelected() | GET `/allocate-normal-store-copper/{start}/{end}` | AllocateNormalStoreCopper.vue |
| 배차/운송현황 | AllocateNormalStoreCopper | 엑셀 다운로드 | onClickExcelButton() | GET `/allocate-normal-store-copper/{start}/{end}/download` | AllocateNormalStoreCopper.vue |
| 배차/운송현황 | AllocateNormalStoreCopper | 등록 버튼 | onClickButton() | - | AllocateNormalStoreCopper.vue |
| 실중량산출등록 | MeasureNormalStoreCopper | 목록 조회 | fetchMeasureNormalStoreCopper() | GET `/measure-normal-store-copper/{start}/{end}` | - |
| 실중량산출등록 | MeasureNormalStoreCopper | 저장 | saveMeasureNormalStoreCopperInfo() | POST `/measure-normal-store-copper/save` | - |
| 전기동입고현황 | CurrentNormalStoreCopper | 목록 조회 | fetchCurrentNormalStoreCopper() | GET `/current-normal-store-copper/{start}/{end}` | - |
| 전기동입고현황 | CurrentNormalStoreCopper | 등급/중량 저장 | saveNormalStoreCopper() | POST `/current-normal-store-copper/save/{grade}/{finalWeight}` | - |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| NormalStoreCopperMain | NormalStoreCopperMain.vue | 일반 전기동 메인 화면 관리 | computed selectedTabIndex | - | props → NormalStoreCopperLayout |
| NormalStoreCopperLayout | NormalStoreCopperLayout.vue | 권한별 탭 구성 및 분기 | onClickTabButton() | - | 권한 체크 → 탭 표시 → 하위 컴포넌트 |
| AllocateNormalStoreCopper | AllocateNormalStoreCopper.vue | 배차/운송현황 관리 | fetchAllocateNormalStoreCopper(), onClickRow() | GET/POST `/allocate-normal-store-copper` | API → 정렬/필터 → 테이블 → 액션 |
| NormalStoreCopperHeader | NormalStoreCopperHeader.vue | 헤더 및 제목 표시 | - | - | props → 제목 표시 |
| NormalStoreCopperTableHeader | - | 테이블 헤더 및 액션 | deleteResult() | - | 선택 데이터 → 삭제 액션 |

## 2. 백엔드 분석

### 2.1 API 및 컨트롤러

| 엔드포인트 | 메소드 | 컨트롤러 | 핵심 로직 | 호출 서비스 | 응답 형식 |
|-----------|-------|----------|----------|------------|----------|
| `/api/v1/copperrod/normal-store-copper/allocate-normal-store-copper/{start}/{end}` | GET | SalesNormalStoreCopperController | 권한별 배차현황 조회 | normalStoreCopperService.getAllocateNormalStoreCopperList() | List\<StoreCopperResponse\> |
| `/api/v1/copperrod/normal-store-copper/allocate-normal-store-copper/{manageId}` | GET | SalesNormalStoreCopperController | 배차현황 상세 조회 | normalStoreCopperService.getNormalStoreCopperListDetail() | StoreCopperResponse |
| `/api/v1/copperrod/normal-store-copper/allocate-normal-store-copper/create` | POST | SalesNormalStoreCopperController | 배차정보 신규 등록 | normalStoreCopperService.createNormalStoreCopper() | StoreCopperResponse |
| `/api/v1/copperrod/normal-store-copper/allocate-normal-store-copper/save` | POST | SalesNormalStoreCopperController | 배차정보 수정 | normalStoreCopperService.saveNormalStoreCopperAllocation() | StoreCopper |
| `/api/v1/copperrod/normal-store-copper/allocate-normal-store-copper/create/excelUpload` | POST | SalesNormalStoreCopperController | 엑셀 일괄 등록 | normalStoreCopperService.createStoreCopperExcelUpload() | Boolean |
| `/api/v1/copperrod/normal-store-copper/measure-normal-store-copper/{start}/{end}` | GET | SalesNormalStoreCopperController | 실중량 산출현황 조회 | normalStoreCopperService.getMeasureNormalStoreCopperList() | List\<StoreCopperResponse\> |
| `/api/v1/copperrod/normal-store-copper/measure-normal-store-copper/save` | POST | SalesNormalStoreCopperController | 실중량 산출 저장 | normalStoreCopperService.saveNormalStoreCopperMeasure() | StoreCopper |
| `/api/v1/copperrod/normal-store-copper/current-normal-store-copper/{start}/{end}` | GET | SalesNormalStoreCopperController | 입고현황 조회 | normalStoreCopperService.getCurrentStoreCopperList() | List\<StoreCopperResponse\> |
| `/api/v1/copperrod/normal-store-copper/current-normal-store-copper/save/{grade}/{finalWeight}` | POST | SalesNormalStoreCopperController | 등급/마감중량 등록 | normalStoreCopperService.saveNormalStoreCopper() | StoreCopper |
| `/api/v1/copperrod/normal-store-copper/excel-upload-auth` | GET | SalesNormalStoreCopperController | 엑셀 업로드 권한 체크 | storeCopperService.getExcelUploadAuth() | String |

### 2.2 서비스 레이어

| 서비스 클래스 | 메소드 | 기능 설명 | 호출 레포지토리 | DB 작업 | 참조 파일 |
|--------------|-------|----------|---------------|---------|----------|
| NormalStoreCopperService | getAllocateNormalStoreCopperList | 권한별 배차현황 목록 조회 | normalStoreCopperRepository | SELECT VEHICLE_ALLOC_INFORM | NormalStoreCopperService.java |
| NormalStoreCopperService | getNormalStoreCopperListDetail | 배차현황 상세 조회 | normalStoreCopperRepository.findAllBymanageId | SELECT VEHICLE_ALLOC_INFORM | NormalStoreCopperService.java |
| NormalStoreCopperService | createNormalStoreCopper | 배차정보 신규 생성 | normalStoreCopperRepository.save | INSERT VEHICLE_ALLOC_INFORM | NormalStoreCopperService.java |
| NormalStoreCopperService | saveNormalStoreCopperAllocation | 배차정보 수정 | normalStoreCopperRepository.saveNormalStoreCopperAllocation | UPDATE VEHICLE_ALLOC_INFORM | NormalStoreCopperService.java |
| NormalStoreCopperService | createStoreCopperExcelUpload | 엑셀 일괄 등록 | normalStoreCopperRepository.save | INSERT VEHICLE_ALLOC_INFORM | NormalStoreCopperService.java |
| NormalStoreCopperService | getMeasureNormalStoreCopperList | 실중량 산출현황 조회 | normalStoreCopperRepository.findAllByIncomingDate | SELECT VEHICLE_ALLOC_INFORM | NormalStoreCopperService.java |
| NormalStoreCopperService | saveNormalStoreCopperMeasure | 실중량 산출 저장 | normalStoreCopperRepository.saveNormalStoreCopperMeasure | UPDATE VEHICLE_ALLOC_INFORM | NormalStoreCopperService.java |
| NormalStoreCopperService | saveNormalStoreCopper | 등급/마감중량 저장 | normalStoreCopperRepository.saveNormalStoreCopper | UPDATE VEHICLE_ALLOC_INFORM | NormalStoreCopperService.java |
| StoreCopperService | getExcelUploadAuth | 엑셀 업로드 권한 체크 | storeCopperRepository.getExcelUploadAuth | SELECT COMMON_STANDARD | StoreCopperService.java |

### 2.3 로직 흐름도

**일반 전기동 배차현황 조회 프로세스:**
1. 프론트엔드: AllocateNormalStoreCopper → isShown watch → fetchAllocateNormalStoreCopper()
2. API 호출: GET `/api/v1/copperrod/normal-store-copper/allocate-normal-store-copper/{start}/{end}`
3. 백엔드: SalesNormalStoreCopperController.getAllocateNormalStoreCopperList() → 권한 체크
4. 서비스: NormalStoreCopperService.getAllocateNormalStoreCopperList() → 권한별 분기 (masterYn)
5. 레포지토리: normalStoreCopperRepository.findAllBetweenAllocationDate() 또는 findAllBetweenAllocationDateShipCompanyId()
6. DB: VEHICLE_ALLOC_INFORM 테이블 조회 (ELE_COPPER_CLASS = 'A', FLAG <> 'P')
7. 프론트엔드: 데이터 매핑 → 정렬/필터 → 테이블 표시

**실중량 산출 등록 프로세스:**
1. 프론트엔드: 실중량 데이터 입력 → saveMeasureNormalStoreCopperInfo()
2. API 호출: POST `/api/v1/copperrod/normal-store-copper/measure-normal-store-copper/save`
3. 백엔드: SalesNormalStoreCopperController.saveNormalStoreCopperMeasure()
4. 서비스: NormalStoreCopperService.saveNormalStoreCopperMeasure()
5. 레포지토리: normalStoreCopperRepository.saveNormalStoreCopperMeasure()
6. DB: VEHICLE_ALLOC_INFORM 테이블 UPDATE (MEASURE_ID, COMPANY_WEIGHT, DIFF_WEIGHT, MARGIN_OF_ERROR 등)

**등급/마감중량 등록 프로세스:**
1. 프론트엔드: 등급/중량 입력 → saveNormalStoreCopper()
2. API 호출: POST `/api/v1/copperrod/normal-store-copper/current-normal-store-copper/save/{grade}/{finalWeight}`
3. 백엔드: SalesNormalStoreCopperController.saveNormalStoreCopper()
4. 서비스: NormalStoreCopperService.saveNormalStoreCopper() → 개별 중량 계산 (finalWeight / 건수)
5. 레포지토리: normalStoreCopperRepository.saveNormalStoreCopper() → 반복 실행
6. DB: VEHICLE_ALLOC_INFORM 테이블 UPDATE (GRADE, FINAL_WEIGHT)

## 3. 데이터베이스 분석

### 3.1 주요 테이블

| 테이블명 | 주요 컬럼 | 역할 | 관계 테이블 | 인덱스 |
|---------|----------|------|------------|--------|
| VEHICLE_ALLOC_INFORM | MANAGE_ID, ELE_COPPER_CLASS, ALLOCATION_DATE, INCOMING_DATE, ACTUAL_WEIGHT, MEASURE_ID, GRADE, FINAL_WEIGHT | 일반 전기동 배차/운송 정보 | PROJECT_USER | MANAGE_ID(PK) |
| COMMON_STANDARD | TYPE, CATEGORY, CODE, VALUE | 시스템 설정 (엑셀 업로드 권한) | - | (TYPE,CATEGORY,CODE) 복합키 |

### 3.2 데이터 흐름

| 기능 | 시작점 | 데이터 흐름 | 변경/조회 테이블 | 결과 |
|------|-------|------------|-----------------|------|
| 배차현황 조회 | 화면 로드/날짜 변경 | 프론트 → API → 권한체크 → DB | VEHICLE_ALLOC_INFORM (조회, ELE_COPPER_CLASS='A') | 일반 전기동 배차현황 목록 |
| 배차정보 등록 | 등록 버튼 | 폼 입력 → API → 서비스 → DB | VEHICLE_ALLOC_INFORM (INSERT) | 신규 배차정보 생성 |
| 배차정보 수정 | 행 클릭 → 수정 | 폼 수정 → API → 서비스 → DB | VEHICLE_ALLOC_INFORM (UPDATE) | 배차정보 업데이트 |
| 실중량 산출 | 실중량 입력 → 저장 | 폼 데이터 → API → 서비스 → DB | VEHICLE_ALLOC_INFORM (UPDATE, MEASURE 관련 컬럼) | 실중량 정보 저장 |
| 등급/중량 등록 | 등급/중량 입력 → 저장 | 폼 데이터 → API → 개별중량계산 → DB | VEHICLE_ALLOC_INFORM (UPDATE, GRADE, FINAL_WEIGHT) | 등급/개별중량 저장 |
| 엑셀 일괄등록 | 파일 업로드 | 엑셀 파싱 → 검증 → API → 배치처리 | VEHICLE_ALLOC_INFORM (INSERT) | 대량 데이터 등록 |
| 권한 체크 | 화면/기능 접근 | 로그인ID → 권한 조회 | COMMON_STANDARD (조회) | 기능 활성화/비활성화 |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 수탁 전기동과 일반 전기동이 같은 테이블(VEHICLE_ALLOC_INFORM)을 사용하나 ELE_COPPER_CLASS로만 구분되어 데이터 무결성 위험
- 권한별 화면 분기 로직이 복잡하고 중복되어 유지보수 어려움 (isCopperRodMeasure, isCopperRodShipCompany 등)
- 일반 전기동은 SAP Interface가 없어 입고 처리가 단순하지만, 수탁과 혼재되어 로직 복잡성 증가
- 엑셀 파일 파싱 및 검증 로직이 프론트엔드에만 있어 서버 검증 부족
- 실중량 산출 시 개별 중량 계산 로직이 단순 나눗셈으로 되어 있어 정밀도 문제 가능성
- 등급 정보가 단순 문자열로 관리되어 표준화되지 않음

### 4.2 개선 요구사항
- 수탁/일반 전기동 데이터를 테이블 레벨에서 분리하여 데이터 무결성 강화
- 권한 기반 UI 렌더링을 설정 파일로 추상화하여 코드 중복 제거
- 일반 전기동 전용 비즈니스 로직을 별도 서비스로 분리
- 서버 사이드 엑셀 검증 및 배치 처리 최적화
- 실중량 산출 시 반올림 규칙 및 오차 처리 로직 개선
- 등급 정보를 코드 테이블로 관리하여 표준화
- 데이터 이력 관리를 위한 감사 로그 기능 추가

### 4.3 개선 설계 제안

**1. 테이블 분리 설계**
```sql
-- 일반 전기동 전용 테이블
CREATE TABLE NORMAL_COPPER_ALLOCATION (
    manage_id VARCHAR(50) PRIMARY KEY,
    supplier_id VARCHAR(50),
    supplier_name VARCHAR(100),
    bl_no VARCHAR(50),
    vehicle_no VARCHAR(20),
    allocation_date DATE,
    incoming_date DATE,
    actual_weight DECIMAL(15,3),
    measure_weight DECIMAL(15,3),
    final_weight DECIMAL(15,3),
    grade_code VARCHAR(10),
    created_date DATETIME,
    created_by VARCHAR(50)
);

-- 등급 코드 테이블
CREATE TABLE COPPER_GRADE_CODE (
    grade_code VARCHAR(10) PRIMARY KEY,
    grade_name VARCHAR(50),
    sort_order INT,
    is_active CHAR(1) DEFAULT 'Y'
);
```

**2. 권한별 컴포넌트 설정**
```javascript
// normal-copper-auth-config.js
export const NORMAL_COPPER_TAB_CONFIG = {
  SALES: [
    { key: 'allocate', label: '배차/운송현황', component: 'AllocateNormalStoreCopper' },
    { key: 'measure', label: '실중량산출등록', component: 'MeasureNormalStoreCopper' },
    { key: 'current', label: '전기동입고현황', component: 'CurrentNormalStoreCopper' }
  ],
  SHIP_COMPANY: [
    { key: 'allocate', label: '배차/운송현황' }
  ],
  MEASURE_ONLY: [
    { key: 'measure', label: '실중량산출등록' }
  ]
};
```

**3. 실중량 계산 로직 개선**
```java
@Service
public class WeightCalculationService {
    
    public List<IndividualWeight> calculateIndividualWeights(double totalWeight, int count) {
        List<IndividualWeight> weights = new ArrayList<>();
        
        // 소수점 3자리까지 정밀 계산
        BigDecimal total = BigDecimal.valueOf(totalWeight);
        BigDecimal countDecimal = BigDecimal.valueOf(count);
        BigDecimal baseWeight = total.divide(countDecimal, 3, RoundingMode.HALF_UP);
        
        // 나머지 분배 계산
        BigDecimal remainder = total.subtract(baseWeight.multiply(countDecimal));
        
        for (int i = 0; i < count; i++) {
            BigDecimal individualWeight = baseWeight;
            if (i < remainder.multiply(BigDecimal.valueOf(1000)).intValue()) {
                individualWeight = individualWeight.add(BigDecimal.valueOf(0.001));
            }
            weights.add(new IndividualWeight(i, individualWeight.doubleValue()));
        }
        
        return weights;
    }
}
```

**4. 감사 로그 기능**
```java
@Entity
@Table(name = "NORMAL_COPPER_AUDIT_LOG")
public class NormalCopperAuditLog {
    @Id
    private String logId;
    private String manageId;
    private String actionType; // INSERT, UPDATE, DELETE
    private String tableName;
    private String beforeData;
    private String afterData;
    private String userId;
    private LocalDateTime actionDate;
}

@Service
public class AuditLogService {
    public void logDataChange(String manageId, String actionType, Object beforeData, Object afterData, String userId) {
        // 감사 로그 저장 로직
    }
}
```

**5. 서버 사이드 엑셀 검증**
```java
@Service
public class NormalCopperExcelValidationService {
    
    public ValidationResult validateNormalCopperExcel(List<NormalCopperRequest> requests) {
        ValidationResult result = new ValidationResult();
        
        for (int i = 0; i < requests.size(); i++) {
            NormalCopperRequest request = requests.get(i);
            int rowNumber = i + 6;
            
            // 필수 필드 검증
            if (StringUtils.isBlank(request.getSupplierName())) {
                result.addError(rowNumber, "공급사명은 필수입니다.");
            }
            
            // 중량 범위 검증
            if (request.getActualWeight() != null && 
                (request.getActualWeight() <= 0 || request.getActualWeight() > 50000)) {
                result.addError(rowNumber, "실중량은 0보다 크고 50톤 이하여야 합니다.");
            }
            
            // 등급 코드 검증
            if (!isValidGradeCode(request.getGrade())) {
                result.addError(rowNumber, "유효하지 않은 등급 코드입니다.");
            }
        }
        
        return result;
    }
}
```

이러한 개선사항들을 통해 일반 전기동 관리 시스템의 데이터 무결성, 성능, 유지보수성을 크게 향상시킬 수 있을 것입니다.