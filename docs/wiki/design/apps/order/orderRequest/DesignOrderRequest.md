# 기능 개발 설계서 - 주문 프로세스 검증 강화

## 기본 정보
- **작성일자:** 2024-12-27
- **작성자:** GitHub Copilot
- **요구사항 제목:** 주문 프로세스 검증 로직 강화 및 자재코드 통합 대응
- **요구사항 분류:** 기능개선
- **우선순위:** High
- **예상 개발 기간:** 6주

---
## 설계 반영 대상 소스 및 클래스/메서드/테이블 목록

### 1. 백엔드 소스

- Entity 클래스
    - OrderSalesPlan
    - DailyOrderLimit
    - CopperItemGradeMapping
    - SystemConfig
    - OrderValidationLog

- DTO 클래스
    - OrderValidationRequest
    - OrderValidationResponse

- Repository 클래스
    - OrderSalesPlanRepository
    - DailyOrderLimitRepository
    - CopperItemGradeMappingRepository
    - SystemConfigRepository

- Service 클래스
    - OrderValidationService
        - validateComprehensive()
        - validateSalesPlan()
        - validateDailyLimit()
        - validateSupplyPlan()
        - validateOrderTimeLimit()
    - CopperGradeService
        - getGradesByItemCode()
        - isValidGrade()
        - isCopperTeam()
    - SystemConfigService
        - getConfigValue()
        - updateConfigValue()

- Controller 클래스
    - OrderValidationController
        - validateSalesPlan()
        - validateDailyLimit()
        - validateSupplyPlan()
        - validateComprehensive()
    - CopperGradeController
        - getGradesByItemCode()
        - createGradeMapping()
    - SystemConfigController
        - getConfigByCategory()
        - createConfig()

- 기존 클래스 수정
    - OrderService
        - createOrder() (통합 검증 로직 추가)
    - ProductService
        - getProductsWithGrades() (신규)
    - StoreCopperService
        - 공급계획 검증 시 설정값 참조

### 2. 데이터베이스 테이블

- 신규 테이블
    - SALES_PLAN_INTERFACE
    - ORDER_SALES_PLAN
    - DAILY_ORDER_LIMIT_INTERFACE
    - DAILY_ORDER_LIMIT
    - COPPER_ITEM_GRADE_MAPPING
    - SYSTEM_CONFIG
    - ORDER_VALIDATION_LOG

- 기존 테이블 변경
    - orders (grade_code 컬럼 추가)
    - order_items (grade_code 컬럼 추가)

### 3. 프론트엔드 소스

- 신규 컴포넌트
    - GradeSelector
    - OrderValidationAlert
    - SystemConfigForm
    - ValidationStatusBadge

- 기존 컴포넌트 수정
    - OrderSheetItemList (gradeCode 필드 추가)
    - ProductDropdown (등급 정보 포함 옵션)
    - OrderSummary (검증 결과 요약 표시)

- Store 모듈
    - orderValidation (신규)
    - copperGrade (신규)
    - systemConfig (신규)
    - orderSheetPartner (gradeCode 필드 추가)
    - product (fetchProductsWithGrades 액션 추가)

- Service 레이어
    - order-validation-service
    - copper-grade-service
    - system-config-service
    - order-service (createOrderSheet()에 검증 로직 추가)
    - product-service (fetchProductsWithGrades() 함수 추가)
---

## 요구사항별 소스 코드 및 테이블 목록

