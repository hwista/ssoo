# 기능 개발 설계서 - 주문 요청 프로세스 통합 검증 강화

## 3. 주문 요청 프로세스 통합 검증 설계

### 3.1 기존 주문 요청 프로세스 분석

#### 3.1.1 현재 주문 프로세스 흐름
```
1. 사용자 주문서 작성 (OrderSheetPartner.vue)
   ↓
2. 주문 데이터 검증 (클라이언트 사이드)
   ↓
3. 주문 요청 API 호출 (/api/v1/partner/orders)
   ↓
4. 기본 검증 (PartnerOrderController)
   ↓
5. 주문 생성 (OrderService.createOrder())
   ↓
6. 주문 저장 (Order/OrderItem 테이블)
```

#### 3.1.2 변경이 필요한 지점 분석

| 구분 | 파일/클래스 | 현재 로직 | 추가 필요 로직 | 변경 유형 |
|------|-----------|----------|---------------|----------|
| Frontend | OrderSheetPartner.vue | 기본 폼 검증 | 실시간 통합 검증 결과 표시 | 수정 |
| Frontend | order-service.js | 단순 주문 생성 API 호출 | 통합 검증 API 호출 추가 | 수정 |
| Backend | PartnerOrderController | 기본 파라미터 검증 | 통합 검증 로직 호출 | 수정 |
| Backend | OrderService | 단순 주문 생성 | 통합 검증 + 주문 생성 | 수정 |
| Backend | 신규 | - | OrderValidationService 생성 | 신규 |

### 3.2 시스템 설정 관리 테이블 설계

#### 3.2.1 SYSTEM_CONFIG 테이블 상세 설계

```sql
CREATE TABLE SYSTEM_CONFIG (
    config_id VARCHAR(50) PRIMARY KEY COMMENT '설정 고유 ID',
    config_category VARCHAR(50) NOT NULL COMMENT '설정 카테고리',
    config_key VARCHAR(100) NOT NULL COMMENT '설정 키',
    config_value VARCHAR(500) NOT NULL COMMENT '설정 값',
    config_type VARCHAR(20) DEFAULT 'STRING' COMMENT '설정 타입 (STRING, NUMBER, BOOLEAN, DATE)',
    description VARCHAR(1000) COMMENT '설정 설명',
    is_active CHAR(1) DEFAULT 'Y' COMMENT '활성 여부',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    
    UNIQUE KEY uk_system_config (config_category, config_key),
    INDEX idx_system_config_category (config_category),
    INDEX idx_system_config_active (is_active)
) COMMENT = '시스템 설정 관리';
```

#### 3.2.2 주문 검증 관련 설정값 초기 데이터

```sql
-- 주문 검증 설정 카테고리
INSERT INTO SYSTEM_CONFIG VALUES
('SC001', 'ORDER_VALIDATION', 'SALES_PLAN_CHECK_ENABLED', 'Y', 'BOOLEAN', '판매계획 검증 활성화 여부', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
('SC002', 'ORDER_VALIDATION', 'DAILY_LIMIT_CHECK_ENABLED', 'Y', 'BOOLEAN', '일일제한량 검증 활성화 여부', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
('SC003', 'ORDER_VALIDATION', 'SUPPLY_PLAN_CHECK_ENABLED', 'Y', 'BOOLEAN', '공급계획 검증 활성화 여부 (수탁 전기동)', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
('SC004', 'ORDER_VALIDATION', 'SUPPLY_PLAN_DATE_CHECK_ENABLED', 'Y', 'BOOLEAN', '공급계획 일자 검증 활성화 여부', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
('SC005', 'ORDER_VALIDATION', 'SUPPLY_PLAN_QUANTITY_CHECK_ENABLED', 'Y', 'BOOLEAN', '공급계획량 검증 활성화 여부', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
('SC006', 'ORDER_VALIDATION', 'SUPPLY_PLAN_REFERENCE_DAYS', '1', 'NUMBER', '공급계획 참조 일수 (주문일 기준 X일 전)', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
('SC007', 'ORDER_VALIDATION', 'ORDER_DEADLINE_DAYS', '3', 'NUMBER', '주문 마감 일수 (주문일 기준 X일 후부터 주문 불가)', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
('SC008', 'ORDER_VALIDATION', 'ORDER_DEADLINE_CHECK_ENABLED', 'Y', 'BOOLEAN', '주문 마감일 검증 활성화 여부', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM');

-- 부서별 설정 (필요시)
INSERT INTO SYSTEM_CONFIG VALUES
('SC009', 'TEAM_CONFIG', 'COPPER_TEAM_CODES', 'CopperRod,Copper', 'STRING', '소재 부서 코드 목록 (콤마 구분)', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM'),
('SC010', 'TEAM_CONFIG', 'CONSIGNMENT_ITEM_PREFIX', 'CU', 'STRING', '수탁 전기동 자재 코드 접두사', 'Y', NOW(), NOW(), 'SYSTEM', 'SYSTEM');
```

