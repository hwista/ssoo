# 주문계획 관리 기능 설계서

## 5. 주문계획 관리 기능 설계

### 5.1 기능 개요

기존 "다음달 예측량 계획 설정" 팝업 기능을 확장하여 장기적인 주문계획을 연월 단위로 관리할 수 있는 독립적인 프로그램으로 개발합니다.

### 5.2 화면 설계

#### 5.2.1 주문계획 메인 화면 (OrderPlanMain.vue)

```vue
<template>
  <div class="order-plan-main">
    <!-- 헤더 영역 -->
    <div class="page-header">
      <h2>주문계획 관리</h2>
      <div class="header-actions">
        <button @click="onCreatePlan" class="btn-primary">
          <i class="icon-plus"></i> 계획 생성
        </button>
        <button @click="onRefresh" class="btn-secondary">
          <i class="icon-refresh"></i> 새로고침
        </button>
      </div>
    </div>

    <!-- 검색 조건 영역 -->
    <div class="search-panel">
      <div class="search-row">
        <div class="search-group">
          <label>계획 년월</label>
          <div class="date-range">
            <input type="month" v-model="searchForm.fromYearMonth" class="form-control">
            <span>~</span>
            <input type="month" v-model="searchForm.toYearMonth" class="form-control">
          </div>
        </div>
        
        <div class="search-group">
          <label>자재 코드</label>
          <select v-model="searchForm.itemCode" class="form-control">
            <option value="">전체</option>
            <option v-for="item in itemList" :key="item.code" :value="item.code">
              {{ item.code }} - {{ item.name }}
            </option>
          </select>
        </div>
        
        <div class="search-group" v-if="showGradeFilter">
          <label>등급</label>
          <select v-model="searchForm.gradeCode" class="form-control">
            <option value="">전체</option>
            <option v-for="grade in gradeList" :key="grade" :value="grade">
              {{ grade }}
            </option>
          </select>
        </div>
        
        <div class="search-group">
          <label>계획 상태</label>
          <select v-model="searchForm.planStatus" class="form-control">
            <option value="">전체</option>
            <option value="DRAFT">임시저장</option>
            <option value="SUBMITTED">제출</option>
            <option value="APPROVED">승인</option>
            <option value="REJECTED">반려</option>
          </select>
        </div>
        
        <div class="search-actions">
          <button @click="onSearch" class="btn-search">검색</button>
          <button @click="onReset" class="btn-reset">초기화</button>
        </div>
      </div>
    </div>

    <!-- 계획 목록 그리드 -->
    <div class="grid-container">
      <div class="grid-header">
        <h3>주문계획 목록</h3>
        <div class="grid-info">
          총 {{ totalCount }}건 ({{ currentPage }}/{{ totalPages }} 페이지)
        </div>
      </div>
      
      <div class="grid-content">
        <table class="data-grid">
          <thead>
            <tr>
              <th width="50">
                <input type="checkbox" v-model="allSelected" @change="onSelectAll">
              </th>
              <th width="120">계획 번호</th>
              <th width="100">계획 년월</th>
              <th width="150">자재 코드</th>
              <th width="100">자재명</th>
              <th width="80">등급</th>
              <th width="120">구매계획량</th>
              <th width="120">판매계획량</th>
              <th width="100">계획 상태</th>
              <th width="120">생성일</th>
              <th width="100">생성자</th>
              <th width="120">수정일</th>
              <th width="100">수정자</th>
              <th width="100">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="plan in planList" :key="plan.planId" 
                :class="{ 'selected': plan.selected }"
                @click="onRowClick(plan)">
              <td>
                <input type="checkbox" v-model="plan.selected" @click.stop>
              </td>
              <td>{{ plan.planId }}</td>
              <td>{{ formatYearMonth(plan.planYearMonth) }}</td>
              <td>{{ plan.itemCode }}</td>
              <td>{{ plan.itemName }}</td>
              <td>{{ plan.gradeCode || '-' }}</td>
              <td class="text-right">{{ formatNumber(plan.purchasePlanQuantity) }}</td>
              <td class="text-right">{{ formatNumber(plan.salesPlanQuantity) }}</td>
              <td>
                <span :class="['status-badge', plan.planStatus.toLowerCase()]">
                  {{ getStatusText(plan.planStatus) }}
                </span>
              </td>
              <td>{{ formatDateTime(plan.createdDate) }}</td>
              <td>{{ plan.createdBy }}</td>
              <td>{{ formatDateTime(plan.updatedDate) }}</td>
              <td>{{ plan.updatedBy }}</td>
              <td>
                <div class="action-buttons">
                  <button @click.stop="onEdit(plan)" class="btn-sm btn-edit" 
                          :disabled="!canEdit(plan)">
                    수정
                  </button>
                  <button @click.stop="onDelete(plan)" class="btn-sm btn-delete"
                          :disabled="!canDelete(plan)">
                    삭제
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- 페이지네이션 -->
      <div class="pagination">
        <button @click="onPrevPage" :disabled="currentPage <= 1" class="btn-page">이전</button>
        <span v-for="page in visiblePages" :key="page">
          <button @click="onPageClick(page)" 
                  :class="['btn-page', { active: page === currentPage }]">
            {{ page }}
          </button>
        </span>
        <button @click="onNextPage" :disabled="currentPage >= totalPages" class="btn-page">다음</button>
      </div>
    </div>

    <!-- 일괄 작업 버튼 -->
    <div class="bulk-actions" v-if="selectedPlans.length > 0">
      <div class="selected-info">{{ selectedPlans.length }}건 선택됨</div>
      <button @click="onBulkSubmit" class="btn-bulk">일괄 제출</button>
      <button @click="onBulkDelete" class="btn-bulk btn-danger">일괄 삭제</button>
    </div>
  </div>
</template>
```