| 요구사항 | 소스/테이블 | 신규/수정 | 비고 |
|----------|-------------|-----------|------|
| 판매계획 검증 | OrderSalesPlan (Entity) | 신규 | 주문-판매계획 관리 |
|  | OrderSalesPlanRepository | 신규 | 데이터 접근 |
|  | OrderValidationService.validateSalesPlan() | 신규 | 검증 로직 |
|  | OrderValidationController.validateSalesPlan() | 신규 | API |
|  | SALES_PLAN_INTERFACE (Table) | 신규 | 외부 인터페이스 |
|  | ORDER_SALES_PLAN (Table) | 신규 | 주문-판매계획 |
| 일일 주문제한량 검증 | DailyOrderLimit (Entity) | 신규 | 일일제한량 관리 |
|  | DailyOrderLimitRepository | 신규 | 데이터 접근 |
|  | OrderValidationService.validateDailyLimit() | 신규 | 검증 로직 |
|  | OrderValidationController.validateDailyLimit() | 신규 | API |
|  | DAILY_ORDER_LIMIT_INTERFACE (Table) | 신규 | 외부 인터페이스 |
|  | DAILY_ORDER_LIMIT (Table) | 신규 | 일일제한량 |
| 공급계획 검증 | OrderValidationService.validateSupplyPlan() | 신규 | 검증 로직 |
|  | OrderValidationController.validateSupplyPlan() | 신규 | API |
| 주문 확정 가능 시기 제한 | SystemConfig (Entity) | 신규 | 설정값 관리 |
|  | SystemConfigRepository | 신규 | 데이터 접근 |
|  | SystemConfigService | 신규 | 설정 관리 서비스 |
|  | OrderValidationService.validateOrderTimeLimit() | 신규 | 검증 로직 |
|  | SYSTEM_CONFIG (Table) | 신규 | 설정값 관리 |
| 소재 자재-등급 매핑 | CopperItemGradeMapping (Entity) | 신규 | 등급 매핑 관리 |
|  | CopperItemGradeMappingRepository | 신규 | 데이터 접근 |
|  | CopperGradeService | 신규 | 등급 관리 서비스 |
|  | CopperGradeController | 신규 | API |
|  | COPPER_ITEM_GRADE_MAPPING (Table) | 신규 | 등급 매핑 |
| 시스템 설정값 중앙화 | SystemConfig (Entity) | 신규 | 설정값 관리 |
|  | SystemConfigRepository | 신규 | 데이터 접근 |
|  | SystemConfigService | 신규 | 설정 관리 서비스 |
|  | SystemConfigController | 신규 | API |
|  | SYSTEM_CONFIG (Table) | 신규 | 설정값 관리 |
| 검증 이력 관리 | OrderValidationLog (Entity) | 신규 | 검증 이력 관리 |
|  | OrderValidationLogRepository | 신규 | 데이터 접근 |
|  | ORDER_VALIDATION_LOG (Table) | 신규 | 검증 이력 |
| 주문 생성 시 통합 검증 | OrderService.createOrder() | 수정 | 검증 로직 추가 |
|  | OrderValidationService.validateComprehensive() | 신규 | 통합 검증 |
|  | OrderValidationController.validateComprehensive() | 신규 | API |
| 주문 테이블 등급 정보 | orders (Table) | 수정 | grade_code 컬럼 추가 |
|  | order_items (Table) | 수정 | grade_code 컬럼 추가 |
| 프론트엔드 등급 선택 | GradeSelector (Component) | 신규 | 등급 선택 UI |
|  | OrderSheetItemList (Component) | 수정 | gradeCode 필드 추가 |
|  | ProductDropdown (Component) | 수정 | 등급 정보 포함 옵션 |
|  | OrderSummary (Component) | 수정 | 검증 결과 표시 |
| 프론트엔드 검증 결과 표시 | OrderValidationAlert (Component) | 신규 | 검증 결과 알림 |
|  | ValidationStatusBadge (Component) | 신규 | 검증 상태 표시 |
| 프론트엔드 상태 관리 | orderValidation (Store) | 신규 | 검증 상태 관리 |
|  | copperGrade (Store) | 신규 | 등급 정보 관리 |
|  | systemConfig (Store) | 신규 | 설정값 관리 |
|  | orderSheetPartner (Store) | 수정 | gradeCode 필드 추가 |
|  | product (Store) | 수정 | fetchProductsWithGrades 액션 추가 |
| 프론트엔드 서비스 | order-validation-service | 신규 | 검증 API 연동 |
|  | copper-grade-service | 신규 | 등급 API 연동 |
|  | system-config-service | 신규 | 설정 API 연동 |
|  | order-service | 수정 | 검증 로직 추가 |
|  | product-service | 수정 | 등급 정보 포함 조회 함수 추가 |

## 1. 요구사항 분석

### 1.1 기능 개요
```
기존 주문 프로세스에 다층 검증 로직을 추가하여 판매계획, 일일 주문제한량, 공급계획을 통합 검증하는 시스템으로 개선.
소재 부서 자재코드 통합에 따른 등급별 관리 체계 도입 및 시스템 설정값 중앙화 관리.
```

