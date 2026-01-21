# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-17
- **분석자:** GitHub Copilot
- **분석 대상 소스:** App.vue, TheNavigation.vue

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 앱 메인 | TheNavigation | 메뉴 클릭 | onClickMenu | - | App.vue, TheNavigation.vue |
| 앱 메인 | 에러 다이얼로그 | 닫기 버튼 클릭 | onClickErrorDialogClose | - | App.vue |
| 앱 메인 | 로딩 다이얼로그 | 자동 표시/숨김 | - | - | App.vue |
| 앱 메인 | PortalTarget | 팝업 렌더링 | - | - | App.vue |
| 네비게이션 | 메뉴 아이템 | 링크 클릭 | onClickMenu | - | TheNavigation.vue |
| 네비게이션 | 메뉴 권한 검사 | 컴포넌트 마운트 | hasAuthorities | - | TheNavigation.vue |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| App | App.vue | 앱 전체 레이아웃 구성, 에러 처리, 반응형 레이아웃 | onClickMenu, onClickErrorDialogClose | - | Vuex → App → 하위 컴포넌트 |
| TheNavigation | TheNavigation.vue | 좌측 메뉴 표시, 권한별 메뉴 관리 | onClickMenu, hasAuthorities | - | App → TheNavigation → 이벤트 발생 → App |
| TheContent | TheContent.vue | 메인 콘텐츠 영역 | - | - | App → TheContent → router-view |
| BaseDialogModal | src/components/dialog/BaseDialogModal | 모달 다이얼로그 표시 | - | - | App → BaseDialogModal |
| PortalTarget | portal-vue | 팝업/확인창 표시 영역 | - | - | 자식 컴포넌트 → Portal → PortalTarget |

## 2. 권한 및 메뉴 구조 분석

### 2.1 권한별 메뉴 분기

| 권한/조건 | 메뉴 항목 | 경로 | 접근 조건식 | 파일 |
|----------|----------|-----|------------|------|
| isCopperRod | 주문 | /order | hasAuthorities('/order') | TheNavigation.vue |
| isCopperRod | 주문(신규) | /purchase-order | hasAuthorities('/order') | TheNavigation.vue |
| isCopperRod | 출하 | /shipment | hasAuthorities('/shipment') && !isCopperRodMeasure && !isCopperRodShipCompany && !isCopperRodNonFerrous | TheNavigation.vue |
| isCopperRod | 재고검색 | /stock | hasAuthorities('/stock') && !isAuthorityPartner | TheNavigation.vue |
| isCopperRod | 관리자 | /admin | hasAuthorities('/admin') | TheNavigation.vue |
| isCopperRod | 계획량 | /plan-amount | hasAuthorities('/admin') | TheNavigation.vue |
| isCopperRod | 수탁 전기동 | /store-copper | hasAuthorities('/storeCopper') && !isCopperRodShipCompany && !isCopperRodNonFerrous && !String(loginId).startsWith('6') | TheNavigation.vue |
| isCopperRod | 일반 전기동 | /normal-store-copper | hasAuthorities('/storeCopper') && !isAuthorityPartner | TheNavigation.vue |
| isCopperRod | SCR 생산 요청 | /scr-product-plan | hasAuthorities('/scrProductPlan') && !isAuthorityPartner && !isCopperRodNonFerrous && !isCopperRodMeasure | TheNavigation.vue |
| isCopperRod | 공지 & 자료실 | /board | hasAuthorities('/board') && !isCopperRodMeasure && !isCopperRodShipCompany && !isCopperRodNonFerrous && !isCopperRodProduction && !String(loginId).startsWith('6') | TheNavigation.vue |
| !isCopperRod | 출하 | /shipment | hasAuthorities('/shipment') | TheNavigation.vue |
| !isCopperRod | 재고검색 | /stock | hasAuthorities('/stock') | TheNavigation.vue |
| !isCopperRod | 견적 | /estimate | hasAuthorities('/estimate') | TheNavigation.vue |
| !isCopperRod | 계약 | /placeorder | hasAuthorities('/placeorder') | TheNavigation.vue |
| !isCopperRod | 주문 | /order | hasAuthorities('/order') && showOrderMenu | TheNavigation.vue |
| !isCopperRod | 관리자 | /admin | hasAuthorities('/admin') | TheNavigation.vue |
| !isCopperRod | 게시판 | /notice | hasAuthorities('/notice') | TheNavigation.vue |
| !isCopperRod | 자료실 | /board | hasAuthorities('/board') | TheNavigation.vue |