#### 5.2.2 주문계획 생성/수정 화면 (OrderPlanForm.vue)

```vue
<template>
  <div class="order-plan-form">
    <!-- 헤더 -->
    <div class="form-header">
      <h2>{{ isEditMode ? '주문계획 수정' : '주문계획 생성' }}</h2>
      <div class="form-actions">
        <button @click="onSaveDraft" class="btn-secondary">임시저장</button>
        <button @click="onSubmit" class="btn-primary">제출</button>
        <button @click="onCancel" class="btn-cancel">취소</button>
      </div>
    </div>

    <!-- 기본 정보 입력 -->
    <div class="form-section">
      <h3>기본 정보</h3>
      <div class="form-grid">
        <div class="form-group">
          <label class="required">자재 코드</label>
          <select v-model="planForm.itemCode" @change="onItemCodeChange" 
                  class="form-control" :disabled="isEditMode">
            <option value="">자재를 선택하세요</option>
            <option v-for="item in itemList" :key="item.code" :value="item.code">
              {{ item.code }} - {{ item.name }}
            </option>
          </select>
        </div>
        
        <div class="form-group" v-if="showGradeSelector">
          <label class="required">등급 코드</label>
          <select v-model="planForm.gradeCode" @change="onGradeCodeChange"
                  class="form-control" :disabled="isEditMode">
            <option value="">등급을 선택하세요</option>
            <option v-for="grade in availableGrades" :key="grade" :value="grade">
              {{ grade }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <!-- 계획 기간 설정 -->
    <div class="form-section">
      <h3>계획 기간</h3>
      <div class="period-selector">
        <div class="period-type">
          <label>
            <input type="radio" v-model="periodType" value="single"> 단일 월
          </label>
          <label>
            <input type="radio" v-model="periodType" value="range"> 기간 설정
          </label>
        </div>
        
        <div v-if="periodType === 'single'" class="single-period">
          <label>계획 년월</label>
          <input type="month" v-model="singleYearMonth" class="form-control">
        </div>
        
        <div v-if="periodType === 'range'" class="range-period">
          <label>시작 년월</label>
          <input type="month" v-model="startYearMonth" class="form-control">
          <label>종료 년월</label>
          <input type="month" v-model="endYearMonth" class="form-control">
          <button @click="generatePeriods" class="btn-generate">기간 생성</button>
        </div>
      </div>
    </div>

    <!-- 월별 계획량 입력 그리드 -->
    <div class="form-section">
      <h3>월별 계획량 입력</h3>
      <div class="plan-grid-container">
        <table class="plan-grid">
          <thead>
            <tr>
              <th width="120">계획 년월</th>
              <th width="150">구매계획량 (Ton)</th>
              <th width="150">판매계획량 (Ton)</th>
              <th width="200">비고</th>
              <th width="80">액션</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(period, index) in planPeriods" :key="index">
              <td>
                <input type="month" v-model="period.yearMonth" 
                       class="form-control-sm" :disabled="isEditMode">
              </td>
              <td>
                <input type="number" v-model="period.purchasePlanQuantity" 
                       class="form-control-sm text-right" step="0.001" min="0"
                       @input="onQuantityChange(period)">
              </td>
              <td>
                <span class="readonly-value">{{ period.salesPlanQuantity || 0 }}</span>
                <small class="text-muted">(자동 연계)</small>
              </td>
              <td>
                <input type="text" v-model="period.remarks" 
                       class="form-control-sm" placeholder="비고 입력">
              </td>
              <td>
                <button @click="removePeriod(index)" class="btn-sm btn-remove"
                        :disabled="planPeriods.length <= 1">
                  삭제
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td><strong>합계</strong></td>
              <td class="text-right"><strong>{{ totalPurchasePlan }}</strong></td>
              <td class="text-right"><strong>{{ totalSalesPlan }}</strong></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        
        <div class="grid-actions">
          <button @click="addPeriod" class="btn-add">기간 추가</button>
          <button @click="copyFromPrevious" class="btn-copy">이전 계획 복사</button>
        </div>
      </div>
    </div>

    <!-- 검증 결과 표시 -->
    <div class="validation-section" v-if="validationResults.length > 0">
      <h3>계획 검증 결과</h3>
      <div class="validation-list">
        <div v-for="result in validationResults" :key="result.period"
             :class="['validation-item', result.isValid ? 'valid' : 'invalid']">
          <div class="validation-period">{{ result.period }}</div>
          <div class="validation-message">{{ result.message }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
```