### 1.2 상세 요구사항
- **기능 요구사항**
  - [ ] 판매계획 데이터 인터페이스 및 주문 시 검증
  - [ ] 일일 주문제한량 데이터 인터페이스 및 실시간 검증
  - [ ] 수탁 전기동 공급계획 존재 여부 및 계획량 검증
  - [ ] 주문 확정 가능 시기 제한 (설정 가능한 일수)
  - [ ] 소재 부서 자재-등급 매핑 테이블 참조 체계
  - [ ] 시스템 설정값 중앙화 관리 기능

- **비기능 요구사항**
  - [ ] 외부 시스템 인터페이스 장애 시에도 기존 기능 유지
  - [ ] 검증 로직 수행 시간 1초 이내
  - [ ] 다른 부서 주문 프로세스에 영향 없음

### 1.3 제약사항 및 고려사항
- **제약사항**
  - 기존 주문 테이블 구조 변경 최소화
  - 다른 부서(비소재) 주문 프로세스 호환성 유지
  - 외부 시스템 인터페이스 의존성 최소화

- **고려사항**
  - 판매계획/일일제한량 데이터의 정합성 및 실시간성
  - 수탁 전기동과 일반 자재의 명확한 분기 처리
  - 향후 추가될 검증 로직에 대한 확장성

---

## 2. 데이터베이스 설계

### 2.1 신규 테이블 설계

| 테이블명 | 용도 | 주요 컬럼 | 관계 | 비고 |
|---------|------|----------|------|------|
| SALES_PLAN_INTERFACE | 판매계획 인터페이스 데이터 | interface_id, partner_code, item_code, grade_code, plan_quantity, plan_year_month | ORDER_SALES_PLAN | 외부시스템 → 인터페이스 |
| ORDER_SALES_PLAN | 주문-판매계획 관리 | plan_id, partner_code, item_code, grade_code, sales_plan_quantity, order_plan_quantity, plan_year_month | orders | 판매계획 + 주문계획 통합 |
| DAILY_ORDER_LIMIT_INTERFACE | 일일주문제한량 인터페이스 | interface_id, item_code, grade_code, daily_limit_quantity, limit_date | DAILY_ORDER_LIMIT | 외부시스템 → 인터페이스 |
| DAILY_ORDER_LIMIT | 일일주문제한량 관리 | limit_id, item_code, grade_code, daily_limit_quantity, limit_date | orders | 일일 제한량 관리 |
| COPPER_ITEM_GRADE_MAPPING | 소재 자재-등급 매핑 | item_code, grade_code, grade_name, is_active | orders, ORDER_SALES_PLAN | 소재 부서 자재 등급 관리 |
| SYSTEM_CONFIG | 시스템 설정값 관리 | config_id, config_category, config_key, config_value, description | - | 시스템 설정 중앙화 |
| ORDER_VALIDATION_LOG | 주문 검증 이력 | log_id, order_id, validation_type, validation_result, error_message | orders | 검증 이력 추적 |

### 2.2 기존 테이블 변경

| 테이블명 | 변경 유형 | 변경 내용 | 영향도 | 비고 |
|---------|----------|----------|--------|------|
| orders | 컬럼 추가 | grade_code VARCHAR(10) | Medium | 소재 부서 주문 시 등급 정보 |
| order_items | 컬럼 추가 | grade_code VARCHAR(10) | Medium | 주문 아이템별 등급 정보 |

### 2.3 인덱스 설계

| 테이블명 | 인덱스명 | 대상 컬럼 | 유형 | 목적 |
|---------|----------|----------|------|------|
| ORDER_SALES_PLAN | idx_order_plan_unique | (partner_code, item_code, grade_code, plan_year_month) | UNIQUE | 주문계획 유니크 키 |
| DAILY_ORDER_LIMIT | idx_daily_limit_item_date | (item_code, grade_code, limit_date) | UNIQUE | 일일제한량 조회 최적화 |
| COPPER_ITEM_GRADE_MAPPING | idx_copper_grade_active | (item_code, is_active) | NORMAL | 등급 매핑 조회 최적화 |
| SYSTEM_CONFIG | idx_config_category_key | (config_category, config_key) | UNIQUE | 설정값 조회 최적화 |
| ORDER_VALIDATION_LOG | idx_validation_order_type | (order_id, validation_type) | NORMAL | 검증 이력 조회 |

### 2.4 데이터 마이그레이션 계획
- **마이그레이션 대상**: 기존 주문 데이터의 등급 코드 매핑
- **마이그레이션 방식**: 점진적 (소재 부서 데이터부터)
- **백업 계획**: 테이블별 풀 백업 후 진행
- **롤백 계획**: 신규 테이블 DROP, 기존 테이블 컬럼 제거

