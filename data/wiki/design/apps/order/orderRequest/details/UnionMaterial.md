# 자재코드 통합에 따른 변경점 검토

## 4. 자재코드 통합 영향도 분석

### 4.1 현재 설계된 테이블 구조 검토

#### 4.1.1 등급 코드 사용 현황 분석

**현재 설계에서 grade_code가 사용되는 테이블들:**

| 테이블명 | grade_code 사용 현황 | 변경 필요성 | 비고 |
|---------|---------------------|------------|------|
| SALES_PLAN_INTERFACE | grade_code VARCHAR(10) | ✅ 유지 | 외부 인터페이스는 통합 후 구조 |
| PURCHASE_PLAN | grade_code VARCHAR(10) | ✅ 유지 | 주문-판매계획 통합 관리 |
| DAILY_ORDER_LIMIT_INTERFACE | grade_code VARCHAR(10) | ✅ 유지 | 외부 인터페이스는 통합 후 구조 |
| DAILY_ORDER_LIMIT | grade_code VARCHAR(10) | ✅ 유지 | 일일제한량 관리 |
| COPPER_ITEM_GRADE_MAPPING | grade_code VARCHAR(10) | ✅ 유지 | 소재 부서 매핑 테이블 |
| orders (기존 테이블) | grade_code VARCHAR(10) 추가 예정 | ⚠️ 검토 필요 | 소재 부서만 사용 |
| order_items (기존 테이블) | grade_code VARCHAR(10) 추가 예정 | ⚠️ 검토 필요 | 소재 부서만 사용 |

### 4.2 주요 변경점 및 고려사항

#### 4.2.1 기존 테이블 변경 방식 수정

**기존 설계 (수정 필요):**
```sql
-- 모든 주문에 등급 코드 추가 (X)
ALTER TABLE orders ADD COLUMN grade_code VARCHAR(10);
ALTER TABLE order_items ADD COLUMN grade_code VARCHAR(10);
```

**수정된 설계 (권장):**
```sql
-- 기존 테이블은 변경하지 않고, 소재 부서 매핑 정보는 별도 조회
-- orders, order_items 테이블은 현재 구조 유지
-- 필요시 VIEW나 JOIN을 통해 등급 정보 조회
```

#### 4.2.2 등급 정보 조회 방식 설계

**1) 소재 부서 여부 판별 함수**
```java
@Service
public class ItemGradeService {
    
    public boolean isCopperTeamItem(String itemCode) {
        // 소재 부서 자재 코드인지 확인
        return copperItemGradeMappingRepository.existsByItemCodeAndIsActive(itemCode, true);
    }
    
    public List<String> getAvailableGrades(String itemCode) {
        if (!isCopperTeamItem(itemCode)) {
            return Collections.emptyList();
        }
        
        return copperItemGradeMappingRepository
            .findByItemCodeAndIsActive(itemCode, true)
            .stream()
            .map(CopperItemGradeMapping::getGradeCode)
            .collect(Collectors.toList());
    }
    
    public boolean isValidGrade(String itemCode, String gradeCode) {
        if (!isCopperTeamItem(itemCode)) {
            return true; // 일반 자재는 등급 검증 불필요
        }
        
        return copperItemGradeMappingRepository
            .existsByItemCodeAndGradeCodeAndIsActive(itemCode, gradeCode, true);
    }
}
```

### 4.3 검증 로직 수정사항

#### 4.3.1 OrderValidationService 수정

**기존 검증 로직의 문제점:**
- 모든 주문에 grade_code 필수 입력 가정
- 소재/일반 부서 구분 없이 등급 검증