### 5.3 UI 목업 이미지

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ 주문계획 관리                                    [계획 생성] [새로고침]              │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 검색 조건                                                                        │
│ 계획년월: [2024-01] ~ [2024-12]  자재코드: [전체 ▼]  등급: [전체 ▼]  상태: [전체 ▼] │
│                                                            [검색] [초기화]        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 주문계획 목록                                               총 25건 (1/3 페이지)  │
├───┬────────┬────────┬────────┬────────┬────┬────────┬────────┬────────┬──────┤
│☐ │계획번호  │계획년월  │자재코드  │자재명    │등급│구매계획량│판매계획량│상태    │액션  │
├───┼────────┼────────┼────────┼────────┼────┼────────┼────────┼────────┼──────┤
│☐ │PP240001 │2024-01 │CU001   │전기동A급 │A  │1,500.0 │1,200.0 │제출    │수정삭제│
│☐ │PP240002 │2024-02 │CU001   │전기동A급 │A  │1,600.0 │1,300.0 │승인    │수정삭제│
│☐ │PP240003 │2024-03 │CU002   │전기동B급 │B  │2,000.0 │1,800.0 │임시저장 │수정삭제│
└───┴────────┴────────┴────────┴────────┴────┴────────┴────────┴────────┴──────┘
│                              [이전] [1] [2] [3] [다음]                         │
│ 3건 선택됨                                        [일괄 제출] [일괄 삭제]        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ 주문계획 생성                                    [임시저장] [제출] [취소]          │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 기본 정보                                                                        │
│ 자재코드: [CU001 - 전기동A급 ▼]    등급코드: [A ▼]                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 계획 기간                                                                        │
│ ◉ 단일 월  ○ 기간 설정                                                          │
│ 계획년월: [2024-01]                                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 월별 계획량 입력                                                                 │
├────────┬─────────────┬─────────────┬──────────────┬────────┤
│계획년월  │구매계획량(Ton)│판매계획량(Ton)│비고          │액션    │
├────────┼─────────────┼─────────────┼──────────────┼────────┤
│2024-01 │[1,500.000]  │1,200.0      │신규 계획     │[삭제]  │
│        │             │(자동 연계)   │              │        │
├────────┼─────────────┼─────────────┼──────────────┼────────┤
│합계     │1,500.000    │1,200.0      │              │        │
└────────┴─────────────┴─────────────┴──────────────┴────────┘
│                                          [기간 추가] [이전 계획 복사]            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ 계획 검증 결과                                                                   │
│ ✅ 2024-01: 계획량이 적절합니다.                                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 백엔드 설계