### 3.3 통합 검증 서비스 설계

#### 3.3.1 OrderValidationService 클래스 설계

| 메소드명 | 역할 | 입력 파라미터 | 반환값 | 검증 내용 |
|---------|------|-------------|--------|----------|
| validateComprehensive() | 통합 검증 수행 | OrderValidationRequest | OrderValidationResponse | 모든 검증 수행 |
| validateSalesPlan() | 판매계획 검증 | partnerId, itemCode, gradeCode, orderQuantity, yearMonth | ValidationResult | 판매계획량 대비 주문량 |
| validateDailyLimit() | 일일제한량 검증 | itemCode, gradeCode, orderQuantity, orderDate | ValidationResult | 일일제한량 대비 주문량 |
| validateSupplyPlan() | 공급계획 검증 | customerId, itemCode, orderQuantity, orderDate | ValidationResult | 공급계획 존재 및 계획량 |
| validateOrderDeadline() | 주문마감일 검증 | orderDate, deliveryDate | ValidationResult | 주문 가능 기간 |
| isConsignmentItem() | 수탁 전기동 여부 | itemCode | boolean | 자재 유형 판별 |
| isCopperTeam() | 소재 부서 여부 | teamCode | boolean | 부서 유형 판별 |

#### 3.3.2 검증 로직 상세 설계

**통합 검증 흐름:**
```
validateComprehensive() {
    1. 시스템 설정값 조회
    2. 부서/자재 유형 판별
    3. 조건별 검증 수행:
       - 판매계획 검증 (활성화 시)
       - 일일제한량 검증 (활성화 시)  
       - 공급계획 검증 (수탁 전기동 + 활성화 시)
         ㄴ 공급계획 일자 검증 (활성화 시)
         ㄴ 공급계획량 검증 (활성화 시)
       - 주문마감일 검증 (활성화 시)
    4. 검증 결과 통합 및 반환
    5. 검증 이력 로깅
}
```

### 3.4 주요 변경점 상세 설계

#### 3.4.1 Backend 변경점

**1) PartnerOrderController 수정**
```java
@PostMapping
public ResponseEntity<OrderResponse> createOrder(@RequestBody OrderRequest request) {
    // 기존: 바로 주문 생성
    // OrderResponse result = orderService.createOrder(request);
    
    // 변경: 통합 검증 후 주문 생성
    OrderValidationResponse validation = orderValidationService.validateComprehensive(request);
    
    if (!validation.isValid()) {
        throw new OrderValidationException(validation.getErrorMessages());
    }
    
    OrderResponse result = orderService.createOrder(request);
    return ResponseEntity.ok(result);
}

// 신규: 검증만 수행하는 API
@PostMapping("/validate")
public ResponseEntity<OrderValidationResponse> validateOrder(@RequestBody OrderValidationRequest request) {
    OrderValidationResponse result = orderValidationService.validateComprehensive(request);
    return ResponseEntity.ok(result);
}
```