---

## 3. 백엔드 설계

### 3.1 API 설계

#### 3.1.1 신규 API 엔드포인트

| 메소드 | 엔드포인트 | 기능 설명 | 권한 | 입력 | 출력 |
|--------|-----------|----------|------|------|------|
| GET | `/api/v1/order/validation/sales-plan/{partnerCode}/{itemCode}/{gradeCode}/{yearMonth}` | 판매계획 검증 | USER | Path Parameters | SalesPlanValidationResponse |
| GET | `/api/v1/order/validation/daily-limit/{itemCode}/{gradeCode}/{date}` | 일일제한량 검증 | USER | Path Parameters | DailyLimitValidationResponse |
| GET | `/api/v1/order/validation/supply-plan/{customerId}/{itemCode}/{date}` | 공급계획 검증 | USER | Path Parameters | SupplyPlanValidationResponse |
| POST | `/api/v1/order/validation/comprehensive` | 통합 주문 검증 | USER | OrderValidationRequest | OrderValidationResponse |
| GET | `/api/v1/copper/grade-mapping/{itemCode}` | 등급 매핑 조회 | USER | Path Parameter | List\<GradeMappingResponse\> |
| GET | `/api/v1/system/config/{category}` | 시스템 설정 조회 | ADMIN | Path Parameter | List\<SystemConfigResponse\> |
| POST | `/api/v1/system/config` | 시스템 설정 등록 | ADMIN | SystemConfigRequest | SystemConfigResponse |

#### 3.1.2 기존 API 수정

| 엔드포인트 | 변경 유형 | 변경 내용 | 호환성 | 비고 |
|-----------|----------|----------|--------|------|
| `/api/v1/partner/orders` | 비즈니스 로직 추가 | 주문 생성 전 통합 검증 로직 적용 | Backward Compatible | 검증 실패 시 에러 응답 |
| `/api/v1/common/products` | 응답 필드 추가 | 소재 자재일 경우 등급 정보 포함 | Backward Compatible | grades 필드 추가 |

### 3.2 클래스 설계

#### 3.2.1 신규 클래스

| 분류 | 클래스명 | 역할 | 주요 메소드 | 의존성 |
|------|----------|------|-------------|--------|
| Entity | OrderSalesPlan | 주문-판매계획 관리 | partner_code, item_code, grade_code, sales_plan_quantity, order_plan_quantity | CopperItemGradeMapping |
| Entity | DailyOrderLimit | 일일주문제한량 | item_code, grade_code, daily_limit_quantity, limit_date | - |
| Entity | CopperItemGradeMapping | 소재 자재-등급 매핑 | item_code, grade_code, grade_name, is_active | - |
| Entity | SystemConfig | 시스템 설정 | config_category, config_key, config_value, description | - |
| Entity | OrderValidationLog | 주문 검증 이력 | order_id, validation_type, validation_result, error_message | Order |
| DTO | OrderValidationRequest | 주문 검증 요청 | partnerCode, itemCode, gradeCode, orderQuantity, orderDate | - |
| DTO | OrderValidationResponse | 주문 검증 응답 | isValid, validationResults, errorMessages | - |
| Repository | OrderSalesPlanRepository | 주문계획 데이터 접근 | findByPartnerCodeAndItemCodeAndGradeCode() | OrderSalesPlan |
| Repository | DailyOrderLimitRepository | 일일제한량 데이터 접근 | findByItemCodeAndGradeCodeAndLimitDate() | DailyOrderLimit |
| Repository | CopperItemGradeMappingRepository | 등급매핑 데이터 접근 | findByItemCodeAndIsActive() | CopperItemGradeMapping |
| Repository | SystemConfigRepository | 시스템설정 데이터 접근 | findByCategoryAndKey() | SystemConfig |
| Service | OrderValidationService | 주문 검증 통합 서비스 | validateComprehensive(), validateSalesPlan(), validateDailyLimit() | 다수 Repository |
| Service | CopperGradeService | 소재 등급 관리 서비스 | getGradesByItemCode(), isValidGrade() | CopperItemGradeMappingRepository |
| Service | SystemConfigService | 시스템 설정 관리 서비스 | getConfigValue(), updateConfigValue() | SystemConfigRepository |
| Controller | OrderValidationController | 주문 검증 API | validateSalesPlan(), validateDailyLimit(), validateSupplyPlan() | OrderValidationService |
| Controller | CopperGradeController | 등급 관리 API | getGradesByItemCode(), createGradeMapping() | CopperGradeService |
| Controller | SystemConfigController | 시스템 설정 API | getConfigByCategory(), createConfig() | SystemConfigService |