#### 5.4.1 PURCHASE_PLAN 테이블 확장

```sql
-- 기존 PURCHASE_PLAN 테이블에 추가 컬럼
ALTER TABLE PURCHASE_PLAN ADD COLUMN plan_status VARCHAR(20) DEFAULT 'DRAFT' COMMENT '계획 상태 (DRAFT, SUBMITTED, APPROVED, REJECTED)';
ALTER TABLE PURCHASE_PLAN ADD COLUMN remarks VARCHAR(500) COMMENT '비고';
ALTER TABLE PURCHASE_PLAN ADD COLUMN submitted_date DATETIME COMMENT '제출일';
ALTER TABLE PURCHASE_PLAN ADD COLUMN approved_date DATETIME COMMENT '승인일';
ALTER TABLE PURCHASE_PLAN ADD COLUMN approved_by VARCHAR(50) COMMENT '승인자';

-- 인덱스 추가
CREATE INDEX idx_purchase_plan_status ON PURCHASE_PLAN (plan_status);
CREATE INDEX idx_purchase_plan_submitted_date ON PURCHASE_PLAN (submitted_date);
```

#### 5.4.2 API 설계

| 메소드 | 엔드포인트 | 기능 설명 | 권한 | 입력 | 출력 |
|--------|-----------|----------|------|------|------|
| GET | `/api/v1/purchase-plans` | 주문계획 목록 조회 | USER | PurchasePlanSearchRequest | PagedResponse<PurchasePlanResponse> |
| GET | `/api/v1/purchase-plans/{planId}` | 주문계획 상세 조회 | USER | Path Parameter | PurchasePlanDetailResponse |
| POST | `/api/v1/purchase-plans` | 주문계획 생성 | USER | PurchasePlanCreateRequest | PurchasePlanResponse |
| PUT | `/api/v1/purchase-plans/{planId}` | 주문계획 수정 | USER | PurchasePlanUpdateRequest | PurchasePlanResponse |
| DELETE | `/api/v1/purchase-plans/{planId}` | 주문계획 삭제 | USER | Path Parameter | ResponseEntity<Void> |
| POST | `/api/v1/purchase-plans/bulk-submit` | 주문계획 일괄 제출 | USER | List<String> planIds | BulkOperationResponse |
| POST | `/api/v1/purchase-plans/bulk-delete` | 주문계획 일괄 삭제 | USER | List<String> planIds | BulkOperationResponse |
| GET | `/api/v1/purchase-plans/copy-previous` | 이전 계획 복사 | USER | itemCode, gradeCode, fromYearMonth | List<PurchasePlanResponse> |

#### 5.4.3 Service 클래스 설계