### 2.2 권한 함수 및 조건식

| 함수/계산식 | 목적 | 구현 위치 | 호출 위치 |
|------------|------|-----------|----------|
| hasAuthorities | 권한에 따른 메뉴 접근 제어 | Vuex getter | TheNavigation.vue |
| showOrderMenu | 주문 메뉴 표시 여부 | TheNavigation.vue (computed) | TheNavigation.vue |
| showLNB | 네비게이션 표시 여부 | App.vue (computed) | App.vue |
| isMobile | 모바일 장치 여부 | App.vue (computed) | App.vue |

## 3. 레이아웃 및 UI 구조 분석

### 3.1 레이아웃 구조

| 영역 | 클래스명 | 조건부 표시 | 역할 | 파일 |
|-----|---------|------------|------|------|
| 앱 전체 | app | 항상 표시 | 최상위 컨테이너 | App.vue |
| 데스크톱 레이아웃 | app__main | !isMobile | 데스크톱 레이아웃 | App.vue |
| 네비게이션 | app__navigation | !isMobile && showLNB | 좌측 메뉴 영역 | App.vue |
| 콘텐츠 영역 | app__content | !isMobile | 메인 콘텐츠 영역 | App.vue |
| 모바일 레이아웃 | app__mobile-main | isMobile | 모바일 레이아웃 | App.vue |
| 로딩 다이얼로그 | loading-dialog__image | isShowProgress | 로딩 스피너 | App.vue |
| 에러 다이얼로그 | error-dialog | showError | 에러 메시지 팝업 | App.vue |
| 메뉴 컨테이너 | menus | 항상 표시 | 메뉴 항목 컨테이너 | TheNavigation.vue |
| 메뉴 항목 | menu-item | 권한에 따라 다름 | 개별 메뉴 링크 | TheNavigation.vue |
| 선택된 메뉴 항목 | menu-item--selected | active-class | 현재 선택된 메뉴 | TheNavigation.vue |

### 3.2 스타일 및 디자인

| 요소 | 스타일 속성 | 값 | 파일 |
|-----|------------|---|------|
| 앱 폰트 | font-family | NotoSansCJKkr sans-serif | App.vue |
| 앱 색상 | color | #2c3e50 | App.vue |
| 네비게이션 너비 | width | 150px | App.vue |
| 네비게이션 배경 | background-color | #0d0541 | App.vue |
| 콘텐츠 배경 | background-color | #eff2f8 | App.vue |
| 선택된 메뉴 배경 | background-color | $menu-item-selected | TheNavigation.vue |
| 메뉴 항목 색상 | color | rgba(255, 255, 255, 0.8) | TheNavigation.vue |
| 선택된 메뉴 색상 | color | rgba(255, 255, 255, 1) | TheNavigation.vue |

## 4. 개선 요구사항 및 설계

### 4.1 현재 시스템 한계점
- 메뉴 권한 체크 로직이 복잡하고 하드코딩되어 있음(`v-if` 조건식이 매우 복잡)
- 에러 메시지 처리 로직이 컴포넌트에 직접 구현되어 있음
- 하드코딩된 이메일 주소 및 에러 메시지
- 고정된 레이아웃 크기(150px)가 여러 곳에서 중복 사용됨
- 모바일/데스크톱 분기 처리가 컴포넌트 내부에 직접 구현됨
- 네비게이션 메뉴 구조가 조건문으로 복잡하게 분기됨

### 4.2 개선 요구사항
- 메뉴 구조 및 권한을 설정 파일이나 DB에서 관리하도록 변경
- 에러 처리 로직을 별도 서비스로 분리
- 설정 값(이메일, 메시지 등)을 환경 변수나 설정 파일로 관리
- 반응형 디자인을 위한 CSS 변수 도입
- 컴포넌트 분리 및 역할 명확화(단일 책임 원칙)
- 메뉴 아이템 렌더링을 반복문으로 처리하여 코드 중복 제거

## 5. 구현 고려사항

### 5.1 메뉴 및 권한 관리 개선
```javascript
// 개선된 메뉴 구조 예시
const menus = {
  copperRod: [
    { path: '/order', title: '주문', permission: 'order', conditions: [] },
    { path: '/purchase-order', title: '주문(신규)', permission: 'order', conditions: [] },
    { path: '/shipment', title: '출하', permission: 'shipment', 
      conditions: ['!isCopperRodMeasure', '!isCopperRodShipCompany', '!isCopperRodNonFerrous'] }
    // 나머지 메뉴...
  ],
  default: [
    // 기본 메뉴 항목...
  ]
}
```

