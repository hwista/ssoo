# 기능 개발 설계서 - 주문 프로세스 검증 강화 (일일 주문제한량 검증 부분)

## 2. 일일 주문제한량 검증 설계

### 2.1 데이터베이스 설계 상세

#### 2.1.1 신규 테이블 설계

| 테이블명 | 용도 | 주요 컬럼 | 관계 | 비고 |
|---------|------|----------|------|------|
| DAILY_ORDER_LIMIT_INTERFACE | 일일주문제한량 인터페이스 데이터 수신 | interface_id, item_code, grade_code, daily_limit_quantity, limit_date, interface_date | DAILY_ORDER_LIMIT | 외부시스템에서 일일제한량 데이터 수신 |
| DAILY_ORDER_LIMIT | 일일주문제한량 관리 | limit_id, item_code, grade_code, daily_limit_quantity, limit_date, interface_id | DAILY_ORDER_LIMIT_INTERFACE, orders | 일일 주문제한량 관리 |

#### 2.1.2 테이블 상세 설계

**DAILY_ORDER_LIMIT_INTERFACE (일일주문제한량 인터페이스 테이블)**
```sql
CREATE TABLE DAILY_ORDER_LIMIT_INTERFACE (
    interface_id VARCHAR(50) PRIMARY KEY COMMENT '인터페이스 고유 ID',
    item_code VARCHAR(20) NOT NULL COMMENT '자재 코드',
    grade_code VARCHAR(10) COMMENT '등급 코드 (소재 부서용)',
    daily_limit_quantity DECIMAL(15,3) NOT NULL COMMENT '일일 주문제한량',
    limit_date DATE NOT NULL COMMENT '제한 적용 일자',
    interface_date DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '인터페이스 수신 일시',
    process_status CHAR(1) DEFAULT 'N' COMMENT '처리 상태 (Y: 처리완료, N: 미처리, E: 오류)',
    error_message VARCHAR(500) COMMENT '오류 메시지',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_daily_limit_interface_item (item_code, grade_code, limit_date),
    INDEX idx_daily_limit_interface_status (process_status, interface_date),
    INDEX idx_daily_limit_interface_date (limit_date)
) COMMENT = '일일주문제한량 인터페이스 데이터';
```

**DAILY_ORDER_LIMIT (일일주문제한량 테이블)**
```sql
CREATE TABLE DAILY_ORDER_LIMIT (
    limit_id VARCHAR(50) PRIMARY KEY COMMENT '일일제한량 고유 ID',
    item_code VARCHAR(20) NOT NULL COMMENT '자재 코드',
    grade_code VARCHAR(10) COMMENT '등급 코드 (소재 부서용)',
    daily_limit_quantity DECIMAL(15,3) NOT NULL COMMENT '일일 주문제한량',
    limit_date DATE NOT NULL COMMENT '제한 적용 일자',
    interface_id VARCHAR(50) COMMENT '연계된 인터페이스 ID',
    limit_status CHAR(1) DEFAULT 'A' COMMENT '제한 상태 (A: 활성, I: 비활성)',
    created_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    
    UNIQUE KEY uk_daily_order_limit (item_code, grade_code, limit_date),
    INDEX idx_daily_order_limit_item (item_code, grade_code),
    INDEX idx_daily_order_limit_date (limit_date),
    INDEX idx_daily_order_limit_interface (interface_id),
    INDEX idx_daily_order_limit_status (limit_status),
    
    FOREIGN KEY (interface_id) REFERENCES DAILY_ORDER_LIMIT_INTERFACE(interface_id)
) COMMENT = '일일 주문제한량 관리';
```

### 2.2 데이터 매핑 트리거 설계

#### 2.2.1 일일제한량 인터페이스 → 메인 테이블 매핑 트리거

