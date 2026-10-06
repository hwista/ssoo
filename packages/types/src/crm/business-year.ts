export interface CrmBusinessYear {
  id: string;
  year: number;
  displayName: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CrmBusinessYearCreateInput {
  year: number;
}

export interface CrmBusinessYearUpdateInput {
  isActive: boolean;
}