### 5.2 에러 처리 개선
```javascript
// 별도의 에러 처리 서비스 예시
import ErrorService from '@/services/ErrorService';

// 컴포넌트에서
computed: {
  errorInfo() {
    return ErrorService.getErrorInfo(this.errorCode);
  }
}
```

이 분석을 통해 One-Pick 시스템의 App.vue와 TheNavigation.vue 컴포넌트의 구조와 기능을 파악하고, 개선이 필요한 영역을 식별했습니다. 특히 복잡한 권한 분기 로직과 하드코딩된 값들을 개선하는 것이 향후 유지보수성을 높이는 데 중요합니다.

# 레거시 코드 분석 및 기능 고도화 설계서

## 기본 정보
- **분석일자:** 2025-10-17
- **분석자:** GitHub Copilot
- **분석 대상 소스:** App.vue, TheNavigation.vue

## 1. 프론트엔드 분석

### 1.1 화면 및 이벤트 흐름

| 화면명 | 구성요소 | 이벤트 | 실행 함수 | API 호출 | 참조 파일 |
|-------|---------|--------|----------|----------|----------|
| 앱 메인 | TheNavigation | 메뉴 클릭 | onClickMenu | - | App.vue, TheNavigation.vue |
| 앱 메인 | 에러 다이얼로그 | 닫기 버튼 클릭 | onClickErrorDialogClose | - | App.vue |
| 앱 메인 | 로딩 다이얼로그 | 자동 표시/숨김 | - | - | App.vue |

### 1.2 주요 컴포넌트 분석

| 컴포넌트명 | 파일 경로 | 주요 기능 | 호출 함수 | 호출 API | 데이터 흐름 |
|-----------|----------|----------|-----------|---------|------------|
| App | App.vue | 앱 전체 레이아웃 구성, 에러 처리 | onClickMenu, onClickErrorDialogClose | - | Vuex → App → 하위 컴포넌트 |
| TheNavigation | TheNavigation.vue | 좌측 메뉴 표시, 권한별 메뉴 관리 | onClickMenu, hasAuthorities | - | App → TheNavigation → 이벤트 발생 → App |

## 2. 백엔드 분석

### 2.1 API 및 컨트롤러 (추정)

| 엔드포인트 | 메소드 | 컨트롤러 | 핵심 로직 | 호출 서비스 | 응답 형식 |
|-----------|-------|----------|----------|------------|----------|
| /api/auth | GET | AuthController | 사용자 인증 정보 확인 | AuthService | 권한 정보, 팀 정보 |
| /api/order | GET/POST | OrderController | 주문 조회/등록 | OrderService | 주문 데이터 |
| /api/shipment | GET | ShipmentController | 출하 정보 조회 | ShipmentService | 출하 데이터 |
| /api/stock | GET | StockController | 재고 정보 조회 | StockService | 재고 데이터 |
| /api/estimate | GET/POST | EstimateController | 견적 조회/등록 | EstimateService | 견적 데이터 |
| /api/placeorder | GET/POST | PlaceOrderController | 계약 조회/등록 | PlaceOrderService | 계약 데이터 |
| /api/store-copper | GET/POST | StoreCopperController | 수탁 전기동 관리 | StoreCopperService | 전기동 데이터 |
| /api/normal-store-copper | GET/POST | NormalStoreCopperController | 일반 전기동 관리 | NormalStoreCopperService | 일반 전기동 데이터 |
| /api/scr-product-plan | GET/POST | ScrProductPlanController | SCR 생산 요청 관리 | ScrProductPlanService | 생산 계획 데이터 |
| /api/board | GET/POST | BoardController | 게시판/자료실 관리 | BoardService | 게시물 데이터 |
| /api/notice | GET/POST | NoticeController | 공지사항 관리 | NoticeService | 공지사항 데이터 |
| /api/admin | GET/POST | AdminController | 관리자 기능 | AdminService | 관리자 데이터 |
| /api/plan-amount | GET/POST | PlanAmountController | 계획량 관리 | PlanAmountService | 계획량 데이터 |

### 2.2 권한 관련 API

| 엔드포인트 | 메소드 | 용도 | 호출 위치 | 사용 데이터 |
|-----------|-------|------|----------|------------|
| /api/auth/authorities | GET | 사용자 권한 조회 | Vuex 스토어 초기화 | hasAuthorities 게터 |
| /api/auth/user | GET | 현재 사용자 정보 조회 | Vuex 스토어 초기화 | loginId, currentTeam 게터 |
| /api/auth/team | GET | 팀 정보 조회 | Vuex 스토어 초기화 | 팀 관련 게터(isCopperRod 등) |

