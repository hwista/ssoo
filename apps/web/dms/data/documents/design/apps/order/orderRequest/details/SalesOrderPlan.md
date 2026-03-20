# 기능 개발 설계서 - 주문 프로세스 검증 강화 (판매계획 검증 부분)

## 1. 판매계획 검증 설계

### 1.1 데이터베이스 설계 상세

#### 1.1.1 신규 테이블 설계

| 테이블명 | 용도 | 주요 컬럼 | 관계 | 비고 |
|---------|------|----------|------|------|
| SALES_PLAN_INTERFACE | 판매계획 인터페이스 데이터 수신 | interface_id, partner_id, item_code, grade_code, sales_plan_quantity, plan_year_month, interface_date | PURCHASE_PLAN | 외부시스템에서 판매계획 데이터 수신 |
| PURCHASE_PLAN | 고객 구매계획 관리 | plan_id, partner_id, item_code, grade_code, purchase_plan_quantity, sales_plan_id, sales_plan_quantity, plan_year_month | SALES_PLAN_INTERFACE, orders | 구매계획 + 판매계획 통합 관리 |

#### 1.1.2 테이블 상세 설계

**SALES_PLAN_INTERFACE (판매계획 인터페이스 테이블)**
```sql
CREATE TABLE SALES_PLAN_INTERFACE (
    interface_id VARCHAR(50) PRIMARY KEY COMMENT '인터페이스 고유 ID',
    partner_id VARCHAR(20) NOT NULL COMMENT '고객사 ID',
    item_code VARCHAR(20) NOT NULL COMMENT '자재 코드',
    grade_code VARCHAR(10) COMMENT '등급 코드 (소재 부서용)',
    sales_plan_quantity DECIMAL(15,3) NOT NULL COMMENT '판매계획량',
    plan_year_month VARCHAR(6) NOT NULL COMMENT '계획 년월 (YYYYMM)',
    interface_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '인터페이스 수신 일시',
    process_status CHAR(1) DEFAULT 'N' COMMENT '처리 상태 (Y: 처리완료, N: 미처리, E: 오류)',
    error_message VARCHAR(500) COMMENT '오류 메시지',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_sales_plan_interface_partner (partner_id, item_code, grade_code, plan_year_month),
    INDEX idx_sales_plan_interface_status (process_status, interface_date),
    INDEX idx_sales_plan_interface_yearmonth (plan_year_month)
) COMMENT = '판매계획 인터페이스 데이터';
```

**PURCHASE_PLAN (구매계획 테이블)**
```sql
CREATE TABLE PURCHASE_PLAN (
    plan_id VARCHAR(50) PRIMARY KEY COMMENT '구매계획 고유 ID',
    partner_id VARCHAR(20) NOT NULL COMMENT '고객사 ID',
    item_code VARCHAR(20) NOT NULL COMMENT '자재 코드',
    grade_code VARCHAR(10) COMMENT '등급 코드 (소재 부서용)',
    purchase_plan_quantity DECIMAL(15,3) DEFAULT 0 COMMENT '고객 구매계획량',
    sales_plan_id VARCHAR(50) COMMENT '연계된 판매계획 인터페이스 ID',
    sales_plan_quantity DECIMAL(15,3) DEFAULT 0 COMMENT '판매계획량',
    plan_year_month VARCHAR(6) NOT NULL COMMENT '계획 년월 (YYYYMM)',
    plan_status CHAR(1) DEFAULT 'A' COMMENT '계획 상태 (A: 활성, I: 비활성)',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    
    UNIQUE KEY uk_purchase_plan (partner_id, item_code, grade_code, plan_year_month),
    INDEX idx_purchase_plan_partner (partner_id),
    INDEX idx_purchase_plan_item (item_code, grade_code),
    INDEX idx_purchase_plan_yearmonth (plan_year_month),
    INDEX idx_purchase_plan_sales (sales_plan_id),
    
    FOREIGN KEY (sales_plan_id) REFERENCES SALES_PLAN_INTERFACE(interface_id)
) COMMENT = '고객 구매계획 및 판매계획 통합 관리';
```