**2) OrderService 수정**
```java
@Transactional
public OrderResponse createOrder(OrderRequest request) {
    // 기존 로직 유지하되, 추가 검증 로그 기록
    
    // 검증 이력 저장
    OrderValidationLog validationLog = new OrderValidationLog();
    validationLog.setOrderId(order.getOrderId());
    validationLog.setValidationType("COMPREHENSIVE");
    validationLog.setValidationResult("SUCCESS");
    orderValidationLogRepository.save(validationLog);
    
    // 기존 주문 생성 로직...
}
```

**3) 신규 OrderValidationService**
```java
@Service
@RequiredArgsConstructor
public class OrderValidationService {
    
    private final SystemConfigService systemConfigService;
    private final PurchasePlanRepository purchasePlanRepository;
    private final DailyOrderLimitRepository dailyOrderLimitRepository;
    private final SupplyPlanService supplyPlanService;
    
    public OrderValidationResponse validateComprehensive(OrderValidationRequest request) {
        // 설정값 조회
        boolean salesPlanCheckEnabled = systemConfigService.getBooleanValue("ORDER_VALIDATION", "SALES_PLAN_CHECK_ENABLED");
        boolean dailyLimitCheckEnabled = systemConfigService.getBooleanValue("ORDER_VALIDATION", "DAILY_LIMIT_CHECK_ENABLED");
        // ... 기타 설정값들
        
        List<ValidationResult> results = new ArrayList<>();
        
        // 조건별 검증 수행
        if (salesPlanCheckEnabled) {
            results.add(validateSalesPlan(request));
        }
        
        if (dailyLimitCheckEnabled) {
            results.add(validateDailyLimit(request));
        }
        
        if (isConsignmentItem(request.getItemCode()) && supplyPlanCheckEnabled) {
            results.add(validateSupplyPlan(request));
        }
        
        if (orderDeadlineCheckEnabled) {
            results.add(validateOrderDeadline(request));
        }
        
        return buildValidationResponse(results);
    }
}
```

#### 3.4.2 Frontend 변경점

**1) OrderSheetPartner.vue 수정**
```vue
<template>
  <!-- 기존 주문서 폼 -->
  
  <!-- 신규: 실시간 검증 결과 표시 영역 -->
  <div class="validation-panel" v-if="validationResult">
    <div class="validation-header">
      <h4>주문 검증 결과</h4>
      <span :class="validationStatusClass">{{ validationStatusText }}</span>
    </div>
    
    <div class="validation-details">
      <div v-for="result in validationResult.validationResults" :key="result.type" 
           :class="['validation-item', result.isValid ? 'valid' : 'invalid']">
        <icon :name="result.isValid ? 'check' : 'warning'" />
        <span class="validation-label">{{ getValidationLabel(result.type) }}</span>
        <span class="validation-message">{{ result.message }}</span>
      </div>
    </div>
  </div>
  
  <!-- 주문 버튼 (검증 통과 시에만 활성화) -->
  <button @click="onSubmitOrder" 
          :disabled="!canSubmitOrder"
          class="submit-button">
    주문 요청
  </button>
</template>

<script>
export default {
  data() {
    return {
      validationResult: null,
      validationTimer: null
    };
  },
  
  computed: {
    canSubmitOrder() {
      return this.validationResult && this.validationResult.isValid;
    }
  },
  
  methods: {
    // 주문량 변경 시 실시간 검증
    onOrderQuantityChange() {
      clearTimeout(this.validationTimer);
      this.validationTimer = setTimeout(() => {
        this.performValidation();
      }, 500); // 디바운싱
    },
    
    async performValidation() {
      try {
        const validationRequest = this.buildValidationRequest();
        this.validationResult = await orderService.validateOrder(validationRequest);
      } catch (error) {
        this.$toast.error('검증 중 오류가 발생했습니다.');
      }
    },
    
    async onSubmitOrder() {
      if (!this.canSubmitOrder) {
        this.$toast.warning('주문 검증을 통과해야 주문할 수 있습니다.');
        return;
      }
      
      // 최종 검증 후 주문 생성
      await this.performValidation();
      
      if (this.validationResult.isValid) {
        const orderRequest = this.buildOrderRequest();
        await orderService.createOrder(orderRequest);
        this.$toast.success('주문이 성공적으로 요청되었습니다.');
      }
    }
  }
};
</script>
```