#### 3.2.2 기존 클래스 수정

| 클래스명 | 수정 유형 | 수정 내용 | 영향 범위 | 테스트 필요성 |
|---------|----------|----------|----------|-------------|
| OrderService | 메소드 수정 | createOrder() 메소드에 통합 검증 로직 추가 | PartnerOrderController | 회귀 테스트 필요 |
| ProductService | 메소드 추가 | getProductsWithGrades() 메소드 추가 | CommonProductController | 단위 테스트 필요 |
| StoreCopperService | 메소드 수정 | 공급계획 검증 시 설정값 참조하도록 수정 | SalesStoreCopperController | 통합 테스트 필요 |

### 3.3 비즈니스 로직 흐름
```
1. 주문 요청 수신 → OrderService.createOrder()
2. 소재 부서 여부 판별 → CopperGradeService.isCopperTeam()
3. 통합 검증 수행 → OrderValidationService.validateComprehensive()
   3.1. 판매계획 검증 → validateSalesPlan()
   3.2. 일일제한량 검증 → validateDailyLimit()
   3.3. 공급계획 검증 (수탁 전기동만) → validateSupplyPlan()
   3.4. 주문 가능 시기 검증 → validateOrderTimeLimit()
4. 검증 결과 로깅 → OrderValidationLog 저장
5. 검증 통과 시 주문 생성 → Order/OrderItem 저장
```

---

## 4. 프론트엔드 설계

### 4.1 화면 설계

#### 4.1.1 신규 화면

| 화면명 | 경로 | 기능 | 권한 | 주요 컴포넌트 |
|-------|------|------|------|-------------|
| 시스템설정관리 | `/admin/system-config` | 시스템 설정값 관리 | ADMIN | SystemConfigMain, SystemConfigForm |
| 주문검증이력 | `/admin/order-validation-log` | 주문 검증 이력 조회 | ADMIN | ValidationLogMain, ValidationLogDetail |

#### 4.1.2 기존 화면 수정

| 화면명 | 수정 유형 | 수정 내용 | 영향도 | 비고 |
|-------|----------|----------|--------|------|
| OrderSheetPartner | UI 추가 | 소재 자재 선택 시 등급 선택 드롭다운 추가 | Medium | 소재 부서만 해당 |
| OrderSheetPartner | 검증 로직 추가 | 주문 등록 전 실시간 검증 결과 표시 | High | 모든 부서 해당 |
| ProductSelector | UI 수정 | 등급 정보 포함된 자재 목록 표시 | Low | 소재 부서만 해당 |

### 4.2 컴포넌트 설계

#### 4.2.1 신규 컴포넌트

| 컴포넌트명 | 타입 | 역할 | Props | Events | 재사용성 |
|-----------|------|------|-------|--------|---------|
| GradeSelector | Form | 등급 선택 드롭다운 | itemCode, value, required | change, select | High |
| OrderValidationAlert | Dialog | 주문 검증 결과 알림 | validationResult, visible | close, retry | High |
| SystemConfigForm | Form | 시스템 설정 입력 폼 | configData, mode | save, cancel | Medium |
| ValidationStatusBadge | Display | 검증 상태 배지 | status, message | - | High |

#### 4.2.2 기존 컴포넌트 수정

| 컴포넌트명 | 수정 유형 | 수정 내용 | 하위 영향 | 비고 |
|-----------|----------|----------|----------|------|
| OrderSheetItemList | Props 추가 | gradeCode 필드 추가 | OrderSheetPartner | 소재 부서 대상 |
| ProductDropdown | UI 수정 | 등급 정보 포함 옵션 표시 | OrderSheetItemList | 소재 부서 대상 |
| OrderSummary | 표시 로직 추가 | 검증 결과 요약 표시 | OrderSheetPartner | 전체 부서 |

### 4.3 상태 관리 설계

#### 4.3.1 신규 Store 모듈