### 1.2 데이터 매핑 트리거 설계

#### 1.2.1 판매계획 → 구매계획 매핑 트리거

```sql
DELIMITER $$

CREATE TRIGGER trg_sales_plan_to_purchase_plan
AFTER INSERT ON SALES_PLAN_INTERFACE
FOR EACH ROW
BEGIN
    DECLARE existing_plan_id VARCHAR(50);
    DECLARE new_plan_id VARCHAR(50);
    
    -- 기존 구매계획 존재 여부 확인
    SELECT plan_id INTO existing_plan_id
    FROM PURCHASE_PLAN 
    WHERE partner_id = NEW.partner_id 
      AND item_code = NEW.item_code 
      AND IFNULL(grade_code, '') = IFNULL(NEW.grade_code, '')
      AND plan_year_month = NEW.plan_year_month
      AND plan_status = 'A'
    LIMIT 1;
    
    IF existing_plan_id IS NOT NULL THEN
        -- 기존 구매계획이 있는 경우: 판매계획 정보 업데이트
        UPDATE PURCHASE_PLAN 
        SET sales_plan_id = NEW.interface_id,
            sales_plan_quantity = NEW.sales_plan_quantity,
            updated_date = CURRENT_TIMESTAMP,
            updated_by = 'SYSTEM_TRIGGER'
        WHERE plan_id = existing_plan_id;
        
    ELSE
        -- 기존 구매계획이 없는 경우: 신규 구매계획 생성
        SET new_plan_id = CONCAT('PP_', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '_', SUBSTRING(UUID(), 1, 8));
        
        INSERT INTO PURCHASE_PLAN (
            plan_id,
            partner_id,
            item_code,
            grade_code,
            purchase_plan_quantity,
            sales_plan_id,
            sales_plan_quantity,
            plan_year_month,
            plan_status,
            created_by,
            updated_by
        ) VALUES (
            new_plan_id,
            NEW.partner_id,
            NEW.item_code,
            NEW.grade_code,
            0, -- 구매계획량은 0으로 초기화
            NEW.interface_id,
            NEW.sales_plan_quantity,
            NEW.plan_year_month,
            'A',
            'SYSTEM_TRIGGER',
            'SYSTEM_TRIGGER'
        );
    END IF;
    
    -- 인터페이스 처리 상태 업데이트
    UPDATE SALES_PLAN_INTERFACE 
    SET process_status = 'Y',
        updated_date = CURRENT_TIMESTAMP
    WHERE interface_id = NEW.interface_id;
    
END$$

DELIMITER ;
```

#### 1.2.2 판매계획 업데이트 트리거

```sql
DELIMITER $$

CREATE TRIGGER trg_sales_plan_update_to_purchase_plan
AFTER UPDATE ON SALES_PLAN_INTERFACE
FOR EACH ROW
BEGIN
    -- 수량이 변경된 경우에만 처리
    IF OLD.sales_plan_quantity != NEW.sales_plan_quantity THEN
        
        UPDATE PURCHASE_PLAN 
        SET sales_plan_quantity = NEW.sales_plan_quantity,
            updated_date = CURRENT_TIMESTAMP,
            updated_by = 'SYSTEM_TRIGGER'
        WHERE sales_plan_id = NEW.interface_id;
        
        -- 인터페이스 처리 상태 업데이트
        UPDATE SALES_PLAN_INTERFACE 
        SET process_status = 'Y',
            updated_date = CURRENT_TIMESTAMP
        WHERE interface_id = NEW.interface_id;
        
    END IF;
END$$

DELIMITER ;
```

### 1.3 데이터 검증 및 오류 처리

#### 1.3.1 데이터 무결성 검증 프로시저