```java
@Service
@RequiredArgsConstructor
public class PurchasePlanService {
    
    private final PurchasePlanRepository purchasePlanRepository;
    private final ItemGradeService itemGradeService;
    private final SalesPlanInterfaceRepository salesPlanInterfaceRepository;
    
    // 주문계획 목록 조회
    public PagedResponse<PurchasePlanResponse> getPurchasePlans(PurchasePlanSearchRequest request) {
        Specification<PurchasePlan> spec = buildSearchSpecification(request);
        Page<PurchasePlan> page = purchasePlanRepository.findAll(spec, request.toPageable());
        
        List<PurchasePlanResponse> content = page.getContent().stream()
            .map(this::toPurchasePlanResponse)
            .collect(Collectors.toList());
            
        return PagedResponse.of(content, page);
    }
    
    // 주문계획 생성 (다중 기간 지원)
    @Transactional
    public List<PurchasePlanResponse> createPurchasePlans(PurchasePlanCreateRequest request) {
        // 등급 코드 검증
        validateGradeCode(request.getItemCode(), request.getGradeCode());
        
        List<PurchasePlan> plans = new ArrayList<>();
        
        for (PurchasePlanPeriod period : request.getPlanPeriods()) {
            // 중복 계획 확인
            if (existsPurchasePlan(request.getPartnerId(), request.getItemCode(), 
                                 request.getGradeCode(), period.getYearMonth())) {
                throw new DuplicatePlanException(period.getYearMonth());
            }
            
            // 계획 생성
            PurchasePlan plan = createPurchasePlan(request, period);
            
            // 판매계획 연계 (있는 경우)
            linkSalesPlan(plan);
            
            plans.add(plan);
        }
        
        List<PurchasePlan> savedPlans = purchasePlanRepository.saveAll(plans);
        return savedPlans.stream()
            .map(this::toPurchasePlanResponse)
            .collect(Collectors.toList());
    }
    
    // 이전 계획 복사
    public List<PurchasePlanResponse> copyPreviousPlans(String itemCode, String gradeCode, 
                                                       String fromYearMonth, String toYearMonth) {
        // 이전 년월의 계획 조회
        String previousYearMonth = getPreviousYearMonth(fromYearMonth);
        List<PurchasePlan> previousPlans = purchasePlanRepository
            .findByItemCodeAndGradeCodeAndPlanYearMonth(itemCode, gradeCode, previousYearMonth);
            
        // 복사 대상 기간 생성
        List<String> targetMonths = generateYearMonths(fromYearMonth, toYearMonth);
        
        List<PurchasePlan> copiedPlans = new ArrayList<>();
        for (String targetMonth : targetMonths) {
            for (PurchasePlan previousPlan : previousPlans) {
                PurchasePlan copiedPlan = copyPlan(previousPlan, targetMonth);
                copiedPlans.add(copiedPlan);
            }
        }
        
        return copiedPlans.stream()
            .map(this::toPurchasePlanResponse)
            .collect(Collectors.toList());
    }
    
    // 계획 상태 변경 (제출/승인/반려)
    @Transactional
    public PurchasePlanResponse updatePlanStatus(String planId, String status, String userId) {
        PurchasePlan plan = purchasePlanRepository.findById(planId)
            .orElseThrow(() -> new PlanNotFoundException(planId));
            
        validateStatusTransition(plan.getPlanStatus(), status);
        
        plan.setPlanStatus(status);
        plan.setUpdatedBy(userId);
        
        if ("SUBMITTED".equals(status)) {
            plan.setSubmittedDate(LocalDateTime.now());
        } else if ("APPROVED".equals(status)) {
            plan.setApprovedDate(LocalDateTime.now());
            plan.setApprovedBy(userId);
        }
        
        PurchasePlan savedPlan = purchasePlanRepository.save(plan);
        return toPurchasePlanResponse(savedPlan);
    }
}
```

### 5.5 프론트엔드 서비스 설계

#### 5.5.1 purchase-plan-service.js