| 모듈명 | 역할 | State | Actions | Getters |
|-------|------|-------|---------|---------|
| orderValidation | 주문 검증 상태 관리 | validationResults, isValidating | validateOrder, resetValidation | isOrderValid, validationErrors |
| copperGrade | 소재 등급 정보 관리 | gradeList, selectedGrade | fetchGrades, selectGrade | availableGrades, hasGrades |
| systemConfig | 시스템 설정 관리 | configList, configCategories | fetchConfigs, updateConfig | getConfigByKey, getConfigsByCategory |

#### 4.3.2 기존 Store 수정

| 모듈명 | 수정 유형 | 수정 내용 | 호환성 | 비고 |
|-------|----------|----------|--------|------|
| orderSheetPartner | State 추가 | gradeCode 필드 추가 | Backward Compatible | 소재 부서 주문 시 필요 |
| product | Action 수정 | fetchProductsWithGrades 액션 추가 | Backward Compatible | 등급 정보 포함 조회 |

### 4.4 서비스 레이어 설계

#### 4.4.1 신규 Service

| 서비스명 | 역할 | 주요 함수 | API 연동 | 에러 처리 |
|---------|------|----------|---------|----------|
| order-validation-service | 주문 검증 API 연동 | validateComprehensive(), validateSalesPlan() | OrderValidationController | 검증 실패 시 상세 메시지 |
| copper-grade-service | 등급 관리 API 연동 | fetchGradesByItemCode(), createGradeMapping() | CopperGradeController | 등급 없음 시 빈 배열 |
| system-config-service | 설정 관리 API 연동 | fetchConfigs(), updateConfig() | SystemConfigController | 설정 없음 시 기본값 |

#### 4.4.2 기존 Service 수정

| 서비스명 | 수정 유형 | 수정 내용 | 영향 범위 | 비고 |
|---------|----------|----------|----------|------|
| order-service | 함수 수정 | createOrderSheet()에 검증 로직 추가 | OrderSheetPartner | 검증 실패 시 Exception |
| product-service | 함수 추가 | fetchProductsWithGrades() 함수 추가 | ProductSelector | 소재 부서 전용 |

---

## 5. UI/UX 설계

### 5.1 화면 구성
```
[주문서 작성 화면]
- 제목: 주문서 작성
- 검색 조건: 고객사, 자재코드, 등급(소재 부서만)

[검증 영역]  
- 왼쪽: 실시간 검증 상태 표시
- 오른쪽: 검증 결과 상세 정보

[주문 아이템 목록]
- 데이터 표시: 테이블 형태
- 주요 컬럼: 자재코드, 등급(소재만), 주문량, 검증상태

[액션 영역]
- 임시저장, 주문요청, 취소 버튼
```

### 5.2 사용자 인터랙션 흐름
```
1. 사용자 액션: 자재 선택
   → 화면 반응: 등급 드롭다운 활성화 (소재만)
   → API 호출: /copper/grade-mapping/{itemCode}

2. 사용자 액션: 주문량 입력
   → 화면 반응: 실시간 검증 수행
   → API 호출: /order/validation/comprehensive

3. 사용자 액션: 주문 요청 버튼 클릭
   → 화면 반응: 최종 검증 및 주문 생성
   → 데이터 처리: 검증 통과 시 주문 저장
```

### 5.3 권한별 UI 분기

| 권한/역할 | 접근 가능 기능 | 제한 사항 | UI 차이점 |
|---------|-------------|----------|----------|
| 소재 부서 파트너 | 등급 선택, 공급계획 검증 | 공급계획 기한 내 수정 불가 | 등급 드롭다운 표시 |
| 일반 부서 파트너 | 기본 주문 기능 | 판매계획, 일일제한량 검증만 | 등급 선택 없음 |
| 시스템 관리자 | 설정값 관리, 검증 이력 조회 | - | 관리 메뉴 추가 |

---

## 6. 통합 설계

### 6.1 전체 데이터 흐름
```
[Frontend] → [API] → [Validation Service] → [Multiple Repositories] → [Database]
    ↓           ↓         ↓                      ↓                        ↓
{주문 입력} → {검증 요청} → {통합 검증 수행} → {계획/제한량/설정 조회} → {검증 결과}
    ↓           ↓         ↓                      ↓                        ↓
{검증 결과} → {주문 생성} → {Order Service} → {Order Repository} → {주문 저장}
```

### 6.2 에러 처리 전략

