export class ProjectDto {
  id!: string;
  projectCode!: string;
  projectName!: string;
  statusCode!: string | null;
  stageCode!: string | null;
  createdAt!: Date;
  updatedAt!: Date | null;
}

export class ProjectListDto {
  data!: ProjectDto[];
  meta!: { page: number; limit: number; total: number };
}