## 3. 권한 및 메뉴 구조 분석

### 3.1 권한별 메뉴 분기

| 권한/조건 | 메뉴 항목 | 경로 | 백엔드 연계 엔드포인트 | 
|----------|----------|-----|-------------------|
| isCopperRod | 주문 | /order | /api/order |
| isCopperRod | 주문(신규) | /purchase-order | /api/purchase-order |
| isCopperRod | 출하 | /shipment | /api/shipment |
| isCopperRod | 재고검색 | /stock | /api/stock |
| isCopperRod | 관리자 | /admin | /api/admin/* |
| isCopperRod | 계획량 | /plan-amount | /api/plan-amount |
| isCopperRod | 수탁 전기동 | /store-copper | /api/store-copper |
| isCopperRod | 일반 전기동 | /normal-store-copper | /api/normal-store-copper |
| isCopperRod | SCR 생산 요청 | /scr-product-plan | /api/scr-product-plan |
| isCopperRod | 공지 & 자료실 | /board | /api/board |
| !isCopperRod | 출하 | /shipment | /api/shipment |
| !isCopperRod | 재고검색 | /stock | /api/stock |
| !isCopperRod | 견적 | /estimate | /api/estimate |
| !isCopperRod | 계약 | /placeorder | /api/placeorder |
| !isCopperRod | 주문 | /order | /api/order |
| !isCopperRod | 관리자 | /admin | /api/admin/* |
| !isCopperRod | 게시판 | /notice | /api/notice |
| !isCopperRod | 자료실 | /board | /api/board |

## 4. 에러 처리 및 공통 기능 분석

### 4.1 에러 처리 API

| 용도 | 프론트엔드 처리 | 추정 백엔드 엔드포인트 |
|-----|----------------|------------------|
| 일반 오류 | errorMessages 상수에서 조회하여 다이얼로그 표시 | /api/error/log (에러 로깅용) |
| 여신 오류 | CREDIT_STATUS_ERROR 특수 처리 | /api/credit/status |
| 공통 에러 핸들링 | axios interceptor에서 처리 (추정) | 모든 API 응답의 에러 처리 |

### 4.2 인증 관련 API

| 용도 | 프론트엔드 처리 | 추정 백엔드 엔드포인트 |
|-----|----------------|------------------|
| 로그인 | Login.vue (추정) | /api/auth/login |
| 권한 검사 | hasAuthorities Vuex 게터 | /api/auth/authorities |
| 사용자 정보 | Vuex 스토어에 저장 | /api/auth/user |

## 5. 개선 요구사항 및 설계

### 5.1 현재 시스템 한계점
- 백엔드 API 호출이 컴포넌트에 직접 구현되어 있을 가능성 높음 (중앙 관리 부재)
- 에러 처리 로직이 하드코딩됨
- 권한 체크를 위한 API 호출이 비효율적일 가능성
- API 응답 캐싱 메커니즘 부재

### 5.2 개선 요구사항
- API 클라이언트 추상화 레이어 구현
- 권한 기반 API 접근 제어 강화
- 에러 처리를 위한 중앙화된 서비스
- API 응답 캐싱 전략 수립
- 백엔드 연동 테스트 자동화

### 5.3 API 연계 개선 방안
```javascript
// API 클라이언트 추상화 예시
import ApiClient from '@/services/api-client';

// 모듈별 API 서비스 예시
const OrderApi = {
  getOrders: (params) => ApiClient.get('/api/order', { params }),
  createOrder: (data) => ApiClient.post('/api/order', data),
  // ...
}

// 권한 기반 API 접근 제어
ApiClient.interceptors.request.use(config => {
  const store = require('@/store').default;
  const path = config.url.replace(/^\/api/, '');
  
  if (!store.getters.hasAuthorities(path)) {
    return Promise.reject(new Error('권한이 없습니다.'));
  }
  
  return config;
});
```

이 분석을 통해 One-Pick 시스템의 프론트엔드와 백엔드 간의 연계 구조를 이해하고, 권한에 따른 API 접근 제어 및 에러 처리 방식을 파악할 수 있었습니다. 개선사항으로는 API 호출 로직의 중앙화 및 추상화, 효율적인 권한 체크 메커니즘, 그리고 에러 처리 로직의 개선이 필요합니다.