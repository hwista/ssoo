Collecting workspace information# 소재 부서 자재-등급 매핑 테이블 영향도 분석

## 기본 정보
- **분석일자:** 2024-12-27
- **분석자:** GitHub Copilot
- **분석 대상:** 소재 부서 자재-등급 키 릴레이션 매핑 테이블 추가 영향도

## 1. 데이터베이스 영향도 분석

### 1.1 신규 테이블 설계 (제안)

```sql
-- 소재 자재-등급 매핑 테이블
CREATE TABLE COPPER_ITEM_GRADE_MAPPING (
    item_code VARCHAR(20) NOT NULL,
    grade_code VARCHAR(10) NOT NULL,
    grade_name VARCHAR(50),
    is_active CHAR(1) DEFAULT 'Y',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    PRIMARY KEY (item_code, grade_code)
);

-- 등급 마스터 테이블 (필요시)
CREATE TABLE COPPER_GRADE_MASTER (
    grade_code VARCHAR(10) PRIMARY KEY,
    grade_name VARCHAR(50) NOT NULL,
    sort_order INT,
    is_active CHAR(1) DEFAULT 'Y'
);
```

### 1.2 기존 테이블 영향도

| 테이블명 | 영향도 | 변경 필요성 | 비고 |
|---------|-------|------------|------|
| INTERFACE_PRODUCT_MASTER | **없음** | 변경 불필요 | 다른 부서 영향 방지 |
| PRODUCT | **없음** | 변경 불필요 | 기존 자재 마스터 유지 |
| VEHICLE_ALLOC_INFORM | **높음** | 조회 로직 수정 | 소재 배차 정보에서 등급 참조 |
| ORDER_ITEMS | **중간** | 조회 로직 수정 | 소재 주문 시 등급 표시 |

## 2. 백엔드 영향도 분석

### 2.1 Service Layer 영향도

| 서비스 클래스 | 영향도 | 수정 필요 메소드 | 변경 내용 |
|-------------|-------|----------------|-----------|
| **ProductService** | **높음** | `getProductList()`, `getProductByItemCode()` | 소재 팀일 경우 등급 정보 조인 |
| **InterfaceProductMasterService** | **높음** | `findByItemCode()`, `getProductsWithPartnerPrice()` | 소재 자재 조회 시 등급 매핑 |
| **StoreCopperService** | **높음** | `getAllocateStoreCopperList()`, `getCurrentStoreCopperList()` | 배차/입고 현황에서 등급 표시 |
| **NormalStoreCopperService** | **높음** | `getAllocateNormalStoreCopperList()` | 일반 전기동에서 등급 표시 |
| **OrderService** | **중간** | `getAllByPartnerId...()` | 주문 조회 시 등급 정보 포함 |

### 2.2 Repository Layer 영향도

```java
// 신규 Repository 추가 필요
@Repository
public interface CopperItemGradeMappingRepository extends JpaRepository<CopperItemGradeMapping, String> {
    List<CopperItemGradeMapping> findByItemCodeAndIsActive(String itemCode, String isActive);
    List<CopperItemGradeMapping> findByItemCodeInAndIsActive(List<String> itemCodes, String isActive);
    Optional<CopperItemGradeMapping> findByItemCodeAndGradeCodeAndIsActive(String itemCode, String gradeCode, String isActive);
}
```

### 2.3 DTO 영향도

| DTO 클래스 | 영향도 | 추가 필드 | 비고 |
|-----------|-------|-----------|------|
| **ProductResponse** | **높음** | `List<GradeInfo> grades` | 소재 자재일 경우 등급 목록 |
| **OrderItemResponse** | **중간** | `String gradeCode`, `String gradeName` | 주문 아이템에 등급 정보 |
| **StoreCopperResponse** | **높음** | `String gradeCode`, `String gradeName` | 배차 정보에 등급 추가 |

## 3. 프론트엔드 영향도 분석

### 3.1 Service Layer 영향도

| 서비스 파일 | 영향도 | 수정 필요 함수 | 변경 내용 |
|------------|-------|----------------|-----------|
| **product-service.js** | **높음** | `fetchProductsWithPartnerPrice()`, `fetchCopperrodScrProductList()` | 등급 정보 포함된 응답 처리 |
| **order-service.js** | **중간** | `fetchOrderList()`, `createOrderSheet()` | 주문 시 등급 정보 처리 |
| **normal-store-copper-service.js** | **높음** | `fetchAllocateNormalStoreCopper()` | 배차 현황에 등급 표시 |