```sql
DELIMITER $$

CREATE TRIGGER trg_daily_limit_interface_to_main
AFTER INSERT ON DAILY_ORDER_LIMIT_INTERFACE
FOR EACH ROW
BEGIN
    DECLARE existing_limit_id VARCHAR(50);
    DECLARE new_limit_id VARCHAR(50);
    
    -- 기존 일일제한량 존재 여부 확인
    SELECT limit_id INTO existing_limit_id
    FROM DAILY_ORDER_LIMIT 
    WHERE item_code = NEW.item_code 
      AND IFNULL(grade_code, '') = IFNULL(NEW.grade_code, '')
      AND limit_date = NEW.limit_date
      AND limit_status = 'A'
    LIMIT 1;
    
    IF existing_limit_id IS NOT NULL THEN
        -- 기존 일일제한량이 있는 경우: 제한량 정보 업데이트
        UPDATE DAILY_ORDER_LIMIT 
        SET daily_limit_quantity = NEW.daily_limit_quantity,
            interface_id = NEW.interface_id,
            updated_date = CURRENT_TIMESTAMP,
            updated_by = 'SYSTEM_TRIGGER'
        WHERE limit_id = existing_limit_id;
        
    ELSE
        -- 기존 일일제한량이 없는 경우: 신규 일일제한량 생성
        SET new_limit_id = CONCAT('DL_', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '_', SUBSTRING(UUID(), 1, 8));
        
        INSERT INTO DAILY_ORDER_LIMIT (
            limit_id,
            item_code,
            grade_code,
            daily_limit_quantity,
            limit_date,
            interface_id,
            limit_status,
            created_by,
            updated_by
        ) VALUES (
            new_limit_id,
            NEW.item_code,
            NEW.grade_code,
            NEW.daily_limit_quantity,
            NEW.limit_date,
            NEW.interface_id,
            'A',
            'SYSTEM_TRIGGER',
            'SYSTEM_TRIGGER'
        );
    END IF;
    
    -- 인터페이스 처리 상태 업데이트
    UPDATE DAILY_ORDER_LIMIT_INTERFACE 
    SET process_status = 'Y',
        updated_date = CURRENT_TIMESTAMP
    WHERE interface_id = NEW.interface_id;
    
END$$

DELIMITER ;
```

#### 2.2.2 일일제한량 인터페이스 업데이트 트리거

```sql
DELIMITER $$

CREATE TRIGGER trg_daily_limit_interface_update_to_main
AFTER UPDATE ON DAILY_ORDER_LIMIT_INTERFACE
FOR EACH ROW
BEGIN
    -- 제한량이 변경된 경우에만 처리
    IF OLD.daily_limit_quantity != NEW.daily_limit_quantity OR OLD.limit_date != NEW.limit_date THEN
        
        UPDATE DAILY_ORDER_LIMIT 
        SET daily_limit_quantity = NEW.daily_limit_quantity,
            limit_date = NEW.limit_date,
            updated_date = CURRENT_TIMESTAMP,
            updated_by = 'SYSTEM_TRIGGER'
        WHERE interface_id = NEW.interface_id;
        
        -- 인터페이스 처리 상태 업데이트
        UPDATE DAILY_ORDER_LIMIT_INTERFACE 
        SET process_status = 'Y',
            updated_date = CURRENT_TIMESTAMP
        WHERE interface_id = NEW.interface_id;
        
    END IF;
END$$

DELIMITER ;
```

### 2.3 데이터 검증 및 오류 처리

#### 2.3.1 데이터 무결성 검증 프로시저

```sql
DELIMITER $$

CREATE PROCEDURE sp_validate_daily_limit_interface()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_interface_id VARCHAR(50);
    DECLARE v_error_message VARCHAR(500);
    
    DECLARE cur_invalid_data CURSOR FOR
        SELECT interface_id,
               CASE 
                   WHEN item_code IS NULL OR item_code = '' THEN '자재 코드가 누락되었습니다.'
                   WHEN daily_limit_quantity IS NULL OR daily_limit_quantity < 0 THEN '일일제한량이 유효하지 않습니다.'
                   WHEN limit_date IS NULL THEN '제한 적용 일자가 누락되었습니다.'
                   WHEN limit_date < CURDATE() THEN '제한 적용 일자가 과거 날짜입니다.'
                   ELSE '알 수 없는 오류'
               END as error_msg
        FROM DAILY_ORDER_LIMIT_INTERFACE 
        WHERE process_status = 'N'
          AND (item_code IS NULL OR item_code = '' 
               OR daily_limit_quantity IS NULL OR daily_limit_quantity < 0
               OR limit_date IS NULL
               OR limit_date < CURDATE());
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur_invalid_data;
    
    read_loop: LOOP
        FETCH cur_invalid_data INTO v_interface_id, v_error_message;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        -- 오류 데이터 상태 업데이트
        UPDATE DAILY_ORDER_LIMIT_INTERFACE 
        SET process_status = 'E',
            error_message = v_error_message,
            updated_date = CURRENT_TIMESTAMP
        WHERE interface_id = v_interface_id;
        
    END LOOP;
    
    CLOSE cur_invalid_data;
END$$

DELIMITER ;
```

#### 2.3.2 만료된 제한량 비활성화 프로시저