**2) order-service.js 수정**
```javascript
// 기존 함수 유지 + 신규 함수 추가

// 신규: 주문 검증 API
async function validateOrder(validationRequest) {
  const { data } = await HTTP.post('/api/v1/partner/orders/validate', validationRequest);
  return data;
}

// 수정: 주문 생성 시 검증 결과 포함
async function createOrder(orderRequest) {
  try {
    const { data } = await HTTP.post('/api/v1/partner/orders', orderRequest);
    return data;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.type === 'VALIDATION_ERROR') {
      // 검증 오류인 경우 상세 메시지 표시
      throw new OrderValidationError(error.response.data.validationResults);
    }
    throw error;
  }
}

export {
  validateOrder, // 신규
  createOrder    // 기존 (수정)
};
```

### 3.5 검증 로직별 상세 설계

#### 3.5.1 공급계획 검증 로직

```java
private ValidationResult validateSupplyPlan(OrderValidationRequest request) {
    // 설정값 조회
    boolean dateCheckEnabled = systemConfigService.getBooleanValue("ORDER_VALIDATION", "SUPPLY_PLAN_DATE_CHECK_ENABLED");
    boolean quantityCheckEnabled = systemConfigService.getBooleanValue("ORDER_VALIDATION", "SUPPLY_PLAN_QUANTITY_CHECK_ENABLED");
    int referenceDays = systemConfigService.getIntValue("ORDER_VALIDATION", "SUPPLY_PLAN_REFERENCE_DAYS");
    
    // 공급계획 조회
    LocalDate supplyPlanDate = request.getOrderDate().minusDays(referenceDays);
    SupplyPlan supplyPlan = supplyPlanService.getSupplyPlan(
        request.getCustomerId(), 
        request.getItemCode(), 
        supplyPlanDate
    );
    
    if (supplyPlan == null) {
        return ValidationResult.fail("SUPPLY_PLAN_NOT_FOUND", 
            String.format("공급계획이 없습니다. (기준일: %s)", supplyPlanDate));
    }
    
    // 일자 검증
    if (dateCheckEnabled && supplyPlan.getSupplyDate().isAfter(request.getOrderDate())) {
        return ValidationResult.fail("SUPPLY_PLAN_DATE_INVALID", 
            String.format("공급일(%s)이 주문일(%s) 이후입니다.", supplyPlan.getSupplyDate(), request.getOrderDate()));
    }
    
    // 수량 검증
    if (quantityCheckEnabled && supplyPlan.getSupplyQuantity().compareTo(request.getOrderQuantity()) < 0) {
        return ValidationResult.fail("SUPPLY_PLAN_QUANTITY_INSUFFICIENT", 
            String.format("공급계획량(%s)이 주문량(%s)보다 부족합니다.", supplyPlan.getSupplyQuantity(), request.getOrderQuantity()));
    }
    
    return ValidationResult.success("SUPPLY_PLAN_VALID", "공급계획 검증 통과");
}
```

#### 3.5.2 주문마감일 검증 로직