### 3.2 Store/Vuex 영향도

| Store 모듈 | 영향도 | 수정 필요 부분 | 변경 내용 |
|-----------|-------|----------------|-----------|
| **product.js** | **높음** | `state`, `mutations`, `actions` | 등급 정보 상태 관리 |
| **orderSheetPartner.js** | **중간** | `orderSheet.itemList` | 주문 아이템에 등급 정보 추가 |
| **adminCopperrod.js** | **높음** | 배차/입고 관련 상태 | 등급 정보 포함 |

### 3.3 Component 영향도

| 컴포넌트 경로 | 영향도 | 수정 필요 부분 | 변경 내용 |
|-------------|-------|----------------|-----------|
| **views/Order/partner/OrderSheet/** | **중간** | 자재 선택 드롭다운 | 소재일 경우 등급 선택 추가 |
| **views/Admin/store-copper/** | **높음** | 배차/입고 현황 테이블 | 등급 컬럼 추가 |
| **views/Admin/normal-store-copper/** | **높음** | 일반 전기동 테이블 | 등급 컬럼 추가 |
| **components/form/** | **중간** | 자재 선택 컴포넌트 | 등급 선택 UI 추가 |

## 4. API 엔드포인트 영향도

### 4.1 신규 API 엔드포인트

```java
// 등급 매핑 관리 API
@RestController
@RequestMapping("/api/v1/copper/grade-mapping")
public class CopperGradeMappingController {
    
    @GetMapping("/item/{itemCode}")
    public List<GradeMappingResponse> getGradesByItemCode(@PathVariable String itemCode);
    
    @PostMapping
    public GradeMappingResponse createGradeMapping(@RequestBody GradeMappingRequest request);
    
    @PutMapping("/{itemCode}/{gradeCode}")
    public GradeMappingResponse updateGradeMapping(@PathVariable String itemCode, 
                                                  @PathVariable String gradeCode,
                                                  @RequestBody GradeMappingRequest request);
}
```

### 4.2 기존 API 수정 필요

| 엔드포인트 | 컨트롤러 | 수정 필요성 | 변경 내용 |
|-----------|----------|------------|-----------|
| `/api/v1/common/products` | **CommonProductController** | **높음** | 소재 자재 조회 시 등급 정보 포함 |
| `/api/v1/partner/orders` | **PartnerOrderController** | **중간** | 주문 조회/생성 시 등급 처리 |
| `/api/v1/copperrod/store-copper/allocate-store-copper` | **SalesStoreCopperController** | **높음** | 배차 현황에 등급 정보 |
| `/api/v1/copperrod/normal-store-copper` | **SalesNormalStoreCopperController** | **높음** | 일반 전기동에 등급 정보 |

## 5. 핵심 비즈니스 로직 영향도

### 5.1 등급 판별 로직 (신규)

```java
@Service
public class CopperGradeService {
    
    // 소재 부서 여부 판별
    public boolean isCopperTeam(String salesTeamCode) {
        return "CopperRod".equals(salesTeamCode);
    }
    
    // 자재 코드에 대한 등급 목록 조회
    public List<GradeMappingResponse> getGradesByItemCode(String itemCode, String salesTeamCode) {
        if (!isCopperTeam(salesTeamCode)) {
            return Collections.emptyList();
        }
        return copperItemGradeMappingRepository.findByItemCodeAndIsActive(itemCode, "Y");
    }
    
    // 등급 유효성 검증
    public boolean isValidGrade(String itemCode, String gradeCode, String salesTeamCode) {
        if (!isCopperTeam(salesTeamCode)) {
            return true; // 소재가 아닌 경우 등급 검증 스킵
        }
        return copperItemGradeMappingRepository
            .findByItemCodeAndGradeCodeAndIsActive(itemCode, gradeCode, "Y")
            .isPresent();
    }
}
```

### 5.2 기존 로직 수정 포인트

```java
// ProductService 수정 예시
@Service
public class ProductService {
    
    @Autowired
    private CopperGradeService copperGradeService;
    
    public List<ProductResponse> getProductsWithGrades(String salesTeamCode) {
        List<Product> products = productRepository.findAll();
        
        return products.stream().map(product -> {
            ProductResponse response = modelMapper.map(product, ProductResponse.class);
            
            // 소재 부서일 경우에만 등급 정보 추가
            if (copperGradeService.isCopperTeam(salesTeamCode)) {
                List<GradeMappingResponse> grades = 
                    copperGradeService.getGradesByItemCode(product.getItemCode(), salesTeamCode);
                response.setGrades(grades);
            }
            
            return response;
        }).collect(toList());
    }
}
```

## 6. 권한 및 팀별 분기 로직 영향도

### 6.1 기존 팀 판별 로직 확장

```javascript
// 프론트엔드 - 팀 관련 유틸리티 확장
export const TEAM_UTILS = {
  isCopperRod: (teamCode) => teamCode === 'CopperRod',
  
  // 등급 정보가 필요한 팀인지 판별
  needsGradeInfo: (teamCode) => {
    return TEAM_UTILS.isCopperRod(teamCode);
  },
  
  // 등급 선택이 필수인지 판별
  isGradeRequired: (teamCode, itemCode) => {
    return TEAM_UTILS.isCopperRod(teamCode) && itemCode;
  }
};
```

### 6.2 컴포넌트 조건부 렌더링 수정

```vue
<!-- OrderSheetItemList.vue 예시 -->
<template>
  <div>
    <!-- 기존 자재 선택 -->
    <item-code-input v-model="item.itemCode" />
    
    <!-- 소재일 경우에만 등급 선택 표시 -->
    <grade-select 
      v-if="needsGradeSelection"
      v-model="item.gradeCode"
      :item-code="item.itemCode"
      :required="true"
    />
  </div>
</template>

<script>
export default {
  computed: {
    needsGradeSelection() {
      return this.$store.getters.isCopperRod && this.item.itemCode;
    }
  }
}
</script>
```

## 7. 마이그레이션 전략

### 7.1 단계별 배포 계획

1. **1단계**: 신규 테이블 생성 및 데이터 마이그레이션
2. **2단계**: 백엔드 API 수정 (기존 API 호환성 유지)
3. **3단계**: 프론트엔드 UI 수정
4. **4단계**: 기존 데이터 검증 및 정리

### 7.2 호환성 보장 방안

```java
// 기존 API 호환성을 위한 Wrapper
@Service
public class ProductCompatibilityService {
    
    // 기존 방식과 신규 방식 모두 지원
    public ProductResponse getProduct(String itemCode, String salesTeamCode, boolean includeGrades) {
        ProductResponse response = getBasicProduct(itemCode);
        
        // 등급 정보 포함 요청이고 소재 부서인 경우
        if (includeGrades && copperGradeService.isCopperTeam(salesTeamCode)) {
            List<GradeMappingResponse> grades = 
                copperGradeService.getGradesByItemCode(itemCode, salesTeamCode);
            response.setGrades(grades);
        }
        
        return response;
    }
}
```

## 8. 검증 및 테스트 포인트

### 8.1 데이터 무결성 검증

- [ ] 소재 부서 자재 코드에 대한 등급 매핑 누락 확인
- [ ] 다른 부서 자재 조회 시 등급 정보 미포함 확인
- [ ] 기존 주문/배차 데이터의 등급 정보 호환성 확인

### 8.2 기능 테스트

- [ ] 소재 부서 자재 선택 시 등급 드롭다운 표시 확인
- [ ] 등급 미선택 시 유효성 검증 확인
- [ ] 비소재 부서에서 기존 기능 정상 동작 확인

## 9. 주요 리스크 및 대응 방안

### 9.1 데이터 일관성 리스크

**리스크**: 기존 소재 관련 데이터에 등급 정보 누락
**대응**: 마이그레이션 스크립트로 기본 등급 설정

### 9.2 성능 영향

**리스크**: 등급 조인으로 인한 조회 성능 저하
**대응**: 필요시에만 등급 정보 조회하는 lazy loading 적용

### 9.3 UI/UX 변경

**리스크**: 기존 사용자 워크플로우 변경
**대응**: 소재 부서 대상 사전 교육 및 단계적 적용

이러한 분석을 바탕으로 소재 부서의 자재-등급 매핑 테이블 도입 시 전체 시스템에 미치는 영향을 최소화하면서도 요구사항을 만족할 수 있는 구현 방안을 수립할 수 있습니다.