```sql
DELIMITER $$

CREATE PROCEDURE sp_deactivate_expired_daily_limits()
BEGIN
    -- 과거 날짜의 일일제한량을 비활성화
    UPDATE DAILY_ORDER_LIMIT 
    SET limit_status = 'I',
        updated_date = CURRENT_TIMESTAMP,
        updated_by = 'SYSTEM_BATCH'
    WHERE limit_date < CURDATE() 
      AND limit_status = 'A';
      
    -- 처리된 건수 로그
    SELECT ROW_COUNT() as deactivated_count;
    
END$$

DELIMITER ;
```

### 2.4 비즈니스 로직 흐름

```
1. 외부 시스템 → DAILY_ORDER_LIMIT_INTERFACE 테이블에 일일제한량 데이터 INSERT
   ↓
2. INSERT 트리거 실행 → 데이터 검증
   ↓
3. 해당 자재/등급/일자의 기존 일일제한량 존재 여부 확인
   ↓
4-A. 기존 제한량 있음 → DAILY_ORDER_LIMIT 테이블의 제한량 정보 UPDATE
4-B. 기존 제한량 없음 → DAILY_ORDER_LIMIT 테이블에 신규 ROW 생성
   ↓
5. DAILY_ORDER_LIMIT_INTERFACE.process_status = 'Y' 업데이트
   ↓
6. 주문 검증 시 DAILY_ORDER_LIMIT 테이블의 daily_limit_quantity 참조
   ↓
7. 배치 작업으로 과거 날짜 제한량 비활성화 (매일 실행)
```

### 2.5 인덱스 및 성능 최적화

| 테이블명 | 인덱스명 | 대상 컬럼 | 유형 | 목적 |
|---------|----------|----------|------|------|
| DAILY_ORDER_LIMIT_INTERFACE | idx_daily_limit_interface_item | (item_code, grade_code, limit_date) | NORMAL | 중복 데이터 체크 최적화 |
| DAILY_ORDER_LIMIT_INTERFACE | idx_daily_limit_interface_status | (process_status, interface_date) | NORMAL | 미처리 데이터 조회 최적화 |
| DAILY_ORDER_LIMIT | uk_daily_order_limit | (item_code, grade_code, limit_date) | UNIQUE | 중복 방지 및 조회 최적화 |
| DAILY_ORDER_LIMIT | idx_daily_order_limit_date | (limit_date) | NORMAL | 일자별 조회 최적화 |
| DAILY_ORDER_LIMIT | idx_daily_order_limit_status | (limit_status) | NORMAL | 활성 제한량 조회 최적화 |

### 2.6 배치 작업 설정

#### 2.6.1 일일 정리 배치 (매일 새벽 2시 실행)

```sql
-- 크론탭 설정 예시: 0 2 * * * 
CREATE EVENT evt_daily_limit_cleanup
ON SCHEDULE EVERY 1 DAY STARTS '2024-01-01 02:00:00'
DO
BEGIN
    -- 만료된 제한량 비활성화
    CALL sp_deactivate_expired_daily_limits();
    
    -- 7일 이전 인터페이스 데이터 삭제 (성능 최적화)
    DELETE FROM DAILY_ORDER_LIMIT_INTERFACE 
    WHERE interface_date < DATE_SUB(NOW(), INTERVAL 7 DAY)
      AND process_status = 'Y';
      
END;
```

### 2.7 데이터 예시

**DAILY_ORDER_LIMIT_INTERFACE 데이터 예시:**
```
interface_id: DLI_20241227150001_ABC12345
item_code: CU001
grade_code: A
daily_limit_quantity: 500.000
limit_date: 2024-12-28
interface_date: 2024-12-27 15:00:01
process_status: Y
```

**DAILY_ORDER_LIMIT 데이터 예시:**
```
limit_id: DL_20241227150002_DEF67890
item_code: CU001
grade_code: A
daily_limit_quantity: 500.000
limit_date: 2024-12-28
interface_id: DLI_20241227150001_ABC12345
limit_status: A
```

### 2.8 주문 검증 시 사용 방법

```sql
-- 주문 검증 시 일일제한량 조회 쿼리 예시
SELECT daily_limit_quantity
FROM DAILY_ORDER_LIMIT
WHERE item_code = ?
  AND grade_code = ?
  AND limit_date = ?
  AND limit_status = 'A';

-- 해당 일자의 기주문량 조회 (주문 검증용)
SELECT COALESCE(SUM(order_quantity), 0) as total_ordered
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
WHERE oi.item_code = ?
  AND oi.grade_code = ?
  AND DATE(o.order_date) = ?
  AND o.order_status != 'CANCELLED';
```

이 설계를 통해 외부 시스템의 일일주문제한량 데이터가 자동으로 관리되며, 주문 시 일일제한량 대비 주문량 검증이 가능해집니다. 또한 과거 데이터의 자동 정리를 통해 성능을 최적화할 수 있습니다.