**수정된 검증 로직:**
```java
@Service
@RequiredArgsConstructor
public class OrderValidationService {
    
    private final ItemGradeService itemGradeService;
    
    public OrderValidationResponse validateComprehensive(OrderValidationRequest request) {
        List<ValidationResult> results = new ArrayList<>();
        
        // 1. 등급 코드 유효성 검증 (소재 부서만)
        results.add(validateGradeCode(request));
        
        // 2. 기존 검증 로직들...
        if (salesPlanCheckEnabled) {
            results.add(validateSalesPlan(request));
        }
        
        // ...
    }
    
    private ValidationResult validateGradeCode(OrderValidationRequest request) {
        String itemCode = request.getItemCode();
        String gradeCode = request.getGradeCode();
        
        // 소재 부서 자재인지 확인
        if (itemGradeService.isCopperTeamItem(itemCode)) {
            // 소재 부서 자재는 등급 코드 필수
            if (StringUtils.isEmpty(gradeCode)) {
                return ValidationResult.fail("GRADE_CODE_REQUIRED", 
                    "소재 부서 자재는 등급 코드가 필수입니다.");
            }
            
            // 등급 코드 유효성 검증
            if (!itemGradeService.isValidGrade(itemCode, gradeCode)) {
                return ValidationResult.fail("GRADE_CODE_INVALID", 
                    String.format("유효하지 않은 등급 코드입니다. (자재: %s, 등급: %s)", itemCode, gradeCode));
            }
        } else {
            // 일반 자재는 등급 코드 사용 안함
            if (StringUtils.isNotEmpty(gradeCode)) {
                return ValidationResult.fail("GRADE_CODE_NOT_ALLOWED", 
                    "일반 자재는 등급 코드를 사용할 수 없습니다.");
            }
        }
        
        return ValidationResult.success("GRADE_CODE_VALID", "등급 코드 검증 통과");
    }
    
    private ValidationResult validateSalesPlan(OrderValidationRequest request) {
        String itemCode = request.getItemCode();
        String gradeCode = request.getGradeCode();
        
        // 소재 부서가 아닌 경우 gradeCode를 null로 처리
        if (!itemGradeService.isCopperTeamItem(itemCode)) {
            gradeCode = null;
        }
        
        // 판매계획 조회 (등급 코드 고려)
        PurchasePlan purchasePlan = purchasePlanRepository
            .findByPartnerIdAndItemCodeAndGradeCodeAndPlanYearMonth(
                request.getPartnerId(),
                itemCode,
                gradeCode, // 일반 자재는 null
                request.getPlanYearMonth()
            );
        
        // 검증 로직...
    }
}
```

### 4.4 데이터베이스 쿼리 수정

#### 4.4.1 등급 코드 NULL 처리 방식

**기존 설계의 문제점:**
```sql
-- 모든 테이블에서 grade_code를 NOT NULL로 가정
WHERE item_code = ? AND grade_code = ?
```

**수정된 쿼리 방식:**
```sql
-- 일반 자재와 소재 자재 구분 처리
WHERE item_code = ? 
  AND (
    (grade_code IS NULL AND ? IS NULL) OR  -- 일반 자재
    (grade_code = ?)                       -- 소재 자재
  )

-- 또는 COALESCE 사용
WHERE item_code = ? 
  AND COALESCE(grade_code, '') = COALESCE(?, '')
```

#### 4.4.2 Repository 메소드 수정

```java
@Repository
public interface PurchasePlanRepository extends JpaRepository<PurchasePlan, String> {
    
    // 기존 방식 (수정 필요)
    // PurchasePlan findByPartnerIdAndItemCodeAndGradeCodeAndPlanYearMonth(
    //     String partnerId, String itemCode, String gradeCode, String planYearMonth);
    
    // 수정된 방식
    @Query("SELECT p FROM PurchasePlan p WHERE p.partnerId = :partnerId " +
           "AND p.itemCode = :itemCode " +
           "AND (:gradeCode IS NULL AND p.gradeCode IS NULL OR p.gradeCode = :gradeCode) " +
           "AND p.planYearMonth = :planYearMonth")
    PurchasePlan findByPartnerItemGradeAndYearMonth(
        @Param("partnerId") String partnerId,
        @Param("itemCode") String itemCode, 
        @Param("gradeCode") String gradeCode,
        @Param("planYearMonth") String planYearMonth
    );
    
    // 일일제한량도 동일하게 처리
}

@Repository  
public interface DailyOrderLimitRepository extends JpaRepository<DailyOrderLimit, String> {
    
    @Query("SELECT d FROM DailyOrderLimit d WHERE d.itemCode = :itemCode " +
           "AND (:gradeCode IS NULL AND d.gradeCode IS NULL OR d.gradeCode = :gradeCode) " +
           "AND d.limitDate = :limitDate AND d.limitStatus = 'A'")
    DailyOrderLimit findByItemGradeAndDate(
        @Param("itemCode") String itemCode,
        @Param("gradeCode") String gradeCode,
        @Param("limitDate") LocalDate limitDate
    );
}
```

### 4.5 Frontend 변경사항

#### 4.5.1 주문서 작성 화면 수정