```javascript
import { HTTP } from '@/api/http';

export const purchasePlanService = {
  
  // 주문계획 목록 조회
  async getPurchasePlans(searchParams) {
    const { data } = await HTTP.get('/api/v1/purchase-plans', { params: searchParams });
    return data;
  },
  
  // 주문계획 상세 조회
  async getPurchasePlan(planId) {
    const { data } = await HTTP.get(`/api/v1/purchase-plans/${planId}`);
    return data;
  },
  
  // 주문계획 생성
  async createPurchasePlans(planData) {
    const { data } = await HTTP.post('/api/v1/purchase-plans', planData);
    return data;
  },
  
  // 주문계획 수정
  async updatePurchasePlan(planId, planData) {
    const { data } = await HTTP.put(`/api/v1/purchase-plans/${planId}`, planData);
    return data;
  },
  
  // 주문계획 삭제
  async deletePurchasePlan(planId) {
    await HTTP.delete(`/api/v1/purchase-plans/${planId}`);
  },
  
  // 일괄 제출
  async bulkSubmitPlans(planIds) {
    const { data } = await HTTP.post('/api/v1/purchase-plans/bulk-submit', { planIds });
    return data;
  },
  
  // 일괄 삭제
  async bulkDeletePlans(planIds) {
    const { data } = await HTTP.post('/api/v1/purchase-plans/bulk-delete', { planIds });
    return data;
  },
  
  // 이전 계획 복사
  async copyPreviousPlans(itemCode, gradeCode, fromYearMonth, toYearMonth) {
    const { data } = await HTTP.get('/api/v1/purchase-plans/copy-previous', {
      params: { itemCode, gradeCode, fromYearMonth, toYearMonth }
    });
    return data;
  },
  
  // 계획 검증
  async validatePurchasePlans(planData) {
    const { data } = await HTTP.post('/api/v1/purchase-plans/validate', planData);
    return data;
  }
};
```

### 5.6 라우팅 설정

```javascript
// router/index.js
{
  path: '/purchase-plans',
  name: 'PurchasePlanMain',
  component: () => import('@/views/order/plan/PurchasePlanMain.vue'),
  meta: { 
    title: '주문계획 관리',
    requiresAuth: true,
    breadcrumb: [
      { text: '주문관리', to: '/orders' },
      { text: '주문계획 관리', to: '/purchase-plans' }
    ]
  }
},
{
  path: '/purchase-plans/create',
  name: 'PurchasePlanCreate',
  component: () => import('@/views/order/plan/PurchasePlanForm.vue'),
  meta: { 
    title: '주문계획 생성',
    requiresAuth: true,
    breadcrumb: [
      { text: '주문관리', to: '/orders' },
      { text: '주문계획 관리', to: '/purchase-plans' },
      { text: '계획 생성', to: '/purchase-plans/create' }
    ]
  }
},
{
  path: '/purchase-plans/:planId/edit',
  name: 'PurchasePlanEdit',
  component: () => import('@/views/order/plan/PurchasePlanForm.vue'),
  meta: { 
    title: '주문계획 수정',
    requiresAuth: true
  }
}
```

### 5.7 메뉴 구조 추가

```javascript
// 기존 주문관리 메뉴에 하위 메뉴 추가
{
  text: '주문관리',
  icon: 'shopping-cart',
  children: [
    {
      text: '주문내역',
      to: '/orders',
      icon: 'list'
    },
    {
      text: '주문계획 관리',  // 신규 추가
      to: '/purchase-plans',
      icon: 'calendar-plan'
    }
  ]
}
```

### 5.8 주요 특징

1. **장기 계획 지원**: 단일 월부터 다년간 계획까지 유연하게 입력 가능
2. **자동 연계**: 판매계획과 자동 연계되어 데이터 정합성 보장
3. **일괄 작업**: 여러 계획을 한번에 제출/삭제 가능
4. **계획 복사**: 이전 계획을 기반으로 신규 계획 생성 가능
5. **실시간 검증**: 계획 입력 시 실시간으로 유효성 검증
6. **등급별 관리**: 소재 부서 자재의 등급별 계획 관리
7. **상태 관리**: 임시저장 → 제출 → 승인/반려 워크플로우

이 설계를 통해 기존의 단순한 다음달 예측량 입력에서 장기적이고 체계적인 주문계획 관리 시스템으로 발전시킬 수 있습니다.