| 에러 유형 | 발생 지점 | 처리 방식 | 사용자 경험 |
|---------|----------|----------|------------|
| 판매계획 초과 | Backend Validation | 주문 거부, 상세 메시지 | "판매계획량을 초과했습니다. (계획: X, 요청: Y)" |
| 일일제한량 초과 | Backend Validation | 주문 거부, 대안 제시 | "일일 주문제한량 초과. 내일 주문 가능" |
| 공급계획 없음 | Backend Validation | 주문 거부, 안내 메시지 | "공급계획이 등록되지 않았습니다. 계획 등록 후 주문하세요" |
| 주문 기한 초과 | Backend Validation | 주문 거부, 기한 안내 | "주문 확정 기한이 지났습니다. (기한: YYYY-MM-DD)" |
| 외부 인터페이스 오류 | Backend Service | 로그 기록, 기본값 사용 | "일시적 오류입니다. 잠시 후 다시 시도하세요" |

### 6.3 성능 고려사항
- **데이터 로딩**: 검증 데이터 캐싱 (Redis 활용)
- **캐싱**: 일일제한량, 시스템설정 등 자주 조회되는 데이터
- **최적화**: 통합 검증 시 병렬 처리로 응답시간 단축

---

## 7. 구현 계획

### 7.1 개발 단계별 계획

| 단계 | 작업 내용 | 예상 기간 | 산출물 | 의존성 |
|------|----------|----------|--------|------|
| 1단계 | DB 설계 및 테이블 생성 | 1주 | 신규 테이블 7개, 인덱스 | - |
| 2단계 | 백엔드 Entity/Repository 개발 | 1주 | Entity 7개, Repository 7개 | 1단계 완료 |
| 3단계 | 검증 서비스 로직 개발 | 2주 | Service 3개, Controller 3개 | 2단계 완료 |
| 4단계 | 기존 주문 프로세스 통합 | 1주 | OrderService 수정 | 3단계 완료 |
| 5단계 | 프론트엔드 컴포넌트 개발 | 1.5주 | 컴포넌트 4개, Service 3개 | 4단계 완료 |
| 6단계 | 통합 테스트 및 배포 | 0.5주 | 테스트 결과, 배포 가이드 | 5단계 완료 |

### 7.2 테스트 계획

| 테스트 유형 | 대상 | 시나리오 | 예상 결과 |
|------------|------|----------|----------|
| 단위 테스트 | OrderValidationService | 각 검증 로직별 성공/실패 케이스 | 검증 결과 정확성 |
| 통합 테스트 | 주문 생성 API | 소재/일반 부서별 주문 프로세스 | 부서별 분기 정상 동작 |
| UI 테스트 | OrderSheetPartner | 등급 선택 및 실시간 검증 | 사용자 경험 개선 확인 |
| 성능 테스트 | 통합 검증 로직 | 대량 주문 시 응답시간 | 1초 이내 응답 |

### 7.3 배포 계획
- **배포 환경**: 개발 → 스테이징 → 운영
- **배포 방식**: 블루그린 배포 (무중단)
- **롤백 계획**: DB 스키마 변경 시 즉시 롤백 가능하도록 마이그레이션 스크립트 준비

---

## 8. 리스크 관리

### 8.1 기술적 리스크

| 리스크 | 발생 확률 | 영향도 | 대응 방안 | 담당자 |
|-------|----------|--------|----------|--------|
| 외부 인터페이스 장애 | High | High | 캐싱 및 기본값 사용, 비동기 처리 | 백엔드 개발자 |
| 검증 로직 성능 저하 | Medium | Medium | 병렬 처리, 캐싱, 인덱스 최적화 | 백엔드 개발자 |
| 기존 주문 프로세스 영향 | Medium | High | 철저한 회귀 테스트, 단계적 배포 | 전체 팀 |

### 8.2 일정 리스크

| 리스크 | 발생 확률 | 영향도 | 대응 방안 | 담당자 |
|-------|----------|--------|----------|--------|
| 외부 시스템 연동 지연 | Medium | High | 목 데이터 활용, 병렬 개발 | 프로젝트 매니저 |
| 복잡한 검증 로직으로 인한 개발 지연 | Medium | Medium | 단계별 구현, 우선순위 조정 | 개발 리더 |

---

이 설계서를 기반으로 각 단계별 구현이 필요할 때 "X 기능의 Y 클래스 구현해줘"라고 요청하시면 상세한 코드를 제공해드리겠습니다.