```vue
<template>
  <div class="order-form">
    <!-- 자재 선택 -->
    <div class="form-group">
      <label>자재 코드</label>
      <select v-model="orderForm.itemCode" @change="onItemCodeChange">
        <option v-for="item in itemList" :key="item.code" :value="item.code">
          {{ item.name }}
        </option>
      </select>
    </div>
    
    <!-- 등급 선택 (소재 자재만 표시) -->
    <div class="form-group" v-if="showGradeSelector">
      <label>등급 코드 <span class="required">*</span></label>
      <select v-model="orderForm.gradeCode" @change="onGradeCodeChange">
        <option value="">등급을 선택하세요</option>
        <option v-for="grade in availableGrades" :key="grade" :value="grade">
          {{ grade }}
        </option>
      </select>
    </div>
    
    <!-- 기타 폼 필드들... -->
  </div>
</template>

<script>
export default {
  data() {
    return {
      orderForm: {
        itemCode: '',
        gradeCode: '',
        // ...
      },
      availableGrades: [],
      showGradeSelector: false
    };
  },
  
  methods: {
    async onItemCodeChange() {
      // 등급 정보 초기화
      this.orderForm.gradeCode = '';
      this.availableGrades = [];
      this.showGradeSelector = false;
      
      if (this.orderForm.itemCode) {
        // 소재 부서 자재인지 확인
        const itemInfo = await itemService.getItemInfo(this.orderForm.itemCode);
        
        if (itemInfo.isCopperTeam) {
          // 등급 목록 조회
          this.availableGrades = await itemService.getAvailableGrades(this.orderForm.itemCode);
          this.showGradeSelector = true;
        }
      }
      
      // 검증 수행
      this.performValidation();
    },
    
    onGradeCodeChange() {
      // 등급 변경 시 재검증
      this.performValidation();
    },
    
    buildValidationRequest() {
      return {
        itemCode: this.orderForm.itemCode,
        gradeCode: this.showGradeSelector ? this.orderForm.gradeCode : null, // 일반 자재는 null
        // ...
      };
    }
  }
};
</script>
```

#### 4.5.2 Item Service 수정

```javascript
// item-service.js
export const itemService = {
  
  async getItemInfo(itemCode) {
    const { data } = await HTTP.get(`/api/v1/items/${itemCode}/info`);
    return data;
  },
  
  async getAvailableGrades(itemCode) {
    const { data } = await HTTP.get(`/api/v1/items/${itemCode}/grades`);
    return data;
  },
  
  // 기존 함수들...
};
```

### 4.6 추가 고려사항

#### 4.6.1 데이터 마이그레이션 계획 수정

**기존 주문 데이터 처리:**
```sql
-- 기존 주문 데이터는 grade_code를 NULL로 유지
-- 소재 부서 주문만 별도 식별하여 등급 매핑 정보 추가

-- 1. 기존 orders 테이블에 grade_code 컬럼 추가 (NULL 허용)
ALTER TABLE orders ADD COLUMN grade_code VARCHAR(10) NULL;
ALTER TABLE order_items ADD COLUMN grade_code VARCHAR(10) NULL;

-- 2. 소재 부서의 기존 주문 데이터 업데이트 (필요시)
UPDATE orders o 
JOIN order_items oi ON o.order_id = oi.order_id
JOIN COPPER_ITEM_GRADE_MAPPING cigm ON oi.item_code = cigm.item_code
SET o.grade_code = cigm.grade_code, oi.grade_code = cigm.grade_code
WHERE cigm.is_active = 'Y'
  AND cigm.grade_code = 'DEFAULT'; -- 기본 등급이 있는 경우
```

#### 4.6.2 인덱스 전략 수정

```sql
-- 복합 인덱스에서 grade_code NULL 처리 고려
-- 기존
CREATE INDEX idx_purchase_plan_unique ON PURCHASE_PLAN (partner_id, item_code, grade_code, plan_year_month);

-- NULL 값 고려한 인덱스 (MySQL 8.0+)
CREATE INDEX idx_purchase_plan_unique ON PURCHASE_PLAN (partner_id, item_code, (IFNULL(grade_code, '')), plan_year_month);

-- 또는 함수 기반 인덱스 대신 별도 처리
CREATE INDEX idx_purchase_plan_general ON PURCHASE_PLAN (partner_id, item_code, plan_year_month) WHERE grade_code IS NULL;
CREATE INDEX idx_purchase_plan_copper ON PURCHASE_PLAN (partner_id, item_code, grade_code, plan_year_month) WHERE grade_code IS NOT NULL;
```

### 4.7 최종 변경 요약

| 구분 | 변경 내용 | 변경 이유 | 영향도 |
|------|----------|----------|--------|
| **테이블 설계** | orders/order_items에 grade_code 추가 시 NULL 허용 | 일반 자재는 등급 불필요 | Medium |
| **검증 로직** | 자재 유형별 등급 검증 분기 추가 | 소재/일반 부서 구분 | High |
| **Repository** | 등급 코드 NULL 처리 쿼리 수정 | 정확한 데이터 조회 | High |
| **Frontend** | 조건부 등급 선택 UI 추가 | 사용자 편의성 | Medium |
| **API** | 자재 정보 조회 API 추가 | 등급 정보 제공 | Low |

이러한 수정을 통해 소재 부서의 자재코드 통합 요구사항을 만족하면서도, 기존 일반 자재 주문 프로세스에는 영향을 주지 않는 설계가 완성됩니다.