/**
 * 고객 엔티티
 */
export interface Customer {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 고객 생성 DTO
 */
export interface CreateCustomerDto {
  name: string;
  description?: string;
}

/**
 * 고객 수정 DTO
 */
export interface UpdateCustomerDto {
  name?: string;
  description?: string;
  isActive?: boolean;
}