```sql
DELIMITER $$

CREATE PROCEDURE sp_validate_sales_plan_interface()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_interface_id VARCHAR(50);
    DECLARE v_error_message VARCHAR(500);
    
    DECLARE cur_invalid_data CURSOR FOR
        SELECT interface_id,
               CASE 
                   WHEN partner_id IS NULL OR partner_id = '' THEN '고객사 ID가 누락되었습니다.'
                   WHEN item_code IS NULL OR item_code = '' THEN '자재 코드가 누락되었습니다.'
                   WHEN sales_plan_quantity IS NULL OR sales_plan_quantity < 0 THEN '판매계획량이 유효하지 않습니다.'
                   WHEN plan_year_month IS NULL OR plan_year_month = '' OR LENGTH(plan_year_month) != 6 THEN '계획 년월 형식이 유효하지 않습니다.'
                   ELSE '알 수 없는 오류'
               END as error_msg
        FROM SALES_PLAN_INTERFACE 
        WHERE process_status = 'N'
          AND (partner_id IS NULL OR partner_id = '' 
               OR item_code IS NULL OR item_code = ''
               OR sales_plan_quantity IS NULL OR sales_plan_quantity < 0
               OR plan_year_month IS NULL OR plan_year_month = '' OR LENGTH(plan_year_month) != 6);
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur_invalid_data;
    
    read_loop: LOOP
        FETCH cur_invalid_data INTO v_interface_id, v_error_message;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- 오류 데이터 상태 업데이트
        UPDATE SALES_PLAN_INTERFACE 
        SET process_status = 'E',
            error_message = v_error_message,
            updated_date = CURRENT_TIMESTAMP
        WHERE interface_id = v_interface_id;
        
    END LOOP;
    
    CLOSE cur_invalid_data;
END$$

DELIMITER ;
```

### 1.4 비즈니스 로직 흐름

```
1. 외부 시스템 → SALES_PLAN_INTERFACE 테이블에 판매계획 데이터 INSERT
   ↓
2. INSERT 트리거 실행 → 데이터 검증
   ↓
3. 해당 고객사/자재/등급/년월의 기존 구매계획 존재 여부 확인
   ↓
4-A. 기존 구매계획 있음 → PURCHASE_PLAN 테이블의 판매계획 정보 UPDATE
4-B. 기존 구매계획 없음 → PURCHASE_PLAN 테이블에 신규 ROW 생성 (구매계획량=0)
   ↓
5. SALES_PLAN_INTERFACE.process_status = 'Y' 업데이트
   ↓
6. 주문 검증 시 PURCHASE_PLAN 테이블의 sales_plan_quantity 참조
```

### 1.5 인덱스 및 성능 최적화

| 테이블명 | 인덱스명 | 대상 컬럼 | 유형 | 목적 |
|---------|----------|----------|------|------|
| SALES_PLAN_INTERFACE | idx_sales_plan_interface_partner | (partner_id, item_code, grade_code, plan_year_month) | NORMAL | 중복 데이터 체크 최적화 |
| SALES_PLAN_INTERFACE | idx_sales_plan_interface_status | (process_status, interface_date) | NORMAL | 미처리 데이터 조회 최적화 |
| PURCHASE_PLAN | uk_purchase_plan | (partner_id, item_code, grade_code, plan_year_month) | UNIQUE | 중복 방지 및 조회 최적화 |
| PURCHASE_PLAN | idx_purchase_plan_sales | (sales_plan_id) | NORMAL | 판매계획 연계 조회 최적화 |

### 1.6 데이터 예시

**SALES_PLAN_INTERFACE 데이터 예시:**
```
interface_id: SPI_20241227140001_ABC12345
partner_id: CUST001
item_code: CU001
grade_code: A
sales_plan_quantity: 1000.000
plan_year_month: 202501
interface_date: 2024-12-27 14:00:01
process_status: Y
```

**PURCHASE_PLAN 데이터 예시:**
```
plan_id: PP_20241227140002_DEF67890
partner_id: CUST001
item_code: CU001
grade_code: A
purchase_plan_quantity: 800.000 (고객이 등록한 구매계획)
sales_plan_id: SPI_20241227140001_ABC12345
sales_plan_quantity: 1000.000 (판매계획에서 매핑된 값)
plan_year_month: 202501
plan_status: A
```

이 설계를 통해 외부 시스템의 판매계획 데이터가 자동으로 고객의 구매계획과 매핑되어 관리되며, 주문 시 판매계획량 대비 주문량 검증이 가능해집니다.