```java
private ValidationResult validateOrderDeadline(OrderValidationRequest request) {
    int deadlineDays = systemConfigService.getIntValue("ORDER_VALIDATION", "ORDER_DEADLINE_DAYS");
    
    LocalDate currentDate = LocalDate.now();
    LocalDate orderDeadline = request.getDeliveryDate().minusDays(deadlineDays);
    
    if (currentDate.isAfter(orderDeadline)) {
        return ValidationResult.fail("ORDER_DEADLINE_EXCEEDED", 
            String.format("주문 마감일(%s)이 지났습니다. 현재일: %s", orderDeadline, currentDate));
    }
    
    return ValidationResult.success("ORDER_DEADLINE_VALID", 
        String.format("주문 가능 기간입니다. (마감일: %s)", orderDeadline));
}
```

### 3.6 에러 처리 및 사용자 경험 개선

#### 3.6.1 검증 실패 시 사용자 안내

| 검증 유형 | 실패 메시지 | 사용자 액션 가이드 |
|---------|-----------|------------------|
| 판매계획 초과 | "판매계획량(1,000)을 초과했습니다. 주문량: 1,200" | "주문량을 줄이거나 다음 달 계획을 확인하세요" |
| 일일제한량 초과 | "일일 주문제한량(500)을 초과했습니다. 현재 주문량: 300, 요청량: 300" | "주문량을 줄이거나 내일 주문하세요" |
| 공급계획 없음 | "공급계획이 등록되지 않았습니다. (기준일: 2024-12-26)" | "공급계획을 먼저 등록하거나 관리자에게 문의하세요" |
| 주문마감일 초과 | "주문 마감일(2024-12-24)이 지났습니다." | "다음 주문 가능일을 확인하세요" |

#### 3.6.2 Progressive Enhancement 적용

```vue
<!-- 단계별 검증 결과 표시 -->
<div class="validation-steps">
  <div v-for="(step, index) in validationSteps" :key="index"
       :class="['validation-step', step.status]">
    <div class="step-number">{{ index + 1 }}</div>
    <div class="step-content">
      <h5>{{ step.title }}</h5>
      <p v-if="step.status === 'loading'">검증 중...</p>
      <p v-else-if="step.status === 'success'" class="success">{{ step.message }}</p>
      <p v-else-if="step.status === 'error'" class="error">{{ step.message }}</p>
    </div>
  </div>
</div>
```

### 3.7 성능 최적화 방안

#### 3.7.1 캐싱 전략

| 대상 데이터 | 캐시 TTL | 캐시 키 | 갱신 조건 |
|-----------|---------|---------|----------|
| 시스템설정 | 30분 | config:{category}:{key} | 설정 변경 시 |
| 일일제한량 | 1시간 | daily-limit:{item}:{grade}:{date} | 새벽 배치 후 |
| 공급계획 | 10분 | supply-plan:{customer}:{item}:{date} | 공급계획 변경 시 |

#### 3.7.2 비동기 처리

```java
@Async
public CompletableFuture<ValidationResult> validateSalesPlanAsync(OrderValidationRequest request) {
    // 비동기 검증 로직
}

public OrderValidationResponse validateComprehensive(OrderValidationRequest request) {
    // 병렬 검증 수행
    CompletableFuture<ValidationResult> salesPlanFuture = validateSalesPlanAsync(request);
    CompletableFuture<ValidationResult> dailyLimitFuture = validateDailyLimitAsync(request);
    CompletableFuture<ValidationResult> supplyPlanFuture = validateSupplyPlanAsync(request);
    
    // 모든 검증 완료 대기
    CompletableFuture.allOf(salesPlanFuture, dailyLimitFuture, supplyPlanFuture).join();
    
    // 결과 수집 및 반환
    return buildValidationResponse(Arrays.asList(
        salesPlanFuture.get(),
        dailyLimitFuture.get(), 
        supplyPlanFuture.get()
    ));
}
```

이 설계를 통해 기존 주문 프로세스에 다층 검증 로직이 통합되어, 사용자는 실시간으로 주문 가능 여부를 확인할 수 있고, 시스템은 유연한 설정 관리를 통해 비즈니스 요구사항 변화에 대응할 수 있습니다.