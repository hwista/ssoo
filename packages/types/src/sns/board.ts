export interface Board {
  id: string;
  boardCode: string;
  boardName: string;
  boardType: string;
  description: string | null;
  sortOrder: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardCategory {
  id: string;
  boardId: string;
  categoryName: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CreateBoardDto {
  boardCode: string;
  boardName: string;
  boardType: string;
  description?: string;
  sortOrder?: number;
}

export interface UpdateBoardDto {
  boardName?: string;
  boardType?: string;
  description?: string;
  sortOrder?: number;
  isDefault?: boolean;
}
