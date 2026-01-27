# 🔧 Phase 2.1.5 실행 계획서

**작성일**: 2025-10-29  
**작성자**: GitHub Copilot  
**리팩토링 버전**: v1  
**단계**: Phase 2.1.5 (중간 개선)

---

## 🎯 Phase 2.1.5 목표

**목적**: Phase 1-2 간 불일치 해소 및 코드 품질 완성  
**전략**: 타입 중앙화 → 서비스 확장 → 유틸리티 보강 → 검증

---

## 📋 실행 계획 상세

### **1단계: 타입 시스템 완성** (우선순위: 최고)

#### **1.1 컴포넌트 타입 중앙화**
```typescript
// 생성할 파일: types/components.ts
- WikiAppProps
- WikiSidebarProps  
- WikiEditorProps
- WikiModalsProps
- MarkdownToolbarProps
- LinkModalProps
- ImageModalProps
- CreateFileModalProps
- NotificationProps
```

#### **1.2 이벤트 핸들러 타입 표준화**
```typescript
// 표준화할 타입들
- FileSystemHandler
- EditorHandler  
- ModalHandler
- NotificationHandler
```

### **2단계: 서비스 레이어 확장** (우선순위: 높음)

#### **2.1 메타데이터 서비스 추가**
```typescript
// 생성할 파일: services/metadataService.ts
- getFileMetadata()
- refreshFileMetadata()
- formatFileSize()
- formatDateTime()
```

#### **2.2 마크다운 서비스 추가**
```typescript
// 생성할 파일: services/markdownService.ts  
- insertText()
- insertLinePrefix()
- insertTable()
- insertCodeBlock()
```

### **3단계: 유틸리티 보강** (우선순위: 중간)

#### **3.1 마크다운 유틸리티**
```typescript
// 생성할 파일: utils/markdownUtils.ts
- formatMarkdownText()
- getCursorPosition()
- adjustCursorPosition()
```

#### **3.2 성능 유틸리티**  
```typescript
// 생성할 파일: utils/performanceUtils.ts
- debounce()
- throttle()
- memoize()
```

---

## 🚀 단계별 실행 순서

### **Step 1: 타입 중앙화 시작**
1. `types/components.ts` 파일 생성
2. 기존 컴포넌트에서 Props 인터페이스 추출
3. 이벤트 핸들러 타입 통일
4. 컴포넌트 파일들 업데이트

### **Step 2: 서비스 확장**
1. `services/metadataService.ts` 구현
2. `services/markdownService.ts` 구현
3. 컴포넌트에서 로직 이동
4. 중복 코드 제거

### **Step 3: 유틸리티 추가**
1. `utils/markdownUtils.ts` 구현
2. `utils/performanceUtils.ts` 구현
3. 성능 최적화 적용
4. 전체 통합 테스트

---

## 📊 실행 전 현재 상태

### **타입 시스템**
- ✅ `types/wiki.ts`: 기본 타입 정의 완료
- ⚠️ 컴포넌트 Props 타입이 각 파일에 분산
- ⚠️ 이벤트 핸들러 타입 불일치

### **서비스 레이어**
- ✅ `services/fileService.ts`: 기본 API 완료  
- ⚠️ 메타데이터 처리 로직 분산
- ⚠️ 마크다운 처리 로직 분산

### **유틸리티 시스템**
- ✅ 4개 핵심 유틸리티 완료
- ⚠️ 마크다운 관련 유틸리티 누락
- ⚠️ 성능 최적화 유틸리티 누락

---

## 🎯 예상 결과

### **코드 품질 지표**
- **타입 안전성**: 90% → 98% (+8%)
- **코드 중복**: 5% → 2% (-60%)
- **컴포넌트 응집도**: 85% → 95% (+12%)

### **개발 경험**
- **컴포넌트 개발 속도**: +20%
- **버그 발견 시간**: -30%
- **코드 이해도**: +25%

---

## ⚠️ 리스크 관리

### **잠재적 리스크**
1. **타입 변경으로 인한 컴파일 에러**
2. **서비스 이동 중 기능 손실**
3. **성능 최적화 중 부작용**

### **리스크 완화 방안**
1. **단계별 점진적 적용**
2. **각 단계 후 기능 테스트**
3. **Git 커밋 세분화**
4. **롤백 준비**

---

## ✅ 완료 검증 기준

### **1단계 완료 기준**
- [ ] `types/components.ts` 생성 완료
- [ ] 모든 컴포넌트 Props 타입 이동 완료
- [ ] TypeScript 컴파일 에러 0개
- [ ] 기능 테스트 통과

### **2단계 완료 기준**  
- [ ] `services/metadataService.ts` 구현 완료
- [ ] `services/markdownService.ts` 구현 완료
- [ ] 컴포넌트 로직 이동 완료
- [ ] 기능 테스트 통과

### **3단계 완료 기준**
- [ ] `utils/markdownUtils.ts` 구현 완료  
- [ ] `utils/performanceUtils.ts` 구현 완료
- [ ] 성능 최적화 적용 완료
- [ ] 전체 통합 테스트 통과

---

## 📝 실행 후 문서화

### **업데이트할 문서들**
1. `phase2-1.5-completion.md` - 실행 결과 보고서
2. `README.md` - 전체 진행 상황 업데이트  
3. `goals.md` - Phase 1-2 달성도 최종 평가

### **생성할 문서들**
1. `phase2-1.5-results.md` - 상세 결과 분석
2. `type-system-v2.md` - 타입 시스템 v2 문서
3. `service-layer-v2.md` - 서비스 레이어 v2 문서

---

## 🚀 실행 시작

**다음 단계**: Phase 2.1.5 Step 1 (타입 중앙화) 실행  
**예상 소요 시간**: 1-2시간  
**리스크 레벨**: 낮음 🟢

Phase 2.1.5를 통해 Phase 1-2의 완벽한 통합을 달성하겠